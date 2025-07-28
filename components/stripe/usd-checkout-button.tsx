"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface USDCheckoutButtonProps {
  planType: "basic" | "premium"
  price: number
  disabled?: boolean
}

export function USDCheckoutButton({ planType, price, disabled }: USDCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)

    try {
      console.log("Starting checkout for plan:", planType)

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planType,
        }),
      })

      const data = await response.json()
      console.log("Checkout response:", data)

      if (!response.ok || data.error) {
        console.error("Checkout error:", data.error)
        alert(`Failed to create checkout session: ${data.error}`)
        return
      }

      if (data.url) {
        console.log("Redirecting to Stripe:", data.url)
        window.location.href = data.url
      } else {
        console.error("No checkout URL received")
        alert("Failed to get checkout URL. Please try again.")
      }
    } catch (error) {
      console.error("Checkout error:", error)
      alert("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleCheckout}
      disabled={disabled || loading}
      className={`w-full ${planType === "premium" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        `Subscribe for $${price}/month`
      )}
    </Button>
  )
}
