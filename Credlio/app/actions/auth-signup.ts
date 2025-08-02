"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { supabaseAdmin } from "@/lib/supabase/setup"
import { headers } from "next/headers"
import { getCountryFromIP, getIPFromRequest, isDetectedCountrySupported } from "@/lib/services/ip-geolocation"
import { detectCountryFromPhone } from "@/lib/utils/phone-country-detector"
import { verifyIpLocation } from "@/lib/services/geolocation-verification"

interface SignupData {
  email: string
  password: string
  fullName: string
  phoneNumber: string
  role: "borrower" | "lender"
  countryCode?: string  // Changed from countryId to countryCode
  detectedCountryCode?: string
  signupIpAddress?: string
}

export async function signupUser(data: SignupData) {
  const supabase = createServerSupabaseClient()

  try {
    let detectedCountryCode = data.countryCode
    let signupIpAddress: string | undefined
    
    // Get IP address from request headers
    const headersList = headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const realIP = headersList.get('x-real-ip')
    signupIpAddress = forwardedFor?.split(',')[0] || realIP || undefined
    
    // If no country code provided, try to detect from phone number
    if (!detectedCountryCode && data.phoneNumber) {
      const phoneDetection = detectCountryFromPhone(data.phoneNumber)
      if (phoneDetection.success && phoneDetection.countryCode) {
        detectedCountryCode = phoneDetection.countryCode
        console.log('Country detected from phone:', detectedCountryCode)
      }
    }
    
    // If still no country, try IP geolocation as fallback
    if (!detectedCountryCode && signupIpAddress) {
      const geoResult = await getCountryFromIP(signupIpAddress)
      if (geoResult.success && geoResult.countryCode) {
        detectedCountryCode = geoResult.countryCode
        console.log('Country detected from IP:', detectedCountryCode)
      }
    }
    
    // Check if country is supported
    if (!detectedCountryCode) {
      return { 
        error: "Could not detect your country. Please ensure your phone number includes the country code (e.g., +264 for Namibia)." 
      }
    }
    
    if (!isDetectedCountrySupported(detectedCountryCode)) {
      return {
        error: `Sorry, we don't currently support services in your country. We're expanding soon!`
      }
    }
    
    // Verify IP location matches detected country
    const locationVerification = await verifyIpLocation(signupIpAddress, detectedCountryCode)
    
    // Log the verification attempt
    console.log('Signup location verification:', {
      detectedCountry: detectedCountryCode,
      ipCountry: locationVerification.detectedCountry,
      verified: locationVerification.verified,
      riskScore: locationVerification.riskScore,
      flags: locationVerification.flags
    })
    
    // Block high-risk signups
    if (locationVerification.riskScore >= 80) {
      return {
        error: "Unable to verify your location. Please disable VPN/proxy and try again."
      }
    }
    
    // Warn about location mismatch but allow signup for medium risk
    if (!locationVerification.verified && locationVerification.riskScore >= 60) {
      console.warn('Location mismatch during signup:', {
        email: data.email,
        phoneCountry: detectedCountryCode,
        ipCountry: locationVerification.detectedCountry,
        riskScore: locationVerification.riskScore
      })
    }
    
    // Fetch the country ID from database
    const { data: countryData, error: countryError } = await supabase
      .from("countries")
      .select("id, name")
      .eq("code", detectedCountryCode)
      .single()

    if (countryError || !countryData) {
      console.error("Country lookup error:", countryError)
      return { 
        error: `Your country (${detectedCountryCode}) is not yet supported in our system.` 
      }
    }

    const countryId = countryData.id

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (authError) {
      console.error("Auth signup error:", authError)
      return { error: authError.message }
    }

    if (!authData.user) {
      return { error: "Failed to create user" }
    }

    // Create profile with role directly in the profiles table
    const { data: profileData, error: profileError } = await supabase.from("profiles").insert({
      auth_user_id: authData.user.id,
      email: data.email,
      full_name: data.fullName,
      phone_number: data.phoneNumber,
      role: data.role, // Store role directly as it's defined in the schema
      country_id: countryId, // Use the fetched country ID
      detected_country_code: detectedCountryCode,
      signup_ip_address: signupIpAddress,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

    if (profileError) {
      console.error("Profile creation error details:", {
        error: profileError,
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint
      })
      
      // Build a more informative error message
      let errorMessage = "Failed to create profile: "
      
      if (profileError.code === '23505') {
        errorMessage = "An account with this email already exists."
      } else if (profileError.code === '23503') {
        errorMessage = "Invalid country selection or foreign key constraint violation."
      } else if (profileError.code === '23502') {
        errorMessage = `Missing required field: ${profileError.details || profileError.message}`
      } else if (profileError.code === '42501') {
        errorMessage = "Permission denied. Please check database policies."
      } else {
        errorMessage += profileError.message
      }
      
      // If profile creation fails, we should clean up the auth user
      // Use admin client to delete the auth user since the regular client might not have permission
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        } catch (deleteError) {
          console.error("Failed to clean up auth user after profile creation failure:", deleteError)
        }
      }
      return { error: errorMessage, details: profileError }
    }

    // If the user is a borrower, create a borrower profile
    if (data.role === "borrower" && profileData) {
      const { error: borrowerProfileError } = await supabase.from("borrower_profiles").insert({
        user_id: profileData.id,
        reputation_score: 50, // Default starting score
        total_loans_requested: 0,
        loans_repaid: 0,
        loans_defaulted: 0,
        created_at: new Date().toISOString(),
      })

      if (borrowerProfileError) {
        console.error("Borrower profile creation error:", borrowerProfileError)
        // Don't fail the signup if borrower profile creation fails
        // User can create it later
      }
    }

    // Log the location verification in database
    if (profileData) {
      try {
        await supabase.rpc('log_location_verification', {
          p_user_id: profileData.id,
          p_event_type: 'signup',
          p_ip_address: signupIpAddress,
          p_detected_country: locationVerification.detectedCountry || null,
          p_registered_country: detectedCountryCode,
          p_method: 'ip',
          p_result: locationVerification.verified,
          p_risk_score: locationVerification.riskScore,
          p_risk_flags: locationVerification.flags,
          p_user_agent: headersList.get('user-agent') || null
        })
      } catch (logError) {
        console.error('Failed to log location verification:', logError)
        // Don't fail signup if logging fails
      }
    }
    
    return { success: true, user: authData.user }
  } catch (error) {
    console.error("Unexpected signup error:", error)
    return { error: "An unexpected error occurred during signup" }
  }
}
