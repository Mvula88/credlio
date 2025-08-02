"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CountryCheckoutButtonProps {
  planType: "basic" | "premium"
  countryCode: string
  countryName: string
  price: number
  currencySymbol: string
  disabled?: boolean
}

export function CountryCheckoutButton({
  planType,
  countryCode,
  countryName,
  price,
  currencySymbol,
  disabled,
}: CountryCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planType,
          countryCode,
        }),
      })

      const { sessionId, error } = await response.json()

      if (error) {
        console.error("Checkout error:", error)
        alert("Failed to start checkout. Please try again.")
        return
      }

      const stripe = await stripePromise
      const { error: stripeError } = await stripe!.redirectToCheckout({
        sessionId,
      })

      if (stripeError) {
        console.error("Stripe error:", stripeError)
        alert("Payment failed. Please try again.")
      }
    } catch (error) {
      console.error("Checkout error:", error)
      alert("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleCheckout} disabled={disabled || loading} className="w-full" size="lg">
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        `Subscribe for ${currencySymbol}${price.toLocaleString()}`
      )}
    </Button>
  )
}
