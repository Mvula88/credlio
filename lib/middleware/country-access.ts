// Country access middleware
// Ensures users can only access data from their registered country

import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { NextResponse } from "next/server"

export interface CountryAccessCheck {
  allowed: boolean
  userCountryId?: string
  userCountryCode?: string
  targetCountryId?: string
  reason?: string
}

/**
 * Check if current user can access data from a specific country
 */
export async function checkCountryAccess(
  targetCountryId?: string,
  targetCountryCode?: string
): Promise<CountryAccessCheck> {
  const supabase = createServerSupabaseClient()
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {
        allowed: false,
        reason: "User not authenticated"
      }
    }
    
    // Get user's profile with country info
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, country_id, role, countries(id, code, name)")
      .eq("auth_user_id", user.id)
      .single()
    
    if (profileError || !profile) {
      return {
        allowed: false,
        reason: "User profile not found"
      }
    }
    
    // Admins can access all countries
    if (profile.role === "admin") {
      return {
        allowed: true,
        userCountryId: profile.country_id,
        userCountryCode: (profile.countries as any)?.code
      }
    }
    
    // If no target specified, allow access
    if (!targetCountryId && !targetCountryCode) {
      return {
        allowed: true,
        userCountryId: profile.country_id,
        userCountryCode: (profile.countries as any)?.code
      }
    }
    
    // Convert country code to ID if needed
    let checkCountryId = targetCountryId
    if (!checkCountryId && targetCountryCode) {
      const { data: country } = await supabase
        .from("countries")
        .select("id")
        .eq("code", targetCountryCode)
        .single()
      
      checkCountryId = country?.id
    }
    
    // Check if user's country matches target country
    const allowed = profile.country_id === checkCountryId
    
    return {
      allowed,
      userCountryId: profile.country_id,
      userCountryCode: (profile.countries as any)?.code,
      targetCountryId: checkCountryId,
      reason: allowed ? undefined : "Access denied: You can only view data from your registered country"
    }
  } catch (error) {
    console.error("Country access check error:", error)
    return {
      allowed: false,
      reason: "Error checking country access"
    }
  }
}

/**
 * Middleware to enforce country restrictions on API routes
 */
export async function enforceCountryAccess(
  request: Request,
  targetCountryId?: string,
  targetCountryCode?: string
): Promise<NextResponse | null> {
  const accessCheck = await checkCountryAccess(targetCountryId, targetCountryCode)
  
  if (!accessCheck.allowed) {
    // Log the access attempt
    try {
      const supabase = createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await supabase.from("country_access_logs").insert({
          user_id: user.id,
          attempted_country_id: targetCountryId,
          user_country_id: accessCheck.userCountryId,
          access_type: "api_request",
          was_denied: true,
          ip_address: request.headers.get("x-forwarded-for")?.split(",")[0] || null
        })
      }
    } catch (logError) {
      console.error("Failed to log access attempt:", logError)
    }
    
    return NextResponse.json(
      { 
        error: accessCheck.reason || "Access denied",
        code: "COUNTRY_ACCESS_DENIED"
      },
      { status: 403 }
    )
  }
  
  return null // Access allowed
}

/**
 * Get user's country filter for database queries
 */
export async function getUserCountryFilter() {
  const supabase = createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("country_id, role")
    .eq("auth_user_id", user.id)
    .single()
  
  if (!profile) return null
  
  // Admins see all countries
  if (profile.role === "admin") {
    return {} // No filter
  }
  
  // Others see only their country
  return { country_id: profile.country_id }
}