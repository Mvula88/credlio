"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, Loader2 } from "lucide-react"
import type { SubscriptionPlan } from "@/lib/types/bureau"

interface SubscriptionPlansProps {
  lenderId: string
  currentPlanId?: string
}

export function SubscriptionPlans({ lenderId, currentPlanId }: SubscriptionPlansProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchPlans()
  }, [])

  async function fetchPlans() {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("tier", { ascending: true })

      if (error) throw error
      setPlans(data || [])
    } catch (error) {
      console.error("Error fetching plans:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubscribe(planId: string) {
    setSubscribing(planId)
    try {
      // In a real app, this would integrate with Stripe
      // For now, we'll create a direct subscription
      const { error } = await supabase.from("lender_subscriptions").upsert(
        {
          lender_id: lenderId,
          plan_id: planId,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          onConflict: "lender_id",
        }
      )

      if (error) throw error

      // Refresh the page to show updated subscription
      window.location.reload()
    } catch (error) {
      console.error("Error subscribing:", error)
      alert("Failed to subscribe. Please try again.")
    } finally {
      setSubscribing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {plans.map((plan) => {
        const isCurrentPlan = plan.id === currentPlanId
        const isPremium = plan.tier === 2

        return (
          <Card key={plan.id} className={`relative ${isPremium ? "border-yellow-400" : ""}`}>
            {isPremium && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500">
                Most Popular
              </Badge>
            )}

            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>
                {plan.tier === 1
                  ? "Essential tools for responsible lending"
                  : "Full access to all platform features"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="border-y py-4 text-center">
                <p className="text-4xl font-bold">
                  ${plan.price}
                  <span className="text-lg font-normal text-muted-foreground">/month</span>
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Features included:</h4>

                <div className="space-y-2">
                  <FeatureItem
                    included={plan.features.reputation_reports}
                    text="Borrower Reputation Reports"
                  />
                  <FeatureItem
                    included={plan.features.blacklist_access}
                    text="Blacklist Access & Management"
                  />
                  <FeatureItem
                    included={plan.features.affordability_calculator}
                    text="Affordability Calculator"
                  />
                  <FeatureItem
                    included={plan.features.marketplace_access}
                    text="Loan Marketplace Access"
                    highlight={isPremium}
                  />
                  <FeatureItem
                    included={true}
                    text={
                      plan.features.max_reports_per_month === -1
                        ? "Unlimited Reports"
                        : `${plan.features.max_reports_per_month} Reports/Month`
                    }
                  />
                  {plan.features.smart_matching && (
                    <FeatureItem included={true} text="Smart Loan Matching" highlight={true} />
                  )}
                  {plan.features.priority_support && (
                    <FeatureItem included={true} text="Priority Support" highlight={true} />
                  )}
                </div>
              </div>

              {plan.tier === 1 && (
                <div className="space-y-2 pt-4 text-sm text-muted-foreground">
                  <p className="font-medium">Not included:</p>
                  <ul className="space-y-1">
                    <li className="flex items-center gap-2">
                      <X className="h-3 w-3 text-red-500" />
                      Loan Marketplace Access
                    </li>
                    <li className="flex items-center gap-2">
                      <X className="h-3 w-3 text-red-500" />
                      Smart Matching
                    </li>
                  </ul>
                </div>
              )}
            </CardContent>

            <CardFooter>
              {isCurrentPlan ? (
                <Button className="w-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={subscribing === plan.id}
                >
                  {subscribing === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    `Subscribe to ${plan.name}`
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}

function FeatureItem({
  included,
  text,
  highlight = false,
}: {
  included: boolean
  text: string
  highlight?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 ${highlight ? "font-medium" : ""}`}>
      {included ? (
        <Check className={`h-4 w-4 ${highlight ? "text-yellow-500" : "text-green-600"}`} />
      ) : (
        <X className="h-4 w-4 text-gray-400" />
      )}
      <span className={!included ? "text-gray-400" : ""}>{text}</span>
    </div>
  )
}
