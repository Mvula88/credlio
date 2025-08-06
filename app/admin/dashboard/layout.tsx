import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { AdminDashboardSidebar } from "@/components/admin/dashboard-sidebar"

export default async function AdminDashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const profile = await getCurrentUserProfile()

  // Strict admin access control - only super_admin role
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    redirect("/")
  }

  const supabase = createServerSupabaseClient()
  
  // Get system statistics for admin
  const [
    { count: totalUsers },
    { count: totalLenders },
    { count: totalBorrowers },
    { count: activeLoans },
    { data: countries }
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "lender"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "borrower"),
    supabase.from("loans").select("*", { count: "exact", head: true }).in("status", ["active", "overdue"]),
    supabase.from("countries").select("*").order("name")
  ])

  const systemStats = {
    totalUsers: totalUsers || 0,
    totalLenders: totalLenders || 0,
    totalBorrowers: totalBorrowers || 0,
    activeLoans: activeLoans || 0,
    totalCountries: countries?.length || 0
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminDashboardSidebar 
        profile={profile}
        systemStats={systemStats}
        isSuperAdmin={profile.role === "super_admin"}
      />
      <main className="flex-1 overflow-y-auto">
        {/* Admin Notice Banner */}
        <div className="bg-purple-600 px-4 py-2 text-white">
          <div className="container mx-auto flex items-center justify-between text-sm">
            <span className="font-medium">
              Admin Dashboard - Full System Access
            </span>
            <span className="text-purple-200">
              Logged in as: {profile.email}
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