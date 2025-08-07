import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { borrowerId, borrowerEmail } = await request.json()
    
    // Accept either ID or email, but prefer ID
    if (!borrowerId && !borrowerEmail) {
      return NextResponse.json(
        { error: "Borrower ID or email is required" },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user is authenticated and is a lender
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single()

    if (profile?.role !== "lender" && profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Only lenders can check borrower risk" },
        { status: 403 }
      )
    }

    // If only email provided, get the borrower ID first
    let actualBorrowerId = borrowerId
    if (!borrowerId && borrowerEmail) {
      const { data: borrowerProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", borrowerEmail)
        .eq("role", "borrower")
        .single()
      
      if (borrowerProfile) {
        actualBorrowerId = borrowerProfile.id
      }
    }

    if (!actualBorrowerId) {
      return NextResponse.json(
        { error: "Borrower not found" },
        { status: 404 }
      )
    }

    // Call the ID-based risk check function
    const { data: riskData, error: riskError } = await supabase
      .rpc("is_borrower_risky_by_id", { p_borrower_id: actualBorrowerId })

    if (riskError) {
      console.error("Risk check error:", riskError)
      return NextResponse.json(
        { error: "Failed to check borrower risk" },
        { status: 500 }
      )
    }

    // Get detailed reports if borrower is risky
    let reports = []
    if (riskData?.is_risky) {
      const { data: reportData } = await supabase
        .from("blacklisted_borrowers")
        .select(`
          *,
          lender:profiles!blacklisted_borrowers_lender_profile_id_fkey(
            full_name,
            company_name
          )
        `)
        .eq("borrower_profile_id", actualBorrowerId)
        .eq("deregistered", false)
        .order("created_at", { ascending: false })

      reports = reportData || []
    }

    // Log the risk check
    await supabase
      .from("compliance_logs")
      .insert({
        log_type: "risk_check",
        severity: riskData?.is_risky ? "warning" : "info",
        user_id: profile.id,
        description: `Risk check performed for borrower: ${borrowerEmail}`,
        metadata: {
          borrower_email: borrowerEmail,
          risk_result: riskData
        }
      })

    return NextResponse.json({
      ...riskData,
      reports,
      checked_at: new Date().toISOString()
    })
  } catch (error) {
    console.error("Risk check error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    
    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get risk summary
    const { data: summary, error } = await supabase
      .rpc("get_borrower_risk_summary", { p_borrower_email: email })

    if (error) {
      console.error("Risk summary error:", error)
      return NextResponse.json(
        { error: "Failed to get risk summary" },
        { status: 500 }
      )
    }

    return NextResponse.json(summary?.[0] || {
      borrower_email: email,
      risk_score: 0,
      risk_category: "unknown",
      total_reports: 0,
      reporting_lenders: 0,
      system_flagged: false,
      total_amount_owed: 0,
      report_reasons: []
    })
  } catch (error) {
    console.error("Risk summary error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}