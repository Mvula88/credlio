"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  User,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react"
import type { BorrowerReport, Repayment, LoanTracker, Blacklist } from "@/lib/types/bureau"

interface BorrowerReportViewProps {
  borrowerId: string
  lenderId: string
  onClose?: () => void
}

export function BorrowerReportView({ borrowerId, lenderId, onClose }: BorrowerReportViewProps) {
  const [report, setReport] = useState<BorrowerReport | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchReport()
  }, [borrowerId])

  async function fetchReport() {
    try {
      // Log report view
      await supabase.from("report_views").insert({
        lender_id: lenderId,
        borrower_id: borrowerId,
        viewed_at: new Date().toISOString(),
      })

      // Fetch borrower profile
      const { data: borrowerData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", borrowerId)
        .single()

      // Fetch reputation
      const { data: reputation } = await supabase
        .from("borrower_reputation")
        .select("*")
        .eq("borrower_id", borrowerId)
        .single()

      // Fetch affordability metrics
      const { data: affordability } = await supabase
        .from("affordability_metrics")
        .select("*")
        .eq("borrower_id", borrowerId)
        .single()

      // Fetch active loans
      const { data: activeLoans } = await supabase
        .from("loan_trackers")
        .select(
          `
          *,
          lender:profiles!lender_id(id, full_name, email)
        `
        )
        .eq("borrower_id", borrowerId)
        .eq("status", "active")

      // Fetch repayment history
      const { data: repayments } = await supabase
        .from("repayments")
        .select("*")
        .eq("borrower_id", borrowerId)
        .order("payment_date", { ascending: false })
        .limit(50)

      // Fetch blacklist entries
      const { data: blacklistEntries } = await supabase
        .from("blacklists")
        .select(
          `
          *,
          blacklisted_by_profile:profiles!blacklisted_by(id, full_name, email)
        `
        )
        .eq("borrower_id", borrowerId)

      // Calculate risk assessment
      const riskAssessment = calculateRiskAssessment(reputation, affordability, activeLoans || [])

      setReport({
        borrower: borrowerData,
        reputation: reputation || createDefaultReputation(borrowerId),
        affordability,
        active_loans: activeLoans || [],
        repayment_history: repayments || [],
        blacklist_entries: blacklistEntries || [],
        risk_assessment: riskAssessment,
      })
    } catch (error) {
      console.error("Error fetching report:", error)
    } finally {
      setLoading(false)
    }
  }

  function createDefaultReputation(borrowerId: string): any {
    return {
      borrower_id: borrowerId,
      total_loans: 0,
      completed_loans: 0,
      active_loans: 0,
      defaulted_loans: 0,
      on_time_payments: 0,
      late_payments: 0,
      very_late_payments: 0,
      total_borrowed: 0,
      total_repaid: 0,
      average_days_late: 0,
      reputation_score: 50,
      reputation_category: "MODERATE",
      is_blacklisted: false,
      blacklist_count: 0,
    }
  }

  function calculateRiskAssessment(reputation: any, affordability: any, activeLoans: any[]) {
    const factors = []
    let overallRisk: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM"

    // Reputation factors
    if (reputation.reputation_score >= 75) {
      factors.push({
        factor: "High reputation score",
        impact: "POSITIVE" as const,
        description: "Excellent payment history",
      })
    } else if (reputation.reputation_score < 40) {
      factors.push({
        factor: "Low reputation score",
        impact: "NEGATIVE" as const,
        description: "Poor payment history",
      })
    }

    if (reputation.is_blacklisted) {
      factors.push({
        factor: "Blacklisted",
        impact: "NEGATIVE" as const,
        description: "Previously defaulted on loans",
      })
    }

    if (reputation.defaulted_loans > 0) {
      factors.push({
        factor: "Previous defaults",
        impact: "NEGATIVE" as const,
        description: `${reputation.defaulted_loans} defaulted loans`,
      })
    }

    // Affordability factors
    if (affordability) {
      if (affordability.debt_to_income_ratio > 50) {
        factors.push({
          factor: "High debt-to-income ratio",
          impact: "NEGATIVE" as const,
          description: "Over 50% of income goes to debt",
        })
      } else if (affordability.debt_to_income_ratio < 20) {
        factors.push({
          factor: "Low debt-to-income ratio",
          impact: "POSITIVE" as const,
          description: "Healthy financial position",
        })
      }

      if (affordability.disposable_income < 500) {
        factors.push({
          factor: "Low disposable income",
          impact: "NEGATIVE" as const,
          description: "Limited repayment capacity",
        })
      }
    }

    // Active loans
    if (activeLoans.length > 3) {
      factors.push({
        factor: "Multiple active loans",
        impact: "NEGATIVE" as const,
        description: `${activeLoans.length} active loans`,
      })
    }

    // Determine overall risk
    const negativeFactors = factors.filter((f) => f.impact === "NEGATIVE").length
    const positiveFactors = factors.filter((f) => f.impact === "POSITIVE").length

    if (negativeFactors > 2 || reputation.reputation_score < 40) {
      overallRisk = "HIGH"
    } else if (positiveFactors > negativeFactors && reputation.reputation_score >= 60) {
      overallRisk = "LOW"
    }

    const recommendations = []
    if (overallRisk === "HIGH") {
      recommendations.push("Consider requiring collateral or guarantor")
      recommendations.push("Offer smaller loan amounts initially")
      recommendations.push("Request additional documentation")
    } else if (overallRisk === "MEDIUM") {
      recommendations.push("Verify income sources before lending")
      recommendations.push("Consider shorter repayment periods")
    } else {
      recommendations.push("This borrower shows good creditworthiness")
      recommendations.push("Standard lending terms appropriate")
    }

    return { overall_risk: overallRisk, factors, recommendations }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!report) {
    return (
      <Alert>
        <AlertDescription>Unable to load borrower report</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <User className="h-8 w-8 text-gray-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">{report.borrower.full_name}</h3>
            <p className="text-gray-600">{report.borrower.email}</p>
            <p className="text-sm text-gray-500">
              Member since {formatDate(report.borrower.created_at)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{report.reputation.reputation_score}/100</p>
          <Badge
            className={
              report.reputation.reputation_category === "GOOD"
                ? "bg-green-100 text-green-800"
                : report.reputation.reputation_category === "MODERATE"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
            }
          >
            {report.reputation.reputation_category}
          </Badge>
        </div>
      </div>

      {/* Risk Assessment */}
      <Card
        className={
          report.risk_assessment.overall_risk === "HIGH"
            ? "border-red-200 bg-red-50"
            : report.risk_assessment.overall_risk === "MEDIUM"
              ? "border-yellow-200 bg-yellow-50"
              : "border-green-200 bg-green-50"
        }
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Risk Assessment: {report.risk_assessment.overall_risk}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {report.risk_assessment.factors.map((factor, idx) => (
              <div key={idx} className="flex items-start gap-2">
                {factor.impact === "POSITIVE" ? (
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 text-red-600" />
                )}
                <div>
                  <p className="font-medium">{factor.factor}</p>
                  <p className="text-sm text-gray-600">{factor.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-4">
            <p className="mb-2 font-medium">Recommendations:</p>
            <ul className="list-inside list-disc space-y-1">
              {report.risk_assessment.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="blacklist">Blacklist</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          {/* Loan Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Loan Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Loans</p>
                  <p className="text-2xl font-bold">{report.reputation.total_loans}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {report.reputation.completed_loans}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {report.reputation.active_loans}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Defaulted</p>
                  <p className="text-2xl font-bold text-red-600">
                    {report.reputation.defaulted_loans}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">On-Time Payments</p>
                    <p className="text-xl font-bold text-green-600">
                      {report.reputation.on_time_payments}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Late Payments</p>
                    <p className="text-xl font-bold text-yellow-600">
                      {report.reputation.late_payments}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Very Late</p>
                    <p className="text-xl font-bold text-red-600">
                      {report.reputation.very_late_payments}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Days Late</p>
                  <p className="text-xl font-bold">
                    {report.reputation.average_days_late.toFixed(1)} days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Borrowed</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(report.reputation.total_borrowed)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Repaid</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(report.reputation.total_repaid)}
                  </p>
                </div>
              </div>
              {report.affordability && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="mb-2 font-medium">Current Financial Status</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Income</p>
                      <p className="font-medium">
                        {formatCurrency(report.affordability.total_monthly_income)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Disposable Income</p>
                      <p className="font-medium">
                        {formatCurrency(report.affordability.disposable_income)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          {report.active_loans.length === 0 ? (
            <Alert>
              <AlertDescription>No active loans found</AlertDescription>
            </Alert>
          ) : (
            report.active_loans.map((loan) => (
              <Card key={loan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Loan from {loan.lender?.full_name || "Unknown Lender"}
                    </CardTitle>
                    <Badge>{loan.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Principal</p>
                      <p className="font-medium">{formatCurrency(loan.principal_amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="font-medium">{formatCurrency(loan.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount Paid</p>
                      <p className="font-medium">{formatCurrency(loan.amount_paid)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Next Payment</p>
                      <p className="font-medium">
                        {loan.next_payment_date ? formatDate(loan.next_payment_date) : "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {report.repayment_history.length === 0 ? (
            <Alert>
              <AlertDescription>No payment history found</AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.repayment_history.slice(0, 20).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between border-b py-2"
                    >
                      <div className="flex items-center gap-3">
                        {payment.status === "on_time" ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : payment.status === "late" ? (
                          <Clock className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">{formatCurrency(payment.amount)}</p>
                          <p className="text-sm text-gray-600">
                            Paid on {formatDate(payment.payment_date)}
                            {payment.days_late > 0 && ` (${payment.days_late} days late)`}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          payment.status === "on_time"
                            ? "default"
                            : payment.status === "late"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {payment.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="blacklist" className="space-y-4">
          {report.blacklist_entries.length === 0 ? (
            <Alert>
              <AlertDescription>No blacklist entries found</AlertDescription>
            </Alert>
          ) : (
            report.blacklist_entries.map((entry) => (
              <Card key={entry.id} className="border-red-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Blacklisted by {entry.blacklisted_by_profile?.full_name || "Unknown"}
                    </CardTitle>
                    <Badge variant="destructive">{entry.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Reason</p>
                      <p className="font-medium">{entry.reason.replace("_", " ")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{formatDate(entry.created_at)}</p>
                    </div>
                    {entry.total_amount_defaulted && (
                      <div>
                        <p className="text-sm text-muted-foreground">Amount Defaulted</p>
                        <p className="font-medium">
                          {formatCurrency(entry.total_amount_defaulted)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
