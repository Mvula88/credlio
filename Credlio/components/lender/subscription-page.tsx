"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Check, Crown, Star, AlertCircle } from "lucide-react"

interface SubscriptionPlan {
  id: string
  name: string
  price_nad: number
  price_usd: number
  features: string[]
  has_marketplace_access: boolean
  has_smart_matching: boolean
  trial_days: number
}

export function SubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [isNamibian, setIsNamibian] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price_nad", { ascending: true })

      if (error) {
        console.error("Error fetching plans:", error)
      } else {
        setPlans(data || [])
      }
      setLoading(false)
    }

    // Detect if user is from Namibia (you can implement IP detection here)
    const detectCountry = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/")
        const data = await response.json()
        setIsNamibian(data.country_code === "NA")
      } catch (error) {
        console.error("Error detecting country:", error)
      }
    }

    fetchPlans()
    detectCountry()
  }, [supabase])

  const handlePlanSelect = async (planId: string) => {
    setSelectedPlan(planId)

    const plan = plans.find((p) => p.id === planId)
    if (!plan) return

    if (plan.trial_days > 0) {
      // Start free trial
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      if (profile) {
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + plan.trial_days)

        await supabase.from("user_subscriptions").insert({
          profile_id: profile.id,
          plan_id: planId,
          status: "trial",
          expires_at: expiresAt.toISOString(),
        })

        router.push("/lender/dashboard")
      }
    } else {
      // Redirect to payment (implement payment logic here)
      router.push(`/lender/payment?plan=${planId}`)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading subscription plans...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">Choose Your Plan</h1>
          <p className="text-xl text-gray-600">Select the plan that best fits your lending needs</p>
        </div>

        {isNamibian && (
          <Alert className="mb-8 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Namibian lenders:</strong> You can also subscribe via eWallet or bank
              transfer. Contact <strong>+264 81 440 1522</strong> for manual activation.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${plan.name === "Premium" ? "border-2 border-blue-500 shadow-lg" : ""}`}
            >
              {plan.name === "Premium" && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
                  <Badge className="bg-blue-500 px-4 py-1 text-white">
                    <Crown className="mr-1 h-4 w-4" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold text-blue-600">
                  {plan.price_nad === 0 ? "Free" : `N$${plan.price_nad}`}
                  {plan.trial_days > 0 && (
                    <span className="text-sm text-gray-500"> / {plan.trial_days} day trial</span>
                  )}
                </div>
                <CardDescription>
                  {plan.name === "Free Trial" && "Limited access to test the platform"}
                  {plan.name === "Basic" && "Essential tools for individual lenders"}
                  {plan.name === "Premium" && "Complete lending management solution"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="mr-3 h-4 w-4 flex-shrink-0 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}

                  {plan.has_marketplace_access && (
                    <li className="flex items-center">
                      <Star className="mr-3 h-4 w-4 flex-shrink-0 text-yellow-500" />
                      <span className="text-sm font-medium">Marketplace Access</span>
                    </li>
                  )}

                  {plan.has_smart_matching && (
                    <li className="flex items-center">
                      <Star className="mr-3 h-4 w-4 flex-shrink-0 text-yellow-500" />
                      <span className="text-sm font-medium">Smart Matching</span>
                    </li>
                  )}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.name === "Premium" ? "default" : "outline"}
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={selectedPlan === plan.id}
                >
                  {selectedPlan === plan.id
                    ? "Processing..."
                    : plan.trial_days > 0
                      ? "Start Free Trial"
                      : "Subscribe Now"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600">
            All plans include basic borrower management and risk assessment tools.
          </p>
        </div>
      </div>
    </div>
  )
}
