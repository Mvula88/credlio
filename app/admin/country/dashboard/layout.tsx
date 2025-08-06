import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { CountryAdminDashboardSidebar } from "@/components/admin/country-dashboard-sidebar"

export default async function CountryAdminDashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const profile = await getCurrentUserProfile()

  // Strict country admin access control
  if (!profile || profile.role !== "country_admin") {
    redirect("/")
  }

  const supabase = createServerSupabaseClient()
  
  // Get country admin's assigned country
  const { data: adminCountry } = await supabase
    .from("countries")
    .select("*")
    .eq("id", profile.country_id)
    .single()

  if (!adminCountry) {
    redirect("/")
  }

  // Get country-specific statistics
  const { data: countryStats } = await supabase
    .rpc("get_country_admin_stats", { admin_country_id: adminCountry.id })

  const stats = {
    totalUsers: countryStats?.total_users || 0,
    totalLenders: countryStats?.total_lenders || 0,
    totalBorrowers: countryStats?.total_borrowers || 0,
    activeLoans: countryStats?.active_loans || 0,
    verificationPending: countryStats?.verification_pending || 0,
    blacklistedUsers: countryStats?.blacklisted_users || 0
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <CountryAdminDashboardSidebar 
        profile={profile}
        country={adminCountry}
        stats={stats}
      />
      <main className="flex-1 overflow-y-auto">
        {/* Country Admin Notice Banner */}
        <div className="bg-blue-600 px-4 py-2 text-white">
          <div className="container mx-auto flex items-center justify-between text-sm">
            <span className="font-medium">
              Country Administrator - {adminCountry.name} {adminCountry.flag_emoji}
            </span>
            <span className="text-blue-200">
              Managing {stats.totalUsers} users
            </span>
          </div>
        </div>
        <div className="container mx-auto max-w-7xl px-4 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}