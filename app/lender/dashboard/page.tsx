import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { LenderDashboardClient } from "./client-page"

export const dynamic = "force-dynamic"

export default async function LenderDashboard() {
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== "lender") {
    redirect("/auth/signin")
  }

  // Get subscription status and country info
  const supabase = createServerSupabaseClient()
  
  // Get country code
  const { data: countryData } = await supabase
    .from("countries")
    .select("code")
    .eq("id", profile.country_id)
    .single()
  
  const countryCode = countryData?.code || 'US'
  const { data: subscription } = await supabase
    .from("lender_subscriptions")
    .select(
      `
      *,
      plan:subscription_plans(*)
    `
    )
    .eq("lender_id", profile.id)
    .eq("status", "active")
    .single()

  const hasActiveSubscription = !!subscription
  const subscriptionTier = subscription?.plan?.tier || 0

  return (
    <LenderDashboardClient
      profile={profile}
      subscription={subscription}
      countryCode={countryCode}
      hasActiveSubscription={hasActiveSubscription}
      subscriptionTier={subscriptionTier}
    />
  )
}
