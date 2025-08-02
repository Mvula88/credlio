"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface LenderContextType {
  subscription: {
    status: "active" | "trialing" | "expired" | "cancelled" | null
    plan: "basic" | "premium" | null
    hasMarketplaceAccess: boolean
    hasSmartMatching: boolean
    trialEndsAt: string | null
  }
  loading: boolean
  refreshSubscription: () => Promise<void>
}

const LenderContext = createContext<LenderContextType | undefined>(undefined)

interface LenderProviderProps {
  children: ReactNode
}

export function LenderProvider({ children }: LenderProviderProps) {
  const [subscription, setSubscription] = useState<LenderContextType["subscription"]>({
    status: null,
    plan: null,
    hasMarketplaceAccess: false,
    hasSmartMatching: false,
    trialEndsAt: null,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  const refreshSubscription = async () => {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setSubscription({
          status: null,
          plan: null,
          hasMarketplaceAccess: false,
          hasSmartMatching: false,
          trialEndsAt: null,
        })
        return
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      if (!profile) {
        setSubscription({
          status: null,
          plan: null,
          hasMarketplaceAccess: false,
          hasSmartMatching: false,
          trialEndsAt: null,
        })
        return
      }

      // Get user subscription
      const { data: userSub } = await supabase
        .from("user_subscriptions")
        .select(
          `
          status,
          trial_ends_at,
          expires_at,
          subscription_plans (
            name,
            has_marketplace_access,
            has_smart_matching
          )
        `
        )
        .eq("profile_id", profile.id)
        .eq("status", "active")
        .or("status.eq.trialing")
        .single()

      if (userSub && userSub.subscription_plans) {
        const plan = userSub.subscription_plans as any
        setSubscription({
          status: userSub.status as any,
          plan: plan.name.toLowerCase() as "basic" | "premium",
          hasMarketplaceAccess: plan.has_marketplace_access || false,
          hasSmartMatching: plan.has_smart_matching || false,
          trialEndsAt: userSub.trial_ends_at,
        })
      } else {
        setSubscription({
          status: null,
          plan: null,
          hasMarketplaceAccess: false,
          hasSmartMatching: false,
          trialEndsAt: null,
        })
      }
    } catch (error) {
      console.error("Error fetching subscription:", error)
      setSubscription({
        status: null,
        plan: null,
        hasMarketplaceAccess: false,
        hasSmartMatching: false,
        trialEndsAt: null,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshSubscription()
  }, [])

  return (
    <LenderContext.Provider value={{ subscription, loading, refreshSubscription }}>
      {children}
    </LenderContext.Provider>
  )
}

// Export both useLender and useLenderContext for compatibility
export function useLender() {
  const context = useContext(LenderContext)
  if (context === undefined) {
    throw new Error("useLender must be used within a LenderProvider")
  }
  return context
}

export function useLenderContext() {
  const context = useContext(LenderContext)
  if (context === undefined) {
    throw new Error("useLenderContext must be used within a LenderProvider")
  }
  return context
}
