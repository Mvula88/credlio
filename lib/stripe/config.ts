import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
})

// Updated pricing structure
export const STRIPE_PRICES = {
  BASIC_USD: process.env.STRIPE_PRICE_BASIC_USD!, // $12.99
  PREMIUM_USD: process.env.STRIPE_PRICE_PREMIUM_USD!, // $17.99
} as const

export function getStripePriceId(planType: "basic" | "premium"): string {
  switch (planType) {
    case "basic":
      return STRIPE_PRICES.BASIC_USD
    case "premium":
      return STRIPE_PRICES.PREMIUM_USD
    default:
      throw new Error(`Invalid plan type: ${planType}`)
  }
}
