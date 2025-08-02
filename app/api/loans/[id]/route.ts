import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient()
    const { id } = params

    const { data: loan, error } = await supabase
      .from("loan_requests")
      .select(
        `
        *,
        borrower:profiles!borrower_profile_id (
          id,
          full_name,
          trust_score,
          is_blacklisted,
          email,
          phone_number
        ),
        country:countries (
          id,
          name,
          currency_code
        ),
        offers:loan_offers (
          id,
          offer_amount,
          interest_rate,
          offer_status,
          created_at,
          lender:profiles!lender_profile_id (
            id,
            full_name,
            trust_score
          )
        )
      `
      )
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Loan not found" }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ loan })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
