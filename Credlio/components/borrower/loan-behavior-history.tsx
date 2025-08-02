"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  User,
  Loader2,
} from "lucide-react"
import type { LoanTracker, Repayment } from "@/lib/types/bureau"
import { Timeline } from "@/components/ui/timeline"

interface LoanBehaviorHistoryProps {
  borrowerId: string
}

export function LoanBehaviorHistory({ borrowerId }: LoanBehaviorHistoryProps) {
  const [activeLoans, setActiveLoans] = useState<LoanTracker[]>([])
  const [completedLoans, setCompletedLoans] = useState<LoanTracker[]>([])
  const [repaymentHistory, setRepaymentHistory] = useState<Repayment[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchLoanData()
  }, [borrowerId])

  async function fetchLoanData() {
    try {
      // Fetch active loans
      const { data: active } = await supabase
        .from("loan_trackers")
        .select(
          `
          *,
          lender:profiles!lender_id(
            id,
            full_name,
            email
          )
        `
        )
        .eq("borrower_id", borrowerId)
        .in("status", ["active", "overdue"])
        .order("created_at", { ascending: false })

      setActiveLoans(active || [])

      // Fetch completed loans
      const { data: completed } = await supabase
        .from("loan_trackers")
        .select(
          `
          *,
          lender:profiles!lender_id(
            id,
            full_name,
            email
          )
        `
        )
        .eq("borrower_id", borrowerId)
        .in("status", ["completed", "defaulted"])
        .order("completed_at", { ascending: false })
        .limit(20)

      setCompletedLoans(completed || [])

      // Fetch repayment history
      const { data: payments } = await supabase
        .from("repayments")
        .select("*")
        .eq("borrower_id", borrowerId)
        .order("payment_date", { ascending: false })
        .limit(50)

      setRepaymentHistory(payments || [])
    } catch (error) {
      console.error("Error fetching loan data:", error)
    } finally {
      setLoading(false)
    }
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

  const getDaysUntilPayment = (date: string) => {
    const paymentDate = new Date(date)
    const today = new Date()
    const diffTime = paymentDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getPaymentStatusBadge = (status: string) => {
    const config = {
      on_time: {
        label: "On Time",
        color: "bg-green-100 text-green-800",
        icon: <CheckCircle className="h-3 w-3" />,
      },
      late: {
        label: "Late",
        color: "bg-yellow-100 text-yellow-800",
        icon: <Clock className="h-3 w-3" />,
      },
      very_late: {
        label: "Very Late",
        color: "bg-red-100 text-red-800",
        icon: <XCircle className="h-3 w-3" />,
      },
      partial: {
        label: "Partial",
        color: "bg-orange-100 text-orange-800",
        icon: <AlertTriangle className="h-3 w-3" />,
      },
    }

    const { label, color, icon } = config[status as keyof typeof config] || config.on_time

    return (
      <Badge className={`${color} flex items-center gap-1`}>
        {icon}
        {label}
      </Badge>
    )
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
    <Card>
      <CardHeader>
        <CardTitle>Loan Behavior History</CardTitle>
        <CardDescription>Track your active loans and payment history</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="active">Active Loans ({activeLoans.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedLoans.length})</TabsTrigger>
            <TabsTrigger value="payments">Payments ({repaymentHistory.length})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeLoans.length === 0 ? (
              <Alert>
                <AlertDescription>You don't have any active loans</AlertDescription>
              </Alert>
            ) : (
              activeLoans.map((loan) => {
                const progress = (loan.amount_paid / loan.total_amount) * 100
                const daysUntilPayment = loan.next_payment_date
                  ? getDaysUntilPayment(loan.next_payment_date)
                  : 0

                return (
                  <Card key={loan.id} className={loan.status === "overdue" ? "border-red-200" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            Loan from {loan.lender?.full_name || "Unknown"}
                          </CardTitle>
                          <CardDescription>
                            Started on {formatDate(loan.created_at)}
                          </CardDescription>
                        </div>
                        <Badge variant={loan.status === "overdue" ? "destructive" : "default"}>
                          {loan.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Principal</p>
                          <p className="font-medium">{formatCurrency(loan.principal_amount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total to Repay</p>
                          <p className="font-medium">{formatCurrency(loan.total_amount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Amount Paid</p>
                          <p className="font-medium text-green-600">
                            {formatCurrency(loan.amount_paid)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Remaining</p>
                          <p className="font-medium">
                            {formatCurrency(loan.total_amount - loan.amount_paid)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {loan.next_payment_date && (
                        <Alert
                          className={
                            daysUntilPayment < 0
                              ? "border-red-200 bg-red-50"
                              : daysUntilPayment <= 7
                                ? "border-yellow-200 bg-yellow-50"
                                : ""
                          }
                        >
                          <Calendar className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Next Payment:</strong>{" "}
                            {formatCurrency(loan.next_payment_amount || 0)} due on{" "}
                            {formatDate(loan.next_payment_date)}
                            {daysUntilPayment < 0 &&
                              ` (${Math.abs(daysUntilPayment)} days overdue)`}
                            {daysUntilPayment >= 0 &&
                              daysUntilPayment <= 7 &&
                              ` (in ${daysUntilPayment} days)`}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedLoans.length === 0 ? (
              <Alert>
                <AlertDescription>You haven't completed any loans yet</AlertDescription>
              </Alert>
            ) : (
              completedLoans.map((loan) => (
                <Card
                  key={loan.id}
                  className={loan.status === "defaulted" ? "border-red-200" : "border-green-200"}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Loan from {loan.lender?.full_name || "Unknown"}
                        </CardTitle>
                        <CardDescription>
                          {formatDate(loan.created_at)} -{" "}
                          {loan.completed_at ? formatDate(loan.completed_at) : "N/A"}
                        </CardDescription>
                      </div>
                      <Badge variant={loan.status === "completed" ? "default" : "destructive"}>
                        {loan.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Amount Borrowed</p>
                        <p className="font-medium">{formatCurrency(loan.principal_amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Repaid</p>
                        <p className="font-medium">{formatCurrency(loan.amount_paid)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Interest Rate</p>
                        <p className="font-medium">{loan.interest_rate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="payments" className="space-y-2">
            {repaymentHistory.length === 0 ? (
              <Alert>
                <AlertDescription>No payment history found</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {repaymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          Paid on {formatDate(payment.payment_date)}
                          {payment.days_late > 0 && ` (${payment.days_late} days late)`}
                        </p>
                      </div>
                    </div>
                    {getPaymentStatusBadge(payment.status)}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            {(() => {
              // Combine all loan and payment events for timeline
              const timelineEvents = []

              // Add loan start events
              ;[...activeLoans, ...completedLoans].forEach((loan) => {
                timelineEvents.push({
                  id: `loan-start-${loan.id}`,
                  title: `Loan from ${loan.lender?.full_name || "Unknown"}`,
                  description: `Borrowed ${formatCurrency(loan.principal_amount)} at ${loan.interest_rate}% interest`,
                  date: loan.created_at,
                  amount: loan.principal_amount,
                  status: "completed" as const,
                  icon: <DollarSign className="h-3 w-3" />,
                  badge: {
                    text: "Started",
                    variant: "secondary" as const,
                  },
                })

                // Add completion events
                if (loan.completed_at) {
                  timelineEvents.push({
                    id: `loan-end-${loan.id}`,
                    title: `Loan ${loan.status === "completed" ? "Completed" : "Defaulted"}`,
                    description: `${loan.status === "completed" ? "Successfully repaid" : "Failed to complete"} loan from ${loan.lender?.full_name || "Unknown"}`,
                    date: loan.completed_at,
                    amount: loan.amount_paid,
                    status:
                      loan.status === "completed" ? ("completed" as const) : ("overdue" as const),
                    icon:
                      loan.status === "completed" ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      ),
                    badge: {
                      text: loan.status === "completed" ? "Completed" : "Defaulted",
                      variant:
                        loan.status === "completed"
                          ? ("default" as const)
                          : ("destructive" as const),
                    },
                  })
                }
              })

              // Add payment events
              repaymentHistory.slice(0, 20).forEach((payment) => {
                const status = payment.days_late > 0 ? "overdue" : "completed"
                timelineEvents.push({
                  id: `payment-${payment.id}`,
                  title: `Payment Made`,
                  description: `${payment.days_late > 0 ? `Late payment (${payment.days_late} days)` : "On-time payment"}`,
                  date: payment.payment_date,
                  amount: payment.amount,
                  status: status as const,
                  icon: <DollarSign className="h-3 w-3" />,
                  badge:
                    payment.days_late > 0
                      ? {
                          text: `${payment.days_late}d late`,
                          variant: "destructive" as const,
                        }
                      : {
                          text: "On time",
                          variant: "default" as const,
                        },
                })
              })

              // Sort by date (newest first)
              timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

              return timelineEvents.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  <Timeline items={timelineEvents} />
                </div>
              ) : (
                <Alert>
                  <AlertDescription>No activity to display in timeline</AlertDescription>
                </Alert>
              )
            })()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
