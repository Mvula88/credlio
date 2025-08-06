import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { LenderDashboardSidebar } from "@/components/lender/dashboard-sidebar"
import { LenderProvider } from "@/lib/lender-context"

export default async function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== "lender") {
    redirect("/auth/signin")
  }

  // Get subscription status
  const supabase = createServerSupabaseClient()
  
  const { data: subscription } = await supabase
    .from("lender_subscriptions")
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .eq("lender_id", profile.id)
    .eq("status", "active")
    .single()

  const hasActiveSubscription = !!subscription
  const subscriptionTier = subscription?.plan?.tier || 0

  return (
    <LenderProvider>
      <div className="flex h-screen bg-gray-50">
        <LenderDashboardSidebar 
          profile={profile}
          hasActiveSubscription={hasActiveSubscription}
          subscriptionTier={subscriptionTier}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-7xl px-4 py-8">
            {children}
          </div>
        </main>
      </div>
    </LenderProvider>
  )
}