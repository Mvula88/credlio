"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, CreditCard, Calendar, AlertCircle } from "lucide-react"
import { SubscriptionPlans } from "@/components/subscriptions/subscription-plans"
import type { Profile } from "@/lib/types/auth"
import type { LenderSubscription } from "@/lib/types/bureau"
import { formatCurrencyForCountry } from "@/lib/services/geolocation"

export default function LenderSubscriptionPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<LenderSubscription | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Get profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_user_id", user.id)
        .single()

      if (profileData) {
        setProfile(profileData)

        // Get subscription
        const { data: subData } = await supabase
          .from("lender_subscriptions")
          .select(
            `
            *,
            plan:subscription_plans(*)
          `
          )
          .eq("lender_id", profileData.id)
          .in("status", ["active", "trial"])
          .single()

        setSubscription(subData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleManageSubscription() {
    setRefreshing(true)
    try {
      const response = await fetch("/api/subscriptions/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Error opening portal:", error)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!profile || profile.role !== "lender") {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Only lenders can access this page.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        <p className="mt-1 text-muted-foreground">
          Choose the plan that works best for your lending business
        </p>
      </div>

      {subscription && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription>You're on the {subscription.plan?.name} plan</CardDescription>
              </div>
              <div className="text-right">
                {subscription.status === "trial" ? (
                  <Badge variant="secondary">Free Trial</Badge>
                ) : (
                  <Badge variant="default">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Active
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Cost</p>
                  <p className="font-medium">
                    {profile.country &&
                      formatCurrencyForCountry(subscription.plan?.price || 0, profile.country)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {subscription.status === "trial" ? "Trial Ends" : "Next Billing"}
                  </p>
                  <p className="font-medium">
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Features</p>
                  <p className="font-medium">
                    {subscription.plan?.features.marketplace_access
                      ? "Full Access"
                      : "Limited Access"}
                  </p>
                </div>
              </div>
            </div>

            {subscription.cancel_at_period_end && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your subscription will end on{" "}
                  {new Date(subscription.current_period_end).toLocaleDateString()}. You can resume
                  your subscription anytime before this date.
                </AlertDescription>
              </Alert>
            )}

            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={refreshing}
              className="w-full md:w-auto"
            >
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Subscription
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <SubscriptionPlans
        currentPlan={subscription?.plan}
        userCountry={profile.country!}
        onSubscribe={fetchData}
      />
    </div>
  )
}

function Badge({
  variant,
  children,
  className = "",
}: {
  variant: "default" | "secondary" | "destructive"
  children: React.ReactNode
  className?: string
}) {
  const variants = {
    default: "bg-green-100 text-green-800",
    secondary: "bg-blue-100 text-blue-800",
    destructive: "bg-red-100 text-red-800",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
