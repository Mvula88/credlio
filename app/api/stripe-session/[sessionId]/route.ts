import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion,
})

export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const { sessionId } = params

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    })

    // Return relevant session data
    return NextResponse.json({
      id: session.id,
      status: session.status,
      customer_email: session.customer_email,
      subscription: session.subscription
        ? {
            id: (session.subscription as Stripe.Subscription).id,
            status: (session.subscription as Stripe.Subscription).status,
            current_period_end: (session.subscription as Stripe.Subscription).current_period_end,
          }
        : null,
    })
  } catch (error) {
    console.error("Error retrieving Stripe session:", error)
    return NextResponse.json({ error: "Failed to retrieve session" }, { status: 500 })
  }
}
