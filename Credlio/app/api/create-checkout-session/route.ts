import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { planType } = body

    if (!planType || !["basic", "premium"].includes(planType)) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 })
    }

    // Get user session
    const supabase = createServerSupabaseClient()
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get price ID
    const priceId =
      planType === "basic"
        ? process.env.STRIPE_PRICE_ID_TIER_1?.trim()
        : process.env.STRIPE_PRICE_ID_TIER_2?.trim()

    if (!priceId) {
      return NextResponse.json({ error: "Price configuration missing" }, { status: 500 })
    }

    // Create checkout session with proper success page
    const session_data = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 1, // 1-day free trial
        metadata: {
          user_id: session.user.id,
          plan_type: planType,
        },
      },
      payment_method_collection: "always", // Ensure card is collected upfront
      // Redirect to checkout success page with session ID
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/lender/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/lender-disclaimer`,
      customer_email: session.user.email || undefined,
      metadata: {
        user_id: session.user.id,
        planType,
      },
    })

    return NextResponse.json({
      url: session_data.url,
      sessionId: session_data.id,
    })
  } catch (error) {
    console.error("Stripe error:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
