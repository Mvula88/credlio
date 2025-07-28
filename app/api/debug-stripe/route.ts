import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Check if price IDs exist
    const basicPriceId = process.env.STRIPE_PRICE_BASIC_USD
    const premiumPriceId = process.env.STRIPE_PRICE_PREMIUM_USD

    const results = {
      environment: {
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "Set" : "Missing",
        STRIPE_PRICE_BASIC_USD: basicPriceId || "Missing",
        STRIPE_PRICE_PREMIUM_USD: premiumPriceId || "Missing",
      },
      prices: {} as any,
    }

    // Try to fetch the prices from Stripe
    if (basicPriceId) {
      try {
        const basicPrice = await stripe.prices.retrieve(basicPriceId)
        results.prices.basic = {
          id: basicPrice.id,
          amount: basicPrice.unit_amount,
          currency: basicPrice.currency,
          active: basicPrice.active,
        }
      } catch (error) {
        results.prices.basic = { error: error instanceof Error ? error.message : "Unknown error" }
      }
    }

    if (premiumPriceId) {
      try {
        const premiumPrice = await stripe.prices.retrieve(premiumPriceId)
        results.prices.premium = {
          id: premiumPrice.id,
          amount: premiumPrice.unit_amount,
          currency: premiumPrice.currency,
          active: premiumPrice.active,
        }
      } catch (error) {
        results.prices.premium = { error: error instanceof Error ? error.message : "Unknown error" }
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
