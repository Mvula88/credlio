import { createServerSupabaseClient } from "@/lib/supabase/server-client"

export async function checkSubscription() {
  try {
    const supabase = createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return false
    }

    // Get user profile
    const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).single()

    if (!profile) {
      return false
    }

    // Check for active subscription
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select(`
        status,
        trial_ends_at,
        expires_at,
        subscription_plans (
          name,
          has_marketplace_access
        )
      `)
      .eq("profile_id", profile.id)
      .in("status", ["active", "trialing"])
      .single()

    if (!subscription) {
      return false
    }

    // Check if trial/subscription is still valid
    const now = new Date()

    if (subscription.status === "trialing" && subscription.trial_ends_at) {
      const trialEnd = new Date(subscription.trial_ends_at)
      return now < trialEnd
    }

    if (subscription.status === "active" && subscription.expires_at) {
      const expiresAt = new Date(subscription.expires_at)
      return now < expiresAt
    }

    return subscription.status === "active"
  } catch (error) {
    console.error("Error checking subscription:", error)
    return false
  }
}

export async function getUserSubscription() {
  try {
    const supabase = createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    // Get user profile
    const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).single()

    if (!profile) {
      return null
    }

    // Get subscription details
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select(`
        *,
        subscription_plans (
          name,
          price,
          currency,
          has_marketplace_access,
          has_smart_matching
        )
      `)
      .eq("profile_id", profile.id)
      .in("status", ["active", "trialing"])
      .single()

    return subscription
  } catch (error) {
    console.error("Error getting user subscription:", error)
    return null
  }
}
