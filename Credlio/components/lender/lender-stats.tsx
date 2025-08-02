"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, DollarSign, TrendingUp, AlertTriangle, FileText, UserCheck } from "lucide-react"

interface LenderStatsProps {
  lenderId: string
}

export function LenderStats({ lenderId }: LenderStatsProps) {
  const [stats, setStats] = useState({
    totalBorrowers: 0,
    activeLoanCount: 0,
    totalLentAmount: 0,
    totalRecoveredAmount: 0,
    reportsViewedThisMonth: 0,
    blacklistedBorrowers: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchStats()
  }, [lenderId])

  async function fetchStats() {
    try {
      // Get connected borrowers count
      const { count: borrowerCount } = await supabase
        .from("lender_borrower_connections")
        .select("*", { count: "exact", head: true })
        .eq("lender_id", lenderId)

      // Get active loans
      const { data: activeLoans } = await supabase
        .from("loan_trackers")
        .select("principal_amount, amount_paid")
        .eq("lender_id", lenderId)
        .eq("status", "active")

      // Get all loans for total amounts
      const { data: allLoans } = await supabase
        .from("loan_trackers")
        .select("principal_amount, amount_paid, status")
        .eq("lender_id", lenderId)

      // Calculate totals
      const totalLent = allLoans?.reduce((sum, loan) => sum + loan.principal_amount, 0) || 0
      const totalRecovered = allLoans?.reduce((sum, loan) => sum + loan.amount_paid, 0) || 0

      // Get reports viewed this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: reportCount } = await supabase
        .from("report_views")
        .select("*", { count: "exact", head: true })
        .eq("lender_id", lenderId)
        .gte("viewed_at", startOfMonth.toISOString())

      // Get blacklisted borrowers by this lender
      const { count: blacklistCount } = await supabase
        .from("blacklists")
        .select("*", { count: "exact", head: true })
        .eq("blacklisted_by", lenderId)
        .eq("status", "active")

      setStats({
        totalBorrowers: borrowerCount || 0,
        activeLoanCount: activeLoans?.length || 0,
        totalLentAmount: totalLent,
        totalRecoveredAmount: totalRecovered,
        reportsViewedThisMonth: reportCount || 0,
        blacklistedBorrowers: blacklistCount || 0,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const recoveryRate =
    stats.totalLentAmount > 0
      ? ((stats.totalRecoveredAmount / stats.totalLentAmount) * 100).toFixed(1)
      : "0"

  if (loading) {
    return (
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 animate-pulse rounded bg-gray-100" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Borrowers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalBorrowers}</div>
          <p className="text-xs text-muted-foreground">Connected borrowers</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeLoanCount}</div>
          <p className="text-xs text-muted-foreground">Currently active</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Lent</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalLentAmount)}</div>
          <p className="text-xs text-muted-foreground">All time</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recovery Rate</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{recoveryRate}%</div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(stats.totalRecoveredAmount)} recovered
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reports This Month</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.reportsViewedThisMonth}</div>
          <p className="text-xs text-muted-foreground">Viewed this month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Blacklisted</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.blacklistedBorrowers}</div>
          <p className="text-xs text-muted-foreground">Reported by you</p>
        </CardContent>
      </Card>
    </div>
  )
}
