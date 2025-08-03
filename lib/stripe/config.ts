import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion,
})

// Updated pricing structure with live price IDs
export const STRIPE_PRICES = {
  TIER_1: process.env.STRIPE_PRICE_ID_TIER_1!, // $12.99 tier
  TIER_2: process.env.STRIPE_PRICE_ID_TIER_2!, // $19.99 tier
} as const

export function getStripePriceId(planType: "basic" | "premium"): string {
  switch (planType) {
    case "basic":
      return STRIPE_PRICES.TIER_1
    case "premium":
      return STRIPE_PRICES.TIER_2
    default:
      throw new Error(`Invalid plan type: ${planType}`)
  }
}
