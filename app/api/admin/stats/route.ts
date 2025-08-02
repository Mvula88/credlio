import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("is_admin")

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const countryId = searchParams.get("country_id")

    let query = supabase.from("profiles").select("*", { count: "exact", head: true })

    if (countryId) {
      query = query.eq("country_id", countryId)
    }

    const { count: totalUsers } = await query

    // Get loan stats
    let loanQuery = supabase.from("loan_requests").select("*", { count: "exact", head: true })
    if (countryId) {
      loanQuery = loanQuery.eq("country_id", countryId)
    }
    const { count: totalLoans } = await loanQuery

    // Get pending loans
    let pendingQuery = supabase
      .from("loan_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
    if (countryId) {
      pendingQuery = pendingQuery.eq("country_id", countryId)
    }
    const { count: pendingLoans } = await pendingQuery

    // Get payment stats
    let paymentQuery = supabase.from("loan_payments").select("*", { count: "exact", head: true })
    if (countryId) {
      paymentQuery = paymentQuery.eq("country_id", countryId)
    }
    const { count: totalPayments } = await paymentQuery

    // Get revenue (sum of all payments)
    let revenueQuery = supabase.from("loan_payments").select("amount")
    if (countryId) {
      revenueQuery = revenueQuery.eq("country_id", countryId)
    }
    const { data: payments } = await revenueQuery
    const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0

    // Get active countries (only for super admin)
    let activeCountries = 0
    if (!countryId) {
      const { count } = await supabase
        .from("profiles")
        .select("country_id", { count: "exact", head: true })
        .not("country_id", "is", null)
      activeCountries = count || 0
    }

    const stats = {
      totalUsers: totalUsers || 0,
      totalLoans: totalLoans || 0,
      totalPayments: totalPayments || 0,
      totalRevenue: totalRevenue,
      activeCountries: activeCountries,
      pendingLoans: pendingLoans || 0,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error in admin stats API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
