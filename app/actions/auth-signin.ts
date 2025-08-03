"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { headers } from "next/headers"
import { verifyIpLocation } from "@/lib/services/geolocation-verification"

interface SigninData {
  username?: string
  email?: string
  password: string
}

interface SigninResult {
  success?: boolean
  error?: string
  redirectTo?: string
  requiresVerification?: boolean
}

export async function signinUser(data: SigninData): Promise<SigninResult> {
  const supabase = createServerSupabaseClient()
  
  try {
    // Get IP address from headers
    const headersList = headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const realIP = headersList.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIP || null
    const userAgent = headersList.get('user-agent') || null
    
    let emailToUse = data.email
    
    // If username is provided instead of email, look up the email
    if (data.username && !data.email) {
      const { data: profile, error: profileLookupError } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", data.username.toUpperCase())
        .single()
      
      if (profileLookupError || !profile) {
        console.error("Username lookup error:", profileLookupError)
        return { error: "Invalid username or password" }
      }
      
      emailToUse = profile.email
    }
    
    if (!emailToUse) {
      return { error: "Email or username is required" }
    }
    
    // Attempt to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: data.password,
    })
    
    if (authError) {
      console.error("Auth signin error:", authError)
      
      // Log failed attempt if we can identify the user
      if (ipAddress) {
        try {
          // Try to get user by email to log the attempt
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, country_id, countries(code)")
            .eq("email", emailToUse)
            .single()
          
          if (profile) {
            await supabase.from("blocked_access_attempts").insert({
              user_id: profile.id,
              email: emailToUse,
              ip_address: ipAddress,
              registered_country_code: (profile.countries as any)?.code,
              attempt_type: 'login',
              block_reason: authError.message,
              risk_score: 50,
              risk_flags: ['invalid_credentials'],
              user_agent: userAgent
            })
          }
        } catch (logError) {
          console.error("Failed to log failed login attempt:", logError)
        }
      }
      
      return { error: authError.message }
    }
    
    if (!authData.user) {
      return { error: "Failed to sign in" }
    }
    
    // Get user profile with country information
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, country_id, countries(code, name)")
      .eq("auth_user_id", authData.user.id)
      .single()
    
    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError)
      return { error: "User profile not found" }
    }
    
    const registeredCountryCode = (profile.countries as any)?.code
    
    if (!registeredCountryCode) {
      console.error("User has no registered country")
      return { error: "User country not found" }
    }
    
    // Verify location
    const locationVerification = await verifyIpLocation(ipAddress, registeredCountryCode)
    
    console.log('Login location verification:', {
      email: emailToUse,
      registeredCountry: registeredCountryCode,
      detectedCountry: locationVerification.detectedCountry,
      verified: locationVerification.verified,
      riskScore: locationVerification.riskScore,
      flags: locationVerification.flags
    })
    
    // Log the verification attempt
    try {
      await supabase.rpc('log_location_verification', {
        p_user_id: profile.id,
        p_event_type: 'login',
        p_ip_address: ipAddress,
        p_detected_country: locationVerification.detectedCountry || null,
        p_registered_country: registeredCountryCode,
        p_method: 'ip',
        p_result: locationVerification.verified,
        p_risk_score: locationVerification.riskScore,
        p_risk_flags: locationVerification.flags,
        p_user_agent: userAgent
      })
    } catch (logError) {
      console.error('Failed to log location verification:', logError)
    }
    
    // Handle verification results based on risk score
    if (locationVerification.riskScore >= 90) {
      // High risk - block login
      await supabase.auth.signOut() // Sign them out immediately
      
      // Log blocked attempt
      await supabase.from("blocked_access_attempts").insert({
        user_id: profile.id,
        email: emailToUse,
        ip_address: ipAddress,
        detected_country_code: locationVerification.detectedCountry,
        registered_country_code: registeredCountryCode,
        attempt_type: 'login',
        block_reason: locationVerification.message || 'High risk location',
        risk_score: locationVerification.riskScore,
        risk_flags: locationVerification.flags,
        user_agent: userAgent
      })
      
      return { 
        error: "Access denied: Unable to verify your location. Please disable VPN/proxy and try again from your registered country." 
      }
    }
    
    if (locationVerification.riskScore >= 60) {
      // Medium-high risk - require additional verification (Phase 2)
      console.warn('Medium-high risk login:', {
        email: emailToUse,
        riskScore: locationVerification.riskScore,
        flags: locationVerification.flags
      })
      
      // For now, allow but monitor closely
      // In Phase 2, we'll require browser geolocation or 2FA
    }
    
    // Create or update session location tracking
    try {
      const sessionId = authData.session?.access_token?.substring(0, 20) || 'unknown'
      
      await supabase.from("user_session_locations").upsert({
        user_id: profile.id,
        session_id: sessionId,
        ip_address: ipAddress,
        country_code: locationVerification.detectedCountry || registeredCountryCode,
        is_vpn: locationVerification.flags.includes('vpn_detected'),
        risk_score: locationVerification.riskScore,
        last_activity: new Date().toISOString()
      }, {
        onConflict: 'user_id,session_id'
      })
    } catch (sessionError) {
      console.error('Failed to track session location:', sessionError)
    }
    
    // Determine redirect based on role
    let redirectTo = '/dashboard'
    switch (profile.role) {
      case 'borrower':
        redirectTo = '/borrower/dashboard'
        break
      case 'lender':
        redirectTo = '/lender/dashboard'
        break
      case 'admin':
        redirectTo = '/admin/dashboard'
        break
    }
    
    return { 
      success: true, 
      redirectTo,
      requiresVerification: locationVerification.riskScore >= 60
    }
  } catch (error) {
    console.error("Unexpected signin error:", error)
    return { error: "An unexpected error occurred during sign in" }
  }
}