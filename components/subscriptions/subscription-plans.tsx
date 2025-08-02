"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Check, X, Loader2, CreditCard, Info } from "lucide-react"
import { formatCurrencyForCountry } from "@/lib/services/geolocation-client"
import type { SupportedCountry } from "@/lib/types/bureau"

interface SubscriptionPlan {
  tier: number
  name: string
  price: number
  features: {
    reputation_reports: boolean
    blacklist_access: boolean
    affordability_calculator: boolean
    marketplace_access: boolean
    max_reports_per_month: number
    smart_matching?: boolean
    priority_support?: boolean
  }
}

interface SubscriptionPlansProps {
  currentPlan?: SubscriptionPlan | null
  userCountry: SupportedCountry
  onSubscribe?: () => void
}

const plans: SubscriptionPlan[] = [
  {
    tier: 1,
    name: "Basic",
    price: 15,
    features: {
      reputation_reports: true,
      blacklist_access: true,
      affordability_calculator: true,
      marketplace_access: false,
      max_reports_per_month: 10,
      smart_matching: false,
      priority_support: false,
    },
  },
  {
    tier: 2,
    name: "Premium",
    price: 22,
    features: {
      reputation_reports: true,
      blacklist_access: true,
      affordability_calculator: true,
      marketplace_access: true,
      max_reports_per_month: -1, // Unlimited
      smart_matching: true,
      priority_support: true,
    },
  },
]

export function SubscriptionPlans({
  currentPlan,
  userCountry,
  onSubscribe,
}: SubscriptionPlansProps) {
  const [subscribing, setSubscribing] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubscribe(planTier: number) {
    setSubscribing(planTier)
    setError(null)

    try {
      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planTier,
          successUrl: `${window.location.origin}/lender/subscription/success`,
          cancelUrl: `${window.location.origin}/lender/subscription`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      // Redirect to Stripe checkout
      window.location.href = data.url
    } catch (error: any) {
      setError(error.message)
      setSubscribing(null)
    }
  }

  async function handleManageSubscription() {
    setError(null)

    try {
      const response = await fetch("/api/subscriptions/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/lender/subscription`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create portal session")
      }

      // Redirect to Stripe portal
      window.location.href = data.url
    } catch (error: any) {
      setError(error.message)
    }
  }

  function FeatureItem({ included, children }: { included: boolean; children: React.ReactNode }) {
    return (
      <li className="flex items-start gap-2">
        {included ? (
          <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
        ) : (
          <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
        )}
        <span className={included ? "" : "text-muted-foreground"}>{children}</span>
      </li>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Start with a <strong>1-day free trial</strong>. Cancel anytime. Pricing shown in{" "}
          {formatCurrencyForCountry(1, userCountry).split("1")[0]}.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan?.tier === plan.tier
          const isUpgrade = currentPlan && currentPlan.tier < plan.tier

          return (
            <Card key={plan.tier} className={plan.tier === 2 ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.tier === 2 && <Badge variant="secondary">Most Popular</Badge>}
                  {isCurrentPlan && <Badge>Current Plan</Badge>}
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold">
                    {formatCurrencyForCountry(plan.price, userCountry)}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <FeatureItem included={plan.features.reputation_reports}>
                    Borrower reputation reports
                  </FeatureItem>
                  <FeatureItem included={plan.features.blacklist_access}>
                    Blacklist database access
                  </FeatureItem>
                  <FeatureItem included={plan.features.affordability_calculator}>
                    Affordability calculator
                  </FeatureItem>
                  <FeatureItem included={plan.features.marketplace_access}>
                    Marketplace access
                  </FeatureItem>
                  <FeatureItem included={plan.features.max_reports_per_month === -1}>
                    {plan.features.max_reports_per_month === -1
                      ? "Unlimited reports"
                      : `${plan.features.max_reports_per_month} reports/month`}
                  </FeatureItem>
                  {plan.tier === 2 && (
                    <>
                      <FeatureItem included={plan.features.smart_matching}>
                        Smart borrower matching
                      </FeatureItem>
                      <FeatureItem included={plan.features.priority_support}>
                        Priority support
                      </FeatureItem>
                    </>
                  )}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrentPlan ? (
                  <Button variant="outline" className="w-full" onClick={handleManageSubscription}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Subscription
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(plan.tier)}
                    disabled={subscribing !== null}
                  >
                    {subscribing === plan.tier ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : isUpgrade ? (
                      "Upgrade Plan"
                    ) : (
                      "Start Free Trial"
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>All subscriptions include:</p>
        <ul className="mt-2 space-y-1">
          <li>• 256-bit SSL encryption</li>
          <li>• Automatic backups</li>
          <li>• Email support</li>
          <li>• Regular feature updates</li>
        </ul>
      </div>
    </div>
  )
}
