import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { AdminOverview } from "@/components/admin/dashboard/overview"

export const dynamic = "force-dynamic"

export default async function AdminDashboard() {
  const profile = await getCurrentUserProfile()

  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    redirect("/")
  }

  const supabase = createServerSupabaseClient()
  
  // Fetch comprehensive admin dashboard data
  const [
    { data: systemStats },
    { data: recentUsers },
    { data: recentLoans },
    { data: countryStats },
    { data: verificationQueue },
    { data: recentActivity },
    { data: platformRevenue },
    { data: riskAlerts }
  ] = await Promise.all([
    // System-wide statistics
    supabase.rpc("get_admin_system_stats"),
    
    // Recent user registrations
    supabase
      .from("profiles")
      .select(`
        *,
        country:countries(name, flag_emoji, code)
      `)
      .order("created_at", { ascending: false })
      .limit(10),
    
    // Recent loans across platform
    supabase
      .from("loans")
      .select(`
        *,
        lender:profiles!loans_lender_id_fkey(
          id, full_name, email, company_name
        ),
        borrower:profiles!loans_borrower_id_fkey(
          id, full_name, email, credit_score
        )
      `)
      .order("created_at", { ascending: false })
      .limit(10),
    
    // Statistics by country
    supabase
      .from("countries")
      .select(`
        *,
        users:profiles(count),
        loans:loan_requests(count)
      `)
      .order("name"),
    
    // Users pending verification
    supabase
      .from("profiles")
      .select("*")
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(20),
    
    // Recent system activity/audit logs
    supabase
      .from("audit_logs")
      .select(`
        *,
        user:profiles(full_name, email)
      `)
      .order("created_at", { ascending: false })
      .limit(20),
    
    // Platform revenue data
    supabase.rpc("get_platform_revenue_stats"),
    
    // Risk and compliance alerts
    supabase
      .from("risk_alerts")
      .select("*")
      .eq("resolved", false)
      .order("severity", { ascending: false })
      .limit(10)
  ])

  // Calculate key metrics
  const metrics = {
    totalUsers: systemStats?.total_users || 0,
    activeUsers: systemStats?.active_users || 0,
    totalLenders: systemStats?.total_lenders || 0,
    totalBorrowers: systemStats?.total_borrowers || 0,
    totalLoans: systemStats?.total_loans || 0,
    activeLoans: systemStats?.active_loans || 0,
    totalVolume: systemStats?.total_volume || 0,
    defaultRate: systemStats?.default_rate || 0,
    platformRevenue: platformRevenue?.total_revenue || 0,
    monthlyGrowth: systemStats?.monthly_growth || 0,
    verificationPending: verificationQueue?.length || 0,
    activeCountries: countryStats?.filter((c: any) => c.users?.length > 0).length || 0,
  }

  // Country performance data
  const countryPerformance = countryStats?.map((country: any) => ({
    ...country,
    userCount: country.users?.[0]?.count || 0,
    loanCount: country.loans?.[0]?.count || 0,
  })) || []

  return (
    <AdminOverview
      profile={profile}
      metrics={metrics}
      recentUsers={recentUsers || []}
      recentLoans={recentLoans || []}
      countryPerformance={countryPerformance}
      verificationQueue={verificationQueue || []}
      recentActivity={recentActivity || []}
      riskAlerts={riskAlerts || []}
      isSuperAdmin={profile.role === "super_admin"}
    />
  )
}