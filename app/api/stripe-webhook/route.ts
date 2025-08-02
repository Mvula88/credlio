import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const { metadata } = session

        if (metadata?.profileId && metadata?.planType) {
          // Get the subscription plan
          const planName = metadata.planType === "basic" ? "Basic" : "Premium"
          const { data: plan } = await supabase
            .from("subscription_plans")
            .select("id")
            .eq("name", planName)
            .single()

          if (plan) {
            // Create subscription record with trial
            await supabase.from("user_subscriptions").insert({
              profile_id: metadata.profileId,
              plan_id: plan.id,
              status: "trialing",
              stripe_subscription_id: session.subscription as string,
              stripe_customer_id: session.customer as string,
              trial_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
            })

            console.log(`${planName} trial started for profile:`, metadata.profileId)
          }
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        await supabase
          .from("user_subscriptions")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", invoice.subscription)
        console.log("Payment succeeded, subscription activated")
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await supabase
          .from("user_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", invoice.subscription)
        console.log("Payment failed, subscription past due")
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await supabase
          .from("user_subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscription.id)
        console.log("Subscription cancelled")
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
