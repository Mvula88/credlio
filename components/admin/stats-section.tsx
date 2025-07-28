"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { AlertCircle, Users, CreditCard, AlertTriangle, TrendingUp } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from "recharts"
import type { Database } from "@/lib/types/database"

export function AdminStatsSection() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalLoans: 0,
    totalPayments: 0,
    blacklistCount: 0,
    loanVolume: 0,
  })
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)

        // Fetch user count
        const { count: userCount, error: userError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })

        if (userError) throw userError

        // Fetch loan count
        const { count: loanCount, error: loanError } = await supabase
          .from("loan_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "funded")

        if (loanError) throw loanError

        // Fetch payment count
        const { count: paymentCount, error: paymentError } = await supabase
          .from("loan_payments")
          .select("*", { count: "exact", head: true })

        if (paymentError) throw paymentError

        // Fetch blacklist count
        const { count: blacklistCount, error: blacklistError } = await supabase
          .from("blacklist")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")

        if (blacklistError) throw blacklistError

        // Fetch loan volume
        const { data: loans, error: volumeError } = await supabase
          .from("loan_requests")
          .select("amount")
          .eq("status", "funded")

        if (volumeError) throw volumeError

        const totalVolume = loans?.reduce((sum, loan) => sum + (loan.amount || 0), 0) || 0

        setStats({
          totalUsers: userCount || 0,
          totalLoans: loanCount || 0,
          totalPayments: paymentCount || 0,
          blacklistCount: blacklistCount || 0,
          loanVolume: totalVolume,
        })

        // Generate chart data (last 6 months)
        await generateChartData()
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    async function generateChartData() {
      try {
        const months = []
        const today = new Date()

        // Generate last 6 months
        for (let i = 5; i >= 0; i--) {
          const month = new Date(today.getFullYear(), today.getMonth() - i, 1)
          const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0)

          const monthName = month.toLocaleString("default", { month: "short" })

          // Fetch loans created in this month
          const { data: loans, error: loanError } = await supabase
            .from("loan_requests")
            .select("created_at, amount, status")
            .gte("created_at", month.toISOString())
            .lt("created_at", monthEnd.toISOString())

          if (loanError) throw loanError

          // Fetch payments made in this month
          const { data: payments, error: paymentError } = await supabase
            .from("loan_payments")
            .select("created_at, amount, status")
            .gte("created_at", month.toISOString())
            .lt("created_at", monthEnd.toISOString())

          if (paymentError) throw paymentError

          const loanVolume =
            loans?.reduce((sum, loan) => (loan.status === "funded" ? sum + (loan.amount || 0) : sum), 0) || 0

          const paymentVolume =
            payments?.reduce(
              (sum, payment) => (payment.status === "completed" ? sum + (payment.amount || 0) : sum),
              0,
            ) || 0

          months.push({
            month: monthName,
            loans: loans?.length || 0,
            payments: payments?.length || 0,
            loanVolume,
            paymentVolume,
          })
        }

        setChartData(months)
      } catch (err: any) {
        setError(err.message)
      }
    }

    fetchStats()
  }, [supabase])

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.totalUsers}</div>
            <p className="text-xs text-gray-500">Registered accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <CreditCard className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.totalLoans}</div>
            <p className="text-xs text-gray-500">Funded loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Blacklisted Users</CardTitle>
            <AlertTriangle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.blacklistCount}</div>
            <p className="text-xs text-gray-500">Active blacklist entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Loan Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : `$${stats.loanVolume.toLocaleString()}`}</div>
            <p className="text-xs text-gray-500">Total funded amount</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Activity</CardTitle>
          <CardDescription>Loan and payment activity over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-80">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="h-80 w-full" style={{ "--chart-1": "216, 100%, 50%", "--chart-2": "142, 76%, 36%" } as any}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="loans"
                    stroke="hsl(var(--chart-1))"
                    name="Loans Created"
                    activeDot={{ r: 8 }}
                  />
                  <Line type="monotone" dataKey="payments" stroke="hsl(var(--chart-2))" name="Payments Made" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
