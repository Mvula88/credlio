import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const isPublic = searchParams.get("public") === "true"
    
    const supabase = createServerSupabaseClient()

    if (isPublic) {
      // Public stats for landing page
      const [
        { count: totalUsers },
        { data: loansData },
        { count: totalCountries },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("active_loans").select("amount"),
        supabase.from("countries").select("*", { count: "exact", head: true }),
      ])

      // Calculate total amount tracked
      const totalLoansTracked = loansData?.reduce((sum, loan) => sum + (loan.amount || 0), 0) || 0

      // Calculate success rate
      const { count: completedLoans } = await supabase
        .from("active_loans")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")

      const { count: totalLoans } = await supabase
        .from("active_loans")
        .select("*", { count: "exact", head: true })

      const successRate = totalLoans ? Math.round((completedLoans || 0) / totalLoans * 100) : 95

      return NextResponse.json({
        totalUsers: totalUsers || 0,
        totalLoansTracked: totalLoansTracked || 0,
        totalCountries: totalCountries || 16,
        successRate: successRate || 95,
      })
    } else {
      // Admin stats (requires authentication)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("auth_user_id", user.id)
        .single()

      if (!profile || profile.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      // Get detailed admin statistics
      const [
        { count: totalUsers },
        { count: totalLoans },
        { count: activeLoans },
        { count: blacklistedUsers },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("loan_requests").select("*", { count: "exact", head: true }),
        supabase
          .from("active_loans")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("borrower_profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_risky", true),
      ])

      return NextResponse.json({
        stats: {
          totalUsers: totalUsers || 0,
          totalLoans: totalLoans || 0,
          activeLoans: activeLoans || 0,
          blacklistedUsers: blacklistedUsers || 0,
        },
      })
    }
  } catch (error) {
    console.error("Stats API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
