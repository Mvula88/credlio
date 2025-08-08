"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Award,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react"
import type { BorrowerReputation, AffordabilityMetrics } from "@/lib/types/bureau"

interface BorrowerReputationSectionProps {
  borrowerId: string
}

export function BorrowerReputationSection({ borrowerId }: BorrowerReputationSectionProps) {
  const [reputation, setReputation] = useState<BorrowerReputation | null>(null)
  const [affordability, setAffordability] = useState<AffordabilityMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchData()

    // Refresh reputation score periodically
    const interval = setInterval(fetchData, 60000) // Every minute
    return () => clearInterval(interval)
  }, [borrowerId])

  async function fetchData() {
    try {
      // Fetch reputation
      const { data: repData } = await supabase
        .from("borrower_reputation")
        .select("*")
        .eq("borrower_id", borrowerId)
        .single()

      setReputation(repData)

      // Fetch affordability
      const { data: affordData } = await supabase
        .from("affordability_metrics")
        .select("*")
        .eq("borrower_id", borrowerId)
        .single()

      setAffordability(affordData)

      // If no reputation exists, initialize it
      if (!repData) {
        await supabase.from("borrower_reputation").insert({ borrower_id: borrowerId })
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600"
    if (score >= 40) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreIcon = (score: number) => {
    if (score >= 75) return <TrendingUp className="h-8 w-8 text-green-600" />
    if (score >= 40) return <AlertTriangle className="h-8 w-8 text-yellow-600" />
    return <TrendingDown className="h-8 w-8 text-red-600" />
  }

  const getCategoryBadge = (category: string) => {
    const config = {
      GOOD: { color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-3 w-3" /> },
      MODERATE: {
        color: "bg-yellow-100 text-yellow-800",
        icon: <AlertTriangle className="h-3 w-3" />,
      },
      BAD: { color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
    }

    const { color, icon } = config[category as keyof typeof config] || config.MODERATE

    return (
      <Badge className={`${color} flex items-center gap-1`}>
        {icon}
        {category}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (!reputation) {
    return (
      <Alert>
        <AlertDescription>Unable to load reputation data. Please try again later.</AlertDescription>
      </Alert>
    )
  }

  const completionRate =
    reputation.total_loans > 0 ? (reputation.completed_loans / reputation.total_loans) * 100 : 0

  const onTimeRate =
    reputation.total_loans > 0
      ? (reputation.on_time_payments /
          (reputation.on_time_payments +
            reputation.late_payments +
            reputation.very_late_payments)) *
        100
      : 100

  return (
    <div className="space-y-6">
      {/* Main Reputation Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">Your Reputation Score</CardTitle>
              <CardDescription>Based on your loan history and payment behavior</CardDescription>
            </div>
            <Award className="h-8 w-8 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8 md:grid-cols-2">
            {/* Score Display */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {getScoreIcon(reputation.reputation_score)}
                <div>
                  <p className={`text-5xl font-bold ${getScoreColor(reputation.reputation_score)}`}>
                    {reputation.reputation_score}
                  </p>
                  <p className="text-sm text-muted-foreground">out of 100</p>
                </div>
              </div>

              {getCategoryBadge(reputation.reputation_category)}

              <Progress value={reputation.reputation_score} className="h-3" />

              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Your reputation score determines your creditworthiness and affects:
                </p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  <li>Loan approval rates</li>
                  <li>Interest rates offered</li>
                  <li>Maximum loan amounts</li>
                  <li>Visibility to premium lenders</li>
                </ul>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="space-y-4">
              <h4 className="font-semibold">Performance Metrics</h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Loan Completion Rate</span>
                  <div className="flex items-center gap-2">
                    <Progress value={completionRate} className="h-2 w-24" />
                    <span className="text-sm font-medium">{completionRate.toFixed(0)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">On-Time Payment Rate</span>
                  <div className="flex items-center gap-2">
                    <Progress value={onTimeRate} className="h-2 w-24" />
                    <span className="text-sm font-medium">{onTimeRate.toFixed(0)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Days Late</span>
                  <span className="text-sm font-medium">
                    {reputation.average_days_late.toFixed(1)} days
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Loans</span>
                  <span className="text-sm font-medium">{reputation.active_loans}</span>
                </div>
              </div>

              {reputation.is_blacklisted && (
                <Alert className="mt-4 border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    You are currently blacklisted. This severely impacts your ability to get loans.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Borrowed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(reputation.total_borrowed)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Repaid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(reputation.total_repaid)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reputation.completed_loans}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Defaulted Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{reputation.defaulted_loans}</p>
          </CardContent>
        </Card>
      </div>

      {/* Affordability Info */}
      {affordability && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Affordability Profile</CardTitle>
            <CardDescription>
              Last updated: {new Date(affordability.last_updated).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Income</p>
                <p className="text-xl font-bold">
                  {formatCurrency(affordability.total_monthly_income)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disposable Income</p>
                <p className="text-xl font-bold">
                  {formatCurrency(affordability.disposable_income)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Debt-to-Income Ratio</p>
                <p className="text-xl font-bold">
                  {affordability.debt_to_income_ratio?.toFixed(1) || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips for Improvement */}
      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertDescription>
          <strong>Tips to improve your score:</strong>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Make all loan payments on time</li>
            <li>Complete your affordability profile</li>
            <li>Avoid taking multiple loans simultaneously</li>
            <li>Communicate with lenders if you face payment difficulties</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}
