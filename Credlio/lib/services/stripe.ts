import Stripe from "stripe"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

// Get Stripe instance
export function getStripe() {
  return stripe
}

// Create or get Stripe customer
export async function createOrGetStripeCustomer(
  userId: string,
  email: string,
  name?: string,
  country?: string
): Promise<string> {
  const supabase = createServerSupabaseClient()

  // Check if user already has a Stripe customer ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single()

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      supabase_user_id: userId,
      country: country || "",
    },
  })

  // Save customer ID to profile
  await supabase.rpc("upsert_stripe_customer", {
    p_user_id: userId,
    p_stripe_customer_id: customer.id,
    p_email: email,
    p_name: name,
  })

  return customer.id
}

// Create subscription checkout session
export async function createSubscriptionCheckout(
  userId: string,
  planTier: number,
  country: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const supabase = createServerSupabaseClient()

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, stripe_customer_id")
    .eq("id", userId)
    .single()

  if (!profile) {
    throw new Error("User profile not found")
  }

  // Get or create Stripe customer
  const customerId = await createOrGetStripeCustomer(
    userId,
    profile.email,
    profile.full_name,
    country
  )

  // Get subscription plan
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("stripe_price_id, price, currency_prices")
    .eq("tier", planTier)
    .single()

  if (!plan) {
    throw new Error("Subscription plan not found")
  }

  // Get country-specific pricing
  const { data: countryData } = await supabase
    .from("countries")
    .select("currency_code")
    .eq("code", country)
    .single()

  const currency = countryData?.currency_code || "USD"
  const localPrice = plan.currency_prices?.[currency] || plan.price

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: planTier === 1 ? "Basic Plan" : "Premium Plan",
            description:
              planTier === 1
                ? "Access to reputation reports, blacklist, and risk assessment"
                : "All Basic features plus marketplace access and unlimited reports",
          },
          unit_amount: Math.round(localPrice * 100), // Convert to cents
          recurring: {
            interval: "month",
            interval_count: 1,
          },
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    subscription_data: {
      trial_period_days: 1, // 1-day free trial
      metadata: {
        user_id: userId,
        plan_tier: planTier.toString(),
        country: country,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: userId,
      plan_tier: planTier.toString(),
      country: country,
    },
  })

  return session.url!
}

// Create customer portal session
export async function createCustomerPortalSession(
  userId: string,
  returnUrl: string
): Promise<string> {
  const supabase = createServerSupabaseClient()

  // Get user's Stripe customer ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single()

  if (!profile?.stripe_customer_id) {
    throw new Error("No Stripe customer found")
  }

  // Create portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: returnUrl,
  })

  return session.url
}

// Handle webhook events
export async function handleStripeWebhook(
  body: string,
  signature: string
): Promise<{ received: boolean }> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    throw new Error(`Webhook Error: ${err.message}`)
  }

  const supabase = createServerSupabaseClient()

  // Record the webhook event
  const { data: result } = await supabase.rpc("record_stripe_webhook_event", {
    p_stripe_event_id: event.id,
    p_event_type: event.type,
    p_event_data: event.data,
  })

  console.log(`Webhook processed: ${event.type}`, result)

  return { received: true }
}

// Get subscription status
export async function getSubscriptionStatus(userId: string) {
  const supabase = createServerSupabaseClient()

  const { data: subscription } = await supabase
    .from("lender_subscriptions")
    .select(
      `
      *,
      plan:subscription_plans(*)
    `
    )
    .eq("lender_id", userId)
    .in("status", ["active", "trial"])
    .single()

  if (!subscription) {
    return null
  }

  // Check if subscription is still valid
  const now = new Date()
  const periodEnd = new Date(subscription.current_period_end)

  if (periodEnd < now) {
    // Update status to expired
    await supabase
      .from("lender_subscriptions")
      .update({ status: "expired" })
      .eq("id", subscription.id)

    return null
  }

  return subscription
}

// Check feature access
export async function checkFeatureAccess(
  userId: string,
  feature: "marketplace" | "unlimited_reports" | "smart_matching"
): Promise<boolean> {
  const subscription = await getSubscriptionStatus(userId)

  if (!subscription) {
    return false
  }

  const features = subscription.plan.features

  switch (feature) {
    case "marketplace":
      return features.marketplace_access === true
    case "unlimited_reports":
      return features.max_reports_per_month === -1
    case "smart_matching":
      return features.smart_matching === true
    default:
      return false
  }
}

// Cancel subscription
export async function cancelSubscription(userId: string): Promise<boolean> {
  const supabase = createServerSupabaseClient()

  // Get subscription
  const { data: subscription } = await supabase
    .from("lender_subscriptions")
    .select("stripe_subscription_id")
    .eq("lender_id", userId)
    .eq("status", "active")
    .single()

  if (!subscription?.stripe_subscription_id) {
    return false
  }

  try {
    // Cancel at period end
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    // Update database
    await supabase
      .from("lender_subscriptions")
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
      })
      .eq("lender_id", userId)

    return true
  } catch (error) {
    console.error("Error cancelling subscription:", error)
    return false
  }
}

// Resume subscription
export async function resumeSubscription(userId: string): Promise<boolean> {
  const supabase = createServerSupabaseClient()

  // Get subscription
  const { data: subscription } = await supabase
    .from("lender_subscriptions")
    .select("stripe_subscription_id")
    .eq("lender_id", userId)
    .eq("status", "active")
    .eq("cancel_at_period_end", true)
    .single()

  if (!subscription?.stripe_subscription_id) {
    return false
  }

  try {
    // Resume subscription
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    })

    // Update database
    await supabase
      .from("lender_subscriptions")
      .update({
        cancel_at_period_end: false,
        canceled_at: null,
      })
      .eq("lender_id", userId)

    return true
  } catch (error) {
    console.error("Error resuming subscription:", error)
    return false
  }
}
