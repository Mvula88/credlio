import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// POST - Lender deregisters a borrower
export async function POST(request: Request) {
  try {
    const { blacklistId, reason, paymentProof } = await request.json()
    
    if (!blacklistId || !reason) {
      return NextResponse.json(
        { error: "Blacklist ID and reason are required" },
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

    // Get lender profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single()

    if (!profile || profile.role !== "lender") {
      return NextResponse.json(
        { error: "Only lenders can deregister borrowers" },
        { status: 403 }
      )
    }

    // Call deregistration function
    const { data: result, error } = await supabase
      .rpc("deregister_risky_borrower", {
        p_blacklist_id: blacklistId,
        p_lender_id: profile.id,
        p_reason: reason,
        p_payment_proof: paymentProof
      })

    if (error) {
      console.error("Deregistration error:", error)
      return NextResponse.json(
        { error: "Failed to deregister borrower" },
        { status: 500 }
      )
    }

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.message || "Deregistration failed" },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Deregistration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Borrower requests deregistration
export async function PUT(request: Request) {
  try {
    const {
      blacklistId,
      paymentAmount,
      paymentDate,
      paymentReference,
      paymentProof,
      message
    } = await request.json()
    
    if (!blacklistId || !paymentAmount || !paymentDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Get borrower profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single()

    if (!profile || profile.role !== "borrower") {
      return NextResponse.json(
        { error: "Only borrowers can request deregistration" },
        { status: 403 }
      )
    }

    // Create deregistration request
    const { data: requestId, error } = await supabase
      .rpc("request_deregistration", {
        p_borrower_id: profile.id,
        p_blacklist_id: blacklistId,
        p_payment_amount: paymentAmount,
        p_payment_date: paymentDate,
        p_payment_reference: paymentReference,
        p_payment_proof: paymentProof,
        p_message: message
      })

    if (error) {
      console.error("Request error:", error)
      return NextResponse.json(
        { error: error.message || "Failed to submit request" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      requestId,
      message: "Deregistration request submitted successfully"
    })
  } catch (error) {
    console.error("Request error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH - Approve deregistration request
export async function PATCH(request: Request) {
  try {
    const { requestId, response } = await request.json()
    
    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
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

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single()

    if (!profile || (profile.role !== "lender" && profile.role !== "admin")) {
      return NextResponse.json(
        { error: "Unauthorized to approve requests" },
        { status: 403 }
      )
    }

    // Approve request
    const { data: result, error } = await supabase
      .rpc("approve_deregistration_request", {
        p_request_id: requestId,
        p_reviewer_id: profile.id,
        p_response: response || "Request approved"
      })

    if (error) {
      console.error("Approval error:", error)
      return NextResponse.json(
        { error: "Failed to approve request" },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Approval error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET - Get deregistration requests
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "pending"
    
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      )
    }

    let query = supabase
      .from("deregistration_requests")
      .select(`
        *,
        borrower:borrower_profile_id(
          id,
          full_name,
          email
        ),
        lender:lender_profile_id(
          id,
          full_name,
          company_name
        ),
        blacklist:blacklist_entry_id(
          id,
          reason,
          amount_owed
        )
      `)
      .eq("status", status)
      .order("created_at", { ascending: false })

    // Filter based on role
    if (profile.role === "borrower") {
      query = query.eq("borrower_profile_id", profile.id)
    } else if (profile.role === "lender") {
      query = query.eq("lender_profile_id", profile.id)
    }

    const { data: requests, error } = await query

    if (error) {
      console.error("Fetch error:", error)
      return NextResponse.json(
        { error: "Failed to fetch requests" },
        { status: 500 }
      )
    }

    return NextResponse.json(requests || [])
  } catch (error) {
    console.error("Fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}