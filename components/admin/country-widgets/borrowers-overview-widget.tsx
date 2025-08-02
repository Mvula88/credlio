"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react"
import type { SupportedCountry } from "@/lib/types/bureau"

interface BorrowersOverviewWidgetProps {
  country: SupportedCountry
}

export function BorrowersOverviewWidget({ country }: BorrowersOverviewWidgetProps) {
  const [stats, setStats] = useState({
    totalBorrowers: 0,
    activeBorrowers: 0,
    newBorrowersThisMonth: 0,
    riskDistribution: {
      low: 0,
      medium: 0,
      high: 0,
      blacklisted: 0
    },
    reputationAverage: 0,
    loanStats: {
      active: 0,
      completed: 0,
      defaulted: 0
    }
  })
  const [loading, setLoading] = useState(true)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchBorrowerStats()
  }, [country])

  async function fetchBorrowerStats() {
    try {
      // Fetch borrowers from this country
      const { data: borrowers } = await supabase
        .from("borrower_profiles")
        .select(`
          *,
          user:profiles!inner(country_id),
          country:profiles!inner(countries!inner(code))
        `)
        .eq("country.code", country)

      if (borrowers) {
        // Calculate statistics
        const totalBorrowers = borrowers.length
        const activeBorrowers = borrowers.filter(b => b.is_active).length
        
        // Calculate new borrowers this month
        const thisMonth = new Date()
        thisMonth.setDate(1)
        const newBorrowersThisMonth = borrowers.filter(
          b => new Date(b.created_at) >= thisMonth
        ).length

        // Risk distribution
        const riskDistribution = borrowers.reduce((acc, borrower) => {
          if (borrower.blacklisted) acc.blacklisted++
          else if (borrower.risk_score >= 70) acc.high++
          else if (borrower.risk_score >= 40) acc.medium++
          else acc.low++
          return acc
        }, { low: 0, medium: 0, high: 0, blacklisted: 0 })

        // Calculate average reputation
        const reputationAverage = borrowers.reduce((sum, b) => sum + b.reputation_score, 0) / totalBorrowers || 0

        // Fetch loan statistics
        const borrowerIds = borrowers.map(b => b.user_id)
        const { data: loans } = await supabase
          .from("loans")
          .select("status")
          .in("borrower_id", borrowerIds)

        const loanStats = loans?.reduce((acc, loan) => {
          if (loan.status === 'active') acc.active++
          else if (loan.status === 'completed') acc.completed++
          else if (loan.status === 'defaulted') acc.defaulted++
          return acc
        }, { active: 0, completed: 0, defaulted: 0 }) || { active: 0, completed: 0, defaulted: 0 }

        setStats({
          totalBorrowers,
          activeBorrowers,
          newBorrowersThisMonth,
          riskDistribution,
          reputationAverage,
          loanStats
        })
      }
    } catch (error) {
      console.error("Error fetching borrower stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const riskTotal = Object.values(stats.riskDistribution).reduce((a, b) => a + b, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Borrowers Overview
            </CardTitle>
            <CardDescription>Comprehensive borrower metrics and risk analysis</CardDescription>
          </div>
          <Badge variant="outline" className="text-lg">
            {stats.totalBorrowers} Total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Active Borrowers</p>
            <p className="text-2xl font-bold">{stats.activeBorrowers}</p>
            <p className="text-xs text-muted-foreground">
              {((stats.activeBorrowers / stats.totalBorrowers) * 100).toFixed(1)}% of total
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">New This Month</p>
            <p className="text-2xl font-bold flex items-center gap-1">
              {stats.newBorrowersThisMonth}
              {stats.newBorrowersThisMonth > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Avg Reputation</p>
            <p className="text-2xl font-bold">{stats.reputationAverage.toFixed(1)}</p>
            <Progress value={stats.reputationAverage} className="h-1" />
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Risk Distribution</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Low Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{stats.riskDistribution.low}</span>
                <Progress 
                  value={(stats.riskDistribution.low / riskTotal) * 100} 
                  className="w-24 h-2"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Medium Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{stats.riskDistribution.medium}</span>
                <Progress 
                  value={(stats.riskDistribution.medium / riskTotal) * 100} 
                  className="w-24 h-2"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">High Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{stats.riskDistribution.high}</span>
                <Progress 
                  value={(stats.riskDistribution.high / riskTotal) * 100} 
                  className="w-24 h-2"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-black" />
                <span className="text-sm">Blacklisted</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{stats.riskDistribution.blacklisted}</span>
                <Progress 
                  value={(stats.riskDistribution.blacklisted / riskTotal) * 100} 
                  className="w-24 h-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Loan Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Loan Status Distribution</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-blue-50 rounded">
              <Clock className="h-4 w-4 mx-auto text-blue-500 mb-1" />
              <p className="text-xl font-bold">{stats.loanStats.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <CheckCircle className="h-4 w-4 mx-auto text-green-500 mb-1" />
              <p className="text-xl font-bold">{stats.loanStats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="text-center p-2 bg-red-50 rounded">
              <XCircle className="h-4 w-4 mx-auto text-red-500 mb-1" />
              <p className="text-xl font-bold">{stats.loanStats.defaulted}</p>
              <p className="text-xs text-muted-foreground">Defaulted</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}