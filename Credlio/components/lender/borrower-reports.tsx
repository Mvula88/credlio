"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Search,
  User,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calculator,
  FileText,
  Loader2,
} from "lucide-react"
import { AffordabilityCalculator } from "./affordability-calculator"
import { BorrowerReportView } from "./borrower-report-view"
import type { BorrowerReputation, BorrowerReport } from "@/lib/types/bureau"

interface BorrowerReportsSectionProps {
  lenderId: string
  subscriptionTier: number
}

export function BorrowerReportsSection({
  lenderId,
  subscriptionTier,
}: BorrowerReportsSectionProps) {
  const [borrowers, setBorrowers] = useState<BorrowerReputation[]>([])
  const [filteredBorrowers, setFilteredBorrowers] = useState<BorrowerReputation[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(null)
  const [showCalculator, setShowCalculator] = useState(false)
  const [calculatorBorrowerId, setCalculatorBorrowerId] = useState<string | null>(null)
  const [reportUsage, setReportUsage] = useState({ used: 0, limit: 0 })
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchBorrowers()
    fetchReportUsage()
  }, [])

  useEffect(() => {
    const filtered = borrowers.filter(
      (borrower) =>
        borrower.borrower?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        borrower.borrower?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredBorrowers(filtered)
  }, [searchQuery, borrowers])

  async function fetchBorrowers() {
    try {
      // Get connected borrowers
      const { data: connections } = await supabase
        .from("lender_borrower_connections")
        .select(
          `
          borrower_id,
          borrower:profiles!borrower_id(
            id,
            full_name,
            email
          )
        `
        )
        .eq("lender_id", lenderId)

      if (!connections) return

      // Get reputation data for connected borrowers
      const borrowerIds = connections.map((c) => c.borrower_id)
      const { data: reputations } = await supabase
        .from("borrower_reputation")
        .select("*")
        .in("borrower_id", borrowerIds)

      // Combine data
      const combinedData =
        reputations?.map((rep) => ({
          ...rep,
          borrower: connections.find((c) => c.borrower_id === rep.borrower_id)?.borrower,
        })) || []

      setBorrowers(combinedData)
      setFilteredBorrowers(combinedData)
    } catch (error) {
      console.error("Error fetching borrowers:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchReportUsage() {
    try {
      // Get subscription plan details
      const { data: subscription } = await supabase
        .from("lender_subscriptions")
        .select(
          `
          plan:subscription_plans(
            features
          )
        `
        )
        .eq("lender_id", lenderId)
        .eq("status", "active")
        .single()

      const limit = subscription?.plan?.features.max_reports_per_month || 0

      // Count reports viewed this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from("report_views")
        .select("*", { count: "exact", head: true })
        .eq("lender_id", lenderId)
        .gte("viewed_at", startOfMonth.toISOString())

      setReportUsage({ used: count || 0, limit })
    } catch (error) {
      console.error("Error fetching report usage:", error)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "GOOD":
        return "text-green-600 bg-green-50"
      case "MODERATE":
        return "text-yellow-600 bg-yellow-50"
      case "BAD":
        return "text-red-600 bg-red-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const getScoreIcon = (score: number) => {
    if (score >= 75) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (score >= 40) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <TrendingDown className="h-4 w-4 text-red-600" />
  }

  const canViewReport = () => {
    return reportUsage.limit === -1 || reportUsage.used < reportUsage.limit
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Borrower Reports</CardTitle>
              <CardDescription>
                Search and view detailed borrower reputation reports
              </CardDescription>
            </div>
            {reportUsage.limit !== -1 && (
              <Badge variant="secondary">
                {reportUsage.used} / {reportUsage.limit} reports used
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Borrowers List */}
          <div className="space-y-3">
            {filteredBorrowers.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No borrowers found. Invite borrowers to start building their reputation history.
                </AlertDescription>
              </Alert>
            ) : (
              filteredBorrowers.map((borrower) => (
                <div
                  key={borrower.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">{borrower.borrower?.full_name || "Unknown"}</p>
                      <p className="text-sm text-gray-600">{borrower.borrower?.email}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {getScoreIcon(borrower.reputation_score)}
                        <span className="text-sm font-medium">
                          Score: {borrower.reputation_score.toFixed(0)}/100
                        </span>
                        <Badge className={getCategoryColor(borrower.reputation_category)}>
                          {borrower.reputation_category}
                        </Badge>
                        {borrower.is_blacklisted && (
                          <Badge variant="destructive">Blacklisted</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCalculatorBorrowerId(borrower.borrower_id)
                        setShowCalculator(true)
                      }}
                    >
                      <Calculator className="mr-1 h-4 w-4" />
                      Calculate
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setSelectedBorrowerId(borrower.borrower_id)}
                      disabled={!canViewReport()}
                    >
                      <FileText className="mr-1 h-4 w-4" />
                      View Report
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {!canViewReport() && reportUsage.limit !== -1 && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You've reached your monthly report limit. Upgrade to Premium for unlimited reports.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Affordability Calculator Dialog */}
      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Affordability Calculator</DialogTitle>
            <DialogDescription>
              Calculate the borrower's affordability and risk assessment
            </DialogDescription>
          </DialogHeader>
          {calculatorBorrowerId && (
            <AffordabilityCalculator
              borrowerId={calculatorBorrowerId}
              onClose={() => setShowCalculator(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Borrower Report Dialog */}
      <Dialog open={!!selectedBorrowerId} onOpenChange={() => setSelectedBorrowerId(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Borrower Reputation Report</DialogTitle>
            <DialogDescription>
              Comprehensive reputation and credit history analysis
            </DialogDescription>
          </DialogHeader>
          {selectedBorrowerId && (
            <BorrowerReportView
              borrowerId={selectedBorrowerId}
              lenderId={lenderId}
              onClose={() => {
                setSelectedBorrowerId(null)
                fetchReportUsage() // Refresh usage count
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
