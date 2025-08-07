export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { getSubscriptionStatus } from "@/lib/services/stripe"
import type { Database } from "@/lib/types/database"

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check if user is a lender
    if (profile.role !== "lender") {
      return NextResponse.json({ hasSubscription: false, subscription: null })
    }

    // Get subscription status
    const subscription = await getSubscriptionStatus(profile.id)

    return NextResponse.json({
      hasSubscription: !!subscription,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            planName: subscription.plan.name,
            planTier: subscription.plan.tier,
            features: subscription.plan.features,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            trialEnd: subscription.trial_end,
          }
        : null,
    })
  } catch (error: any) {
    console.error("Status error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get subscription status" },
      { status: 500 }
    )
  }
}
