"use client"

import { useEffect, useState } from "react"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

export function SubscriptionTest() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const supabase = createSupabaseClient()
        const { data, error } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("is_active", true)
          .order("price_nad", { ascending: true })

        if (error) {
          setError(error.message)
        } else {
          setPlans(data || [])
        }
      } catch (err) {
        setError("Failed to fetch plans")
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [])

  if (loading) return <div>Loading subscription plans...</div>
  if (error) return <div className="text-red-500">Error: {error}</div>

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Available Subscription Plans:</h3>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                <Badge variant={plan.has_marketplace_access ? "default" : "secondary"}>
                  {plan.trial_days > 0 ? `${plan.trial_days}d trial` : `N$${plan.price_nad}`}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Features: {plan.features.length} included</p>
                <div className="flex gap-2">
                  {plan.has_marketplace_access && (
                    <Badge variant="outline" className="text-xs">
                      Marketplace
                    </Badge>
                  )}
                  {plan.has_smart_matching && (
                    <Badge variant="outline" className="text-xs">
                      Smart Match
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
