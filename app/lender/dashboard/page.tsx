import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { LenderOverview } from "@/components/lender/dashboard/overview"

export const dynamic = "force-dynamic"

export default async function LenderDashboard() {
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== "lender") {
    redirect("/auth/signin")
  }

  const supabase = createServerSupabaseClient()
  
  // Fetch dashboard data from Supabase
  const [
    { data: stats },
    { data: recentLoans },
    { data: recentRepayments },
    { data: subscription },
    { data: notifications }
  ] = await Promise.all([
    // Get lender statistics
    supabase.rpc("get_lender_stats", { lender_id: profile.id }),
    
    // Get recent loans
    supabase
      .from("loans")
      .select(`
        *,
        borrower:profiles!loans_borrower_id_fkey(
          id,
          full_name,
          email,
          profile_picture_url
        )
      `)
      .eq("lender_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5),
    
    // Get recent repayments
    supabase
      .from("loan_repayments")
      .select(`
        *,
        loan:loans!loan_repayments_loan_id_fkey(
          id,
          amount,
          borrower:profiles!loans_borrower_id_fkey(
            id,
            full_name,
            email
          )
        )
      `)
      .eq("loan.lender_id", profile.id)
      .order("payment_date", { ascending: false })
      .limit(5),
    
    // Get subscription status
    supabase
      .from("lender_subscriptions")
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq("lender_id", profile.id)
      .eq("status", "active")
      .single(),
    
    // Get unread notifications
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.auth_user_id)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(10)
  ])

  // Calculate key metrics
  const metrics = {
    totalLoans: stats?.total_loans || 0,
    activeLoans: stats?.active_loans || 0,
    totalDeployed: stats?.total_deployed || 0,
    totalRepaid: stats?.total_repaid || 0,
    repaymentRate: stats?.repayment_rate || 0,
    averageLoanSize: stats?.average_loan_size || 0,
    totalBorrowers: stats?.total_borrowers || 0,
    overdueLoans: stats?.overdue_loans || 0,
    portfolioRisk: stats?.portfolio_risk || "low",
    monthlyGrowth: stats?.monthly_growth || 0,
  }

  return (
    <LenderOverview
      profile={profile}
      metrics={metrics}
      recentLoans={recentLoans || []}
      recentRepayments={recentRepayments || []}
      notifications={notifications || []}
      subscription={subscription}
    />
  )
}