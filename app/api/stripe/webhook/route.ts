import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { handleStripeWebhook } from "@/lib/services/stripe"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"

// Disable body parsing to get raw body for signature verification
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = headers().get("stripe-signature")!

  try {
    const result = await handleStripeWebhook(body, signature)

    // Get the parsed event for additional processing
    const event = JSON.parse(body)
    const supabase = createServerSupabaseClient()

    // Handle specific webhook events
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object
        const metadata = subscription.metadata

        if (metadata.user_id && metadata.plan_tier) {
          await supabase.rpc("handle_stripe_subscription_created", {
            p_stripe_subscription_id: subscription.id,
            p_stripe_customer_id: subscription.customer,
            p_stripe_price_id: subscription.items.data[0].price.id,
            p_user_id: metadata.user_id,
            p_plan_tier: parseInt(metadata.plan_tier),
            p_status: subscription.status,
            p_current_period_start: new Date(
              subscription.current_period_start * 1000
            ).toISOString(),
            p_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            p_trial_end: subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
            p_country: metadata.country || null,
          })
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object

        await supabase.rpc("handle_stripe_subscription_deleted", {
          p_stripe_subscription_id: subscription.id,
        })
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription

        if (subscriptionId) {
          // Update subscription status to active if it was in trial
          await supabase
            .from("lender_subscriptions")
            .update({ status: "active" })
            .eq("stripe_subscription_id", subscriptionId)
            .eq("status", "trial")
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription

        if (subscriptionId && invoice.attempt_count >= 3) {
          // After 3 failed attempts, mark subscription as expired
          await supabase
            .from("lender_subscriptions")
            .update({ status: "expired" })
            .eq("stripe_subscription_id", subscriptionId)
        }
        break
      }

      case "checkout.session.completed": {
        const session = event.data.object
        const metadata = session.metadata

        if (metadata?.user_id && session.subscription) {
          // Session completed, subscription should be created via subscription.created webhook
          console.log(`Checkout completed for user ${metadata.user_id}`)
        }
        break
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
