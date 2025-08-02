"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Banknote, Users, AlertTriangle, TrendingUp } from "lucide-react"

interface DashboardStats {
  activeLoans: number
  totalLent: number
  blacklistedBorrowers: number
  pendingOffers: number
}

export function LenderDashboardStats({ lenderId }: { lenderId: string }) {
  const [stats, setStats] = useState<DashboardStats>({
    activeLoans: 0,
    totalLent: 0,
    blacklistedBorrowers: 0,
    pendingOffers: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch active loans count
        const { count: activeLoansCount } = await supabase
          .from("active_loans")
          .select("*", { count: "exact", head: true })
          .eq("lender_id", lenderId)
          .eq("status", "active")

        // Fetch total amount lent
        const { data: lentData } = await supabase
          .from("active_loans")
          .select("principal_amount")
          .eq("lender_id", lenderId)

        const totalLent =
          lentData?.reduce((sum, loan) => sum + (loan.principal_amount || 0), 0) || 0

        // Fetch blacklisted borrowers count
        const { count: blacklistCount } = await supabase
          .from("blacklists")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")

        // Fetch pending offers count
        const { count: pendingOffersCount } = await supabase
          .from("loan_offers")
          .select("*", { count: "exact", head: true })
          .eq("lender_id", lenderId)
          .eq("status", "pending")

        setStats({
          activeLoans: activeLoansCount || 0,
          totalLent,
          blacklistedBorrowers: blacklistCount || 0,
          pendingOffers: pendingOffersCount || 0,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [lenderId, supabase])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
          <Banknote className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : stats.activeLoans}</div>
          <p className="text-xs text-muted-foreground">Currently active</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Lent</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? "..." : formatCurrency(stats.totalLent)}
          </div>
          <p className="text-xs text-muted-foreground">All time</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Blacklisted</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : stats.blacklistedBorrowers}</div>
          <p className="text-xs text-muted-foreground">Total borrowers</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Offers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : stats.pendingOffers}</div>
          <p className="text-xs text-muted-foreground">Awaiting response</p>
        </CardContent>
      </Card>
    </div>
  )
}
