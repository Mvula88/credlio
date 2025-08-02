const API_BASE = "/api"

export interface StripeSession {
  sessionId: string
  url: string
}

export interface SubscriptionInfo {
  id: string
  status: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  planName: string
  planAmount: number
}

export class StripeAPI {
  static async createCheckoutSession(params: {
    priceId: string
    successUrl?: string
    cancelUrl?: string
    metadata?: Record<string, string>
  }): Promise<{ data?: StripeSession; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: params.priceId,
          successUrl: params.successUrl || `${window.location.origin}/lender/checkout-success`,
          cancelUrl: params.cancelUrl || `${window.location.origin}/lender/subscribe`,
          metadata: params.metadata,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || "Failed to create checkout session" }
      }

      return { data: { sessionId: data.sessionId, url: data.url } }
    } catch (error) {
      console.error("Stripe API error:", error)
      return { error: "Network error" }
    }
  }

  static async startFreeTrial(params: {
    priceId: string
    trialDays?: number
  }): Promise<{ data?: any; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/start-free-trial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: params.priceId,
          trialDays: params.trialDays || 1,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || "Failed to start free trial" }
      }

      return { data }
    } catch (error) {
      console.error("Stripe API error:", error)
      return { error: "Network error" }
    }
  }

  static async getSubscription(): Promise<{ data?: SubscriptionInfo; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/subscription`)
      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || "Failed to fetch subscription" }
      }

      return { data }
    } catch (error) {
      console.error("Stripe API error:", error)
      return { error: "Network error" }
    }
  }

  static async cancelSubscription(): Promise<{ data?: any; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/subscription/cancel`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || "Failed to cancel subscription" }
      }

      return { data }
    } catch (error) {
      console.error("Stripe API error:", error)
      return { error: "Network error" }
    }
  }

  static async resumeSubscription(): Promise<{ data?: any; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/subscription/resume`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || "Failed to resume subscription" }
      }

      return { data }
    } catch (error) {
      console.error("Stripe API error:", error)
      return { error: "Network error" }
    }
  }
}