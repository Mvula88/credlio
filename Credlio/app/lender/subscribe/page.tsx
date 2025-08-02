export const dynamic = "force-dynamic"

import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { SubscriptionPage } from "@/components/lender/subscription-page"

export default async function LenderSubscribePage() {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/signin")
  }

  // Get user profile and check if they're a lender
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `
      *,
      user_profile_roles(
        user_roles(role_name)
      )
    `
    )
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    redirect("/auth/signin")
  }

  const userRoles = profile.user_profile_roles?.map((r: any) => r.user_roles.role_name) || []

  if (!userRoles.includes("lender")) {
    redirect("/auth/signin")
  }

  // Check if user already has an active subscription
  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("*, subscription_plans(*)")
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .single()

  if (subscription) {
    redirect("/lender/dashboard")
  }

  return <SubscriptionPage />
}
