// Session location verification middleware
// Checks user location during active sessions

import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyIpLocation } from "@/lib/services/geolocation-verification"

export interface SessionCheckResult {
  allowed: boolean
  reason?: string
  riskScore?: number
  requiresAction?: 'none' | 'monitor' | 'verify' | 'block'
}

/**
 * Check if current session location is valid
 */
export async function checkSessionLocation(
  request: NextRequest
): Promise<SessionCheckResult> {
  const supabase = createServerSupabaseClient()
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {
        allowed: false,
        reason: "No active session"
      }
    }
    
    // Get user's profile with country
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, country_id, countries(code)")
      .eq("auth_user_id", user.id)
      .single()
    
    if (!profile || !profile.countries?.code) {
      return {
        allowed: false,
        reason: "User profile or country not found"
      }
    }
    
    // Get IP from request
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIP || null
    
    // Verify location
    const locationVerification = await verifyIpLocation(ipAddress, profile.countries.code)
    
    // Get session ID from auth token
    const authHeader = request.headers.get('authorization')
    const sessionId = authHeader?.substring(7, 27) || 'unknown' // First 20 chars of token
    
    // Update session location
    try {
      await supabase.from("user_session_locations").upsert({
        user_id: profile.id,
        session_id: sessionId,
        ip_address: ipAddress,
        country_code: locationVerification.detectedCountry || profile.countries.code,
        is_vpn: locationVerification.flags.includes('vpn_detected'),
        risk_score: locationVerification.riskScore,
        last_activity: new Date().toISOString()
      }, {
        onConflict: 'user_id,session_id'
      })
    } catch (error) {
      console.error('Failed to update session location:', error)
    }
    
    // Determine action based on risk score
    let requiresAction: SessionCheckResult['requiresAction'] = 'none'
    let allowed = true
    let reason = undefined
    
    if (locationVerification.riskScore >= 90) {
      // Very high risk - block immediately
      allowed = false
      requiresAction = 'block'
      reason = 'Location verification failed. Access denied from this location.'
      
      // Log blocked attempt
      await supabase.from("blocked_access_attempts").insert({
        user_id: profile.id,
        ip_address: ipAddress,
        detected_country_code: locationVerification.detectedCountry,
        registered_country_code: profile.countries.code,
        attempt_type: 'session_check',
        block_reason: reason,
        risk_score: locationVerification.riskScore,
        risk_flags: locationVerification.flags,
        user_agent: request.headers.get('user-agent') || null
      })
      
      // Sign out the user
      await supabase.auth.signOut()
    } else if (locationVerification.riskScore >= 70) {
      // High risk - require verification
      requiresAction = 'verify'
      reason = 'Additional verification required due to unusual location.'
    } else if (locationVerification.riskScore >= 50) {
      // Medium risk - monitor closely
      requiresAction = 'monitor'
      
      // Log for monitoring
      console.warn('Medium risk session:', {
        userId: profile.id,
        riskScore: locationVerification.riskScore,
        flags: locationVerification.flags
      })
    }
    
    // Log the verification
    if (locationVerification.riskScore > 30) {
      try {
        await supabase.rpc('log_location_verification', {
          p_user_id: profile.id,
          p_event_type: 'session_check',
          p_ip_address: ipAddress,
          p_detected_country: locationVerification.detectedCountry || null,
          p_registered_country: profile.countries.code,
          p_method: 'ip',
          p_result: locationVerification.verified,
          p_risk_score: locationVerification.riskScore,
          p_risk_flags: locationVerification.flags,
          p_user_agent: request.headers.get('user-agent') || null
        })
      } catch (logError) {
        console.error('Failed to log session verification:', logError)
      }
    }
    
    return {
      allowed,
      reason,
      riskScore: locationVerification.riskScore,
      requiresAction
    }
  } catch (error) {
    console.error('Session location check error:', error)
    return {
      allowed: true, // Allow on error to not break the app
      reason: 'Location check error',
      requiresAction: 'monitor'
    }
  }
}

/**
 * Middleware function to enforce location checks on protected routes
 */
export async function enforceSessionLocation(
  request: NextRequest
): Promise<NextResponse | null> {
  // Skip location check for auth endpoints
  const pathname = request.nextUrl.pathname
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/login' ||
    pathname === '/signup'
  ) {
    return null
  }
  
  const checkResult = await checkSessionLocation(request)
  
  if (!checkResult.allowed) {
    // Return error response
    return NextResponse.json(
      { 
        error: checkResult.reason || 'Access denied',
        code: 'LOCATION_VERIFICATION_FAILED',
        requiresAction: checkResult.requiresAction
      },
      { status: 403 }
    )
  }
  
  // Add headers to indicate verification status
  const response = NextResponse.next()
  if (checkResult.riskScore) {
    response.headers.set('X-Location-Risk-Score', checkResult.riskScore.toString())
  }
  if (checkResult.requiresAction && checkResult.requiresAction !== 'none') {
    response.headers.set('X-Location-Action', checkResult.requiresAction)
  }
  
  return null // Continue with request
}