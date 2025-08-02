"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CreditCard, Check, Star, Zap } from "lucide-react"
import { SubscriptionPlans } from "@/components/lender/subscription-plans"
import type { LenderSubscription } from "@/lib/types/bureau"

interface SubscriptionStatusProps {
  subscription: LenderSubscription | null
  lenderId: string
}

export function SubscriptionStatus({ subscription, lenderId }: SubscriptionStatusProps) {
  const [showPlansDialog, setShowPlansDialog] = useState(false)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const getDaysRemaining = () => {
    if (!subscription) return 0
    const end = new Date(subscription.current_period_end)
    const now = new Date()
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  }

  if (!subscription) {
    return (
      <>
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  No Active Subscription
                </CardTitle>
                <CardDescription>
                  Subscribe to access borrower reports and platform features
                </CardDescription>
              </div>
              <Button onClick={() => setShowPlansDialog(true)}>View Plans</Button>
            </div>
          </CardHeader>
        </Card>

        <Dialog open={showPlansDialog} onOpenChange={setShowPlansDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Choose Your Subscription Plan</DialogTitle>
              <DialogDescription>
                Select the plan that best fits your lending needs
              </DialogDescription>
            </DialogHeader>
            <SubscriptionPlans lenderId={lenderId} />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  const planName = subscription.plan?.name || "Unknown Plan"
  const planTier = subscription.plan?.tier || 1
  const daysRemaining = getDaysRemaining()

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {planTier === 2 ? (
                  <Star className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Zap className="h-5 w-5 text-blue-500" />
                )}
                {planName}
              </CardTitle>
              <CardDescription>
                Your subscription is active until {formatDate(subscription.current_period_end)}
              </CardDescription>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="mb-2">
                {daysRemaining} days remaining
              </Badge>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowPlansDialog(true)}>
                  {planTier === 1 ? "Upgrade" : "Change Plan"}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Plan Features</p>
              <div className="space-y-1">
                {subscription.plan?.features.reputation_reports && (
                  <div className="flex items-center gap-1 text-sm">
                    <Check className="h-3 w-3 text-green-600" />
                    <span>Reputation Reports</span>
                  </div>
                )}
                {subscription.plan?.features.blacklist_access && (
                  <div className="flex items-center gap-1 text-sm">
                    <Check className="h-3 w-3 text-green-600" />
                    <span>Blacklist Access</span>
                  </div>
                )}
                {subscription.plan?.features.affordability_calculator && (
                  <div className="flex items-center gap-1 text-sm">
                    <Check className="h-3 w-3 text-green-600" />
                    <span>Affordability Calculator</span>
                  </div>
                )}
                {subscription.plan?.features.marketplace_access && (
                  <div className="flex items-center gap-1 text-sm">
                    <Check className="h-3 w-3 text-green-600" />
                    <span>Marketplace Access</span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Monthly Price</p>
              <p className="text-xl font-bold">
                ${subscription.plan?.price || 0}
                <span className="text-sm font-normal text-muted-foreground">/month</span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className="bg-green-100 text-green-800">{subscription.status}</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Reports Limit</p>
              <p className="text-sm font-medium">
                {subscription.plan?.features.max_reports_per_month === -1
                  ? "Unlimited"
                  : `${subscription.plan?.features.max_reports_per_month || 0}/month`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPlansDialog} onOpenChange={setShowPlansDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Subscription Plans</DialogTitle>
            <DialogDescription>
              {planTier === 1
                ? "Upgrade to Premium to access the loan marketplace and more features"
                : "View available subscription plans"}
            </DialogDescription>
          </DialogHeader>
          <SubscriptionPlans lenderId={lenderId} currentPlanId={subscription.plan_id} />
        </DialogContent>
      </Dialog>
    </>
  )
}
