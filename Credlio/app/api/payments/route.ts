import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"

// Mark as dynamic route
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    const loanId = searchParams.get("loanId")
    const status = searchParams.get("status")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    let query = supabase
      .from("loan_payments")
      .select(
        `
        *,
        loan_request:loan_requests (
          id,
          purpose,
          borrower:profiles!borrower_profile_id (
            id,
            full_name
          ),
          lender:profiles!lender_profile_id (
            id,
            full_name
          )
        )
      `
      )
      .limit(limit)
      .order("due_date", { ascending: true })

    if (loanId) {
      query = query.eq("loan_request_id", loanId)
    }

    if (status) {
      query = query.eq("payment_status", status)
    }

    const { data: payments, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ payments: payments || [] })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
