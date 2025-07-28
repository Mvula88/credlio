import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

// Country code mapping for IP detection
const COUNTRY_CODE_MAPPING: { [key: string]: string } = {
  NA: "NAM", // Namibia
  NG: "NGA", // Nigeria
  KE: "KEN", // Kenya
  GH: "GHA", // Ghana
  TZ: "TZA", // Tanzania
  UG: "UGA", // Uganda
  ZA: "ZAF", // South Africa
}

async function detectUserCountry(request: NextRequest, supabase: any): Promise<string> {
  try {
    // Try to get country from IP geolocation
    const forwardedFor = request.headers.get("x-forwarded-for")
    const realIP = request.headers.get("x-real-ip")
    const userIP = forwardedFor?.split(",")[0] || realIP || "127.0.0.1"

    // Use a geolocation service (you can replace with your preferred service)
    if (userIP !== "127.0.0.1") {
      try {
        const geoResponse = await fetch(`https://ipapi.co/${userIP}/json/`)
        const geoData = await geoResponse.json()

        if (geoData.country_code && COUNTRY_CODE_MAPPING[geoData.country_code]) {
          return COUNTRY_CODE_MAPPING[geoData.country_code]
        }
      } catch (error) {
        console.log("IP geolocation failed, using default")
      }
    }

    // Default to Namibia if detection fails
    return "NAM"
  } catch (error) {
    console.error("Country detection error:", error)
    return "NAM" // Default fallback
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const role = requestUrl.searchParams.get("role") || "borrower"

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })

    // Exchange the code for a session
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

    if (sessionError) {
      console.error("Session exchange error:", sessionError)
      return NextResponse.redirect(`${requestUrl.origin}/auth/signin?error=callback_error`)
    }

    if (sessionData.user) {
      try {
        // Check if profile already exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_user_id", sessionData.user.id)
          .single()

        if (!existingProfile) {
          // Detect user's country
          const detectedCountryCode = await detectUserCountry(request, supabase)

          // Get the detected country from database
          const { data: detectedCountry } = await supabase
            .from("countries")
            .select("id")
            .eq("code", detectedCountryCode)
            .single()

          let fallbackCountry: any = null

          if (!detectedCountry) {
            console.error("Detected country not found, using Namibia as fallback")
            const { data: fallbackCountryData } = await supabase
              .from("countries")
              .select("id")
              .eq("code", "NAM")
              .single()

            if (!fallbackCountryData) {
              return NextResponse.redirect(`${requestUrl.origin}/auth/signin?error=country_setup_required`)
            }

            fallbackCountry = fallbackCountryData
          }

          // Get user's IP for logging
          const userIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1"

          // Create profile for new user with detected country
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .insert({
              auth_user_id: sessionData.user.id,
              full_name: sessionData.user.user_metadata?.full_name || sessionData.user.email?.split("@")[0] || "User",
              country_id: (detectedCountry || fallbackCountry)?.id,
              trust_score: 50,
              is_blacklisted: false,
              ip_address: userIP,
              signup_ip_address: userIP,
              signup_country_code: detectedCountryCode,
              detected_country_code: detectedCountryCode,
              subscription_status: role === "lender" ? "pending" : "free",
              average_rating: 0,
              total_ratings: 0,
            })
            .select()
            .single()

          if (profileError) {
            console.error("Profile creation error:", profileError)
            return NextResponse.redirect(`${requestUrl.origin}/auth/signin?error=profile_creation_failed`)
          }

          // Add role to user
          const { data: roleData } = await supabase.from("user_roles").select("id").eq("role_name", role).single()

          if (roleData && profile) {
            await supabase.from("user_profile_roles").insert({
              profile_id: profile.id,
              role_id: roleData.id,
            })
          }

          console.log(`Created profile for user ${sessionData.user.email} in country ${detectedCountryCode}`)
        }

        // Redirect based on role
        if (role === "lender") {
          return NextResponse.redirect(`${requestUrl.origin}/lender/subscribe`)
        } else if (role === "borrower") {
          return NextResponse.redirect(`${requestUrl.origin}/borrower/dashboard`)
        } else if (role === "admin") {
          return NextResponse.redirect(`${requestUrl.origin}/admin/dashboard`)
        }

        // Default redirect
        return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
      } catch (error) {
        console.error("Callback processing error:", error)
        return NextResponse.redirect(`${requestUrl.origin}/auth/signin?error=callback_processing_failed`)
      }
    }
  }

  // If no code or user, redirect to signin
  return NextResponse.redirect(`${requestUrl.origin}/auth/signin`)
}
