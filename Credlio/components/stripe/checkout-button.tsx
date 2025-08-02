"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface CheckoutButtonProps {
  customerEmail?: string
  metadata?: Record<string, string>
  className?: string
  children?: React.ReactNode
}

export default function CheckoutButton({
  customerEmail,
  metadata,
  className,
  children = "Start Free Trial",
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    try {
      setLoading(true)

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_email: customerEmail,
          metadata,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Checkout error:", error)
      alert("Failed to start checkout. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleCheckout} disabled={loading} className={className}>
      {loading ? "Loading..." : children}
    </Button>
  )
}
