import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"

// Mark as dynamic route
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get("status")
    const countryId = searchParams.get("countryId")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    let query = supabase
      .from("loan_requests")
      .select(
        `
        *,
        borrower:profiles!borrower_profile_id (
          id,
          full_name,
          trust_score,
          is_blacklisted
        ),
        country:countries (
          id,
          name,
          currency_code
        )
      `
      )
      .range(offset, offset + limit - 1)
      .order("requested_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    if (countryId) {
      query = query.eq("country_id", countryId)
    }

    const { data: loans, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      loans: loans || [],
      pagination: {
        limit,
        offset,
        total: loans?.length || 0,
      },
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
