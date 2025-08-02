import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { createSubscriptionCheckout } from "@/lib/services/stripe"
import type { Database } from "@/lib/types/database"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const { planTier, successUrl, cancelUrl } = await request.json()

    if (!planTier || !successUrl || !cancelUrl) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, country")
      .eq("auth_user_id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check if user is a lender
    if (profile.role !== "lender") {
      return NextResponse.json({ error: "Only lenders can subscribe" }, { status: 403 })
    }

    // Check if user has country set
    if (!profile.country) {
      return NextResponse.json({ error: "Please select your country first" }, { status: 400 })
    }

    // Check if user already has an active subscription
    const { data: existingSubscription } = await supabase
      .from("lender_subscriptions")
      .select("id")
      .eq("lender_id", profile.id)
      .in("status", ["active", "trial"])
      .single()

    if (existingSubscription) {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      )
    }

    // Create checkout session
    const checkoutUrl = await createSubscriptionCheckout(
      profile.id,
      planTier,
      profile.country,
      successUrl,
      cancelUrl
    )

    return NextResponse.json({ url: checkoutUrl })
  } catch (error: any) {
    console.error("Checkout error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
