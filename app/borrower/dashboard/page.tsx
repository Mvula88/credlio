import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { BorrowerOverview } from "@/components/borrower/dashboard/overview"

export const dynamic = "force-dynamic"

export default async function BorrowerDashboard() {
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== "borrower") {
    redirect("/auth/signin")
  }

  const supabase = createServerSupabaseClient()
  
  // Fetch borrower dashboard data from Supabase
  const [
    { data: stats },
    { data: activeLoans },
    { data: recentPayments },
    { data: pendingRequests },
    { data: notifications },
    { data: creditHistory }
  ] = await Promise.all([
    // Get borrower statistics
    supabase.rpc("get_borrower_stats", { borrower_id: profile.id }),
    
    // Get active loans
    supabase
      .from("loans")
      .select(`
        *,
        lender:profiles!loans_lender_id_fkey(
          id,
          full_name,
          email,
          company_name
        ),
        repayments:loan_repayments(
          id,
          amount,
          payment_date,
          status
        )
      `)
      .eq("borrower_id", profile.id)
      .in("status", ["active", "overdue"])
      .order("created_at", { ascending: false })
      .limit(5),
    
    // Get recent payments
    supabase
      .from("loan_repayments")
      .select(`
        *,
        loan:loans!loan_repayments_loan_id_fkey(
          id,
          amount,
          lender:profiles!loans_lender_id_fkey(
            id,
            full_name,
            company_name
          )
        )
      `)
      .eq("loan.borrower_id", profile.id)
      .order("payment_date", { ascending: false })
      .limit(5),
    
    // Get pending loan requests
    supabase
      .from("loan_requests")
      .select(`
        *,
        offers:loan_offers(count)
      `)
      .eq("borrower_profile_id", profile.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(3),
    
    // Get unread notifications
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.auth_user_id)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(10),
    
    // Get credit history for chart
    supabase
      .from("credit_score_history")
      .select("*")
      .eq("borrower_id", profile.id)
      .order("recorded_at", { ascending: false })
      .limit(12)
  ])

  // Calculate key metrics
  const metrics = {
    creditScore: stats?.credit_score || 0,
    reputationScore: stats?.reputation_score || 0,
    totalLoans: stats?.total_loans || 0,
    activeLoans: activeLoans?.length || 0,
    totalBorrowed: stats?.total_borrowed || 0,
    totalRepaid: stats?.total_repaid || 0,
    onTimePaymentRate: stats?.on_time_payment_rate || 0,
    nextPaymentAmount: stats?.next_payment_amount || 0,
    nextPaymentDays: stats?.next_payment_days || null,
    pendingRequests: pendingRequests?.length || 0,
    totalOffers: pendingRequests?.reduce((sum: number, req: any) => 
      sum + (req.offers?.[0]?.count || 0), 0) || 0,
  }

  return (
    <BorrowerOverview
      profile={profile}
      metrics={metrics}
      activeLoans={activeLoans || []}
      recentPayments={recentPayments || []}
      pendingRequests={pendingRequests || []}
      notifications={notifications || []}
      creditHistory={creditHistory || []}
    />
  )
}