"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import type { SupportedCountry } from "@/lib/types/bureau"
import { formatCurrencyForCountry } from "@/lib/services/geolocation-client"

interface RevenueAnalyticsWidgetProps {
  country: SupportedCountry
}

export function RevenueAnalyticsWidget({ country }: RevenueAnalyticsWidgetProps) {
  const [timeRange, setTimeRange] = useState("month")
  const [revenue, setRevenue] = useState({
    total: 0,
    subscriptions: 0,
    transactions: 0,
    growth: 0,
    activeSubscriptions: 0,
    churnRate: 0,
    averageSubscriptionValue: 0,
    topPlans: [] as Array<{ plan: string; count: number; revenue: number }>
  })
  const [loading, setLoading] = useState(true)

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchRevenueData()
  }, [country, timeRange])

  async function fetchRevenueData() {
    try {
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      
      switch(timeRange) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1)
          break
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3)
          break
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1)
          break
      }

      // Fetch subscription data
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select(`
          *,
          user:profiles!inner(country_id),
          country:profiles!inner(countries!inner(code))
        `)
        .eq("country.code", country)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())

      // Fetch payment data
      const { data: payments } = await supabase
        .from("payments")
        .select(`
          amount,
          status,
          created_at,
          loan:loans!inner(
            lender:profiles!loans_lender_id_fkey!inner(country_id),
            lender_country:profiles!loans_lender_id_fkey!inner(countries!inner(code))
          )
        `)
        .eq("loan.lender_country.code", country)
        .eq("status", "completed")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())

      if (subscriptions && payments) {
        // Calculate subscription revenue
        const subscriptionRevenue = subscriptions
          .filter(s => s.status === 'active')
          .reduce((sum, sub) => sum + (sub.price || 0), 0)

        // Calculate transaction fees (assuming 2% fee)
        const transactionRevenue = payments.reduce((sum, payment) => sum + (payment.amount * 0.02), 0)

        // Calculate total revenue
        const totalRevenue = subscriptionRevenue + transactionRevenue

        // Calculate growth (compare to previous period)
        const previousStartDate = new Date(startDate)
        const previousEndDate = new Date(startDate)
        previousStartDate.setTime(startDate.getTime() - (endDate.getTime() - startDate.getTime()))
        
        const { data: previousPayments } = await supabase
          .from("payments")
          .select("amount")
          .eq("status", "completed")
          .gte("created_at", previousStartDate.toISOString())
          .lt("created_at", previousEndDate.toISOString())

        const previousRevenue = previousPayments?.reduce((sum, p) => sum + (p.amount * 0.02), 0) || 0
        const growth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

        // Count active subscriptions
        const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length

        // Calculate churn rate
        const cancelledSubscriptions = subscriptions.filter(s => s.status === 'cancelled').length
        const churnRate = activeSubscriptions > 0 ? (cancelledSubscriptions / activeSubscriptions) * 100 : 0

        // Calculate average subscription value
        const averageSubscriptionValue = activeSubscriptions > 0 
          ? subscriptionRevenue / activeSubscriptions 
          : 0

        // Get top subscription plans
        const planCounts = subscriptions.reduce((acc, sub) => {
          if (sub.status === 'active') {
            const plan = sub.plan_name || 'Basic'
            if (!acc[plan]) acc[plan] = { count: 0, revenue: 0 }
            acc[plan].count++
            acc[plan].revenue += sub.price || 0
          }
          return acc
        }, {} as Record<string, { count: number; revenue: number }>)

        const topPlans = Object.entries(planCounts)
          .map(([plan, data]) => ({ plan, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 3)

        setRevenue({
          total: totalRevenue,
          subscriptions: subscriptionRevenue,
          transactions: transactionRevenue,
          growth,
          activeSubscriptions,
          churnRate,
          averageSubscriptionValue,
          topPlans
        })
      }
    } catch (error) {
      console.error("Error fetching revenue data:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Analytics
            </CardTitle>
            <CardDescription>Detailed revenue breakdown and trends</CardDescription>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Revenue */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <Badge variant={revenue.growth >= 0 ? "default" : "destructive"} className="gap-1">
              {revenue.growth >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(revenue.growth).toFixed(1)}%
            </Badge>
          </div>
          <p className="text-3xl font-bold">
            {formatCurrencyForCountry(revenue.total, country)}
          </p>
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Subscriptions</p>
            </div>
            <p className="text-xl font-semibold">
              {formatCurrencyForCountry(revenue.subscriptions, country)}
            </p>
            <Progress 
              value={(revenue.subscriptions / revenue.total) * 100} 
              className="h-1"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Transaction Fees</p>
            </div>
            <p className="text-xl font-semibold">
              {formatCurrencyForCountry(revenue.transactions, country)}
            </p>
            <Progress 
              value={(revenue.transactions / revenue.total) * 100} 
              className="h-1"
            />
          </div>
        </div>

        {/* Subscription Metrics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Subscription Metrics</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-secondary/10 rounded">
              <p className="text-2xl font-bold">{revenue.activeSubscriptions}</p>
              <p className="text-xs text-muted-foreground">Active Subs</p>
            </div>
            <div className="text-center p-3 bg-secondary/10 rounded">
              <p className="text-2xl font-bold">{revenue.churnRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Churn Rate</p>
            </div>
            <div className="text-center p-3 bg-secondary/10 rounded">
              <p className="text-lg font-bold">
                {formatCurrencyForCountry(revenue.averageSubscriptionValue, country)}
              </p>
              <p className="text-xs text-muted-foreground">Avg Value</p>
            </div>
          </div>
        </div>

        {/* Top Plans */}
        {revenue.topPlans.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Top Subscription Plans</h4>
            <div className="space-y-2">
              {revenue.topPlans.map((plan, index) => (
                <div key={plan.plan} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="text-sm">{plan.plan}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrencyForCountry(plan.revenue, country)}
                    </p>
                    <p className="text-xs text-muted-foreground">{plan.count} subscribers</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}