import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies, headers } from "next/headers"
import { NextResponse } from "next/server"
import crypto from "crypto"

// POST - Check identity on registration/login
export async function POST(request: Request) {
  try {
    const { 
      email, 
      phone, 
      nationalId,
      fullName,
      dateOfBirth,
      action // 'register' or 'login'
    } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })
    
    // Get IP address from headers for tracking
    const headersList = headers()
    const ipAddress = headersList.get("x-forwarded-for") || 
                     headersList.get("x-real-ip") || 
                     headersList.get("x-client-ip") ||
                     "unknown"
    
    // Generate email hash for privacy
    const emailHash = crypto
      .createHash("sha256")
      .update(email.toLowerCase().trim())
      .digest("hex")
    
    if (action === "register") {
      // Check for existing risky identity
      const { data: identityCheck } = await supabase
        .rpc("check_persistent_identity", {
          p_email_hash: emailHash,
          p_phone: phone,
          p_national_id: nationalId
        })
      
      if (identityCheck?.is_risky) {
        // Found a risky identity
        return NextResponse.json({
          warning: true,
          isRisky: true,
          message: "Previous account with outstanding debts detected",
          details: {
            totalOwed: identityCheck.total_amount_owed,
            timesReported: identityCheck.times_reported,
            accountDeletions: identityCheck.account_deletions,
            lastDeleted: identityCheck.last_account_deleted_at
          }
        })
      }
    }
    
    // Store IP address for tracking
    if (action === "login") {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Get profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("auth_user_id", user.id)
          .single()
        
        if (profile?.role === "borrower" && ipAddress !== "unknown") {
          // Update persistent identity with IP address
          await supabase.rpc("update_borrower_ip", {
            p_profile_id: profile.id,
            p_ip_address: ipAddress
          })
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      isRisky: false
    })
  } catch (error) {
    console.error("Identity check error:", error)
    return NextResponse.json(
      { error: "Failed to check identity" },
      { status: 500 }
    )
  }
}

// GET - Get identity verification status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get("profileId")
    
    if (!profileId) {
      return NextResponse.json(
        { error: "Profile ID required" },
        { status: 400 }
      )
    }
    
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if profile has persistent identity
    const { data: identity, error } = await supabase
      .from("persistent_borrower_identity")
      .select(`
        id,
        is_risky,
        risk_score,
        times_reported,
        total_amount_owed,
        account_deletions,
        reregistration_attempts
      `)
      .eq("profile_id", profileId)
      .single()
    
    if (error || !identity) {
      return NextResponse.json({
        hasIdentity: false,
        isRisky: false
      })
    }
    
    return NextResponse.json({
      hasIdentity: true,
      isRisky: identity.is_risky,
      riskScore: identity.risk_score,
      timesReported: identity.times_reported,
      totalOwed: identity.total_amount_owed,
      accountDeletions: identity.account_deletions,
      reregistrationAttempts: identity.reregistration_attempts
    })
  } catch (error) {
    console.error("Get identity error:", error)
    return NextResponse.json(
      { error: "Failed to get identity status" },
      { status: 500 }
    )
  }
}