import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { BorrowerDashboardSidebar } from "@/components/borrower/dashboard-sidebar"

export default async function BorrowerDashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== "borrower") {
    redirect("/auth/signin")
  }

  const supabase = createServerSupabaseClient()
  
  // Get borrower's credit score and loan statistics
  const { data: creditData } = await supabase
    .rpc("get_borrower_credit_score", { borrower_id: profile.id })
    .single()

  const { data: activeLoans } = await supabase
    .from("loans")
    .select("id")
    .eq("borrower_id", profile.id)
    .in("status", ["active", "overdue"])

  const hasActiveLoans = activeLoans && activeLoans.length > 0

  return (
    <div className="flex h-screen bg-gray-50">
      <BorrowerDashboardSidebar 
        profile={profile}
        creditScore={creditData?.credit_score || 0}
        hasActiveLoans={hasActiveLoans}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}