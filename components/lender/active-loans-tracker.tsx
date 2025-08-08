"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Calendar,
  DollarSign,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react"
import type { LoanTracker } from "@/lib/types/bureau"

interface ActiveLoansTrackerProps {
  lenderId: string
}

export function ActiveLoansTracker({ lenderId }: ActiveLoansTrackerProps) {
  const [loans, setLoans] = useState<LoanTracker[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchActiveLoans()

    // Set up real-time subscription
    const subscription = supabase
      .channel("active-loans")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "loan_trackers",
          filter: `lender_id=eq.${lenderId}`,
        },
        () => {
          fetchActiveLoans()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [lenderId])

  async function fetchActiveLoans() {
    try {
      const { data } = await supabase
        .from("loan_trackers")
        .select(
          `
          *,
          borrower:profiles!borrower_id(
            id,
            full_name,
            email
          )
        `
        )
        .eq("lender_id", lenderId)
        .in("status", ["active", "overdue"])
        .order("next_payment_date", { ascending: true })

      setLoans(data || [])
    } catch (error) {
      console.error("Error fetching loans:", error)
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

  const getPaymentStatus = (nextPaymentDate: string | null, status: string) => {
    if (!nextPaymentDate) return null

    const daysUntil = getDaysUntilPayment(nextPaymentDate)

    if (status === "overdue" || daysUntil < 0) {
      return {
        label: `${Math.abs(daysUntil)} days overdue`,
        color: "bg-red-100 text-red-800",
        icon: <XCircle className="h-3 w-3" />,
      }
    } else if (daysUntil <= 3) {
      return {
        label: `Due in ${daysUntil} days`,
        color: "bg-yellow-100 text-yellow-800",
        icon: <AlertTriangle className="h-3 w-3" />,
      }
    } else if (daysUntil <= 7) {
      return {
        label: `Due in ${daysUntil} days`,
        color: "bg-blue-100 text-blue-800",
        icon: <Clock className="h-3 w-3" />,
      }
    } else {
      return {
        label: `Due in ${daysUntil} days`,
        color: "bg-gray-100 text-gray-800",
        icon: <Calendar className="h-3 w-3" />,
      }
    }
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

  if (loans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Loans Tracker</CardTitle>
          <CardDescription>Monitor your active loans and upcoming payments</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>You don't have any active loans at the moment</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Loans Tracker</CardTitle>
        <CardDescription>
          Monitor your active loans and upcoming payments in real-time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loans.map((loan) => {
          const progress = (loan.amount_paid / loan.total_amount) * 100
          const paymentStatus = getPaymentStatus(loan.next_payment_date, loan.status)

          return (
            <div key={loan.id} className="space-y-3 rounded-lg border p-4">
              {/* Borrower Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">{loan.borrower?.full_name || "Unknown"}</p>
                    <p className="text-sm text-gray-600">{loan.borrower?.email}</p>
                  </div>
                </div>
                <Badge
                  variant={loan.status === "overdue" ? "destructive" : "default"}
                  className={loan.status === "overdue" ? "" : "bg-green-100 text-green-800"}
                >
                  {loan.status}
                </Badge>
              </div>

              {/* Loan Details */}
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Principal</p>
                  <p className="font-medium">{formatCurrency(loan.principal_amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Interest Rate</p>
                  <p className="font-medium">{loan.interest_rate}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="font-medium">{formatCurrency(loan.total_amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount Paid</p>
                  <p className="font-medium text-green-600">{formatCurrency(loan.amount_paid)}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Progress</span>
                  <span className="font-medium">{progress.toFixed(1)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Next Payment */}
              {loan.next_payment_date && (
                <div className="flex items-center justify-between border-t pt-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Next Payment</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(loan.next_payment_amount || 0)} due on{" "}
                        {formatDate(loan.next_payment_date)}
                      </p>
                    </div>
                  </div>
                  {paymentStatus && (
                    <Badge className={`${paymentStatus.color} flex items-center gap-1`}>
                      {paymentStatus.icon}
                      {paymentStatus.label}
                    </Badge>
                  )}
                </div>
              )}

              {/* Last Payment */}
              {loan.last_payment_date && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Last payment received on {formatDate(loan.last_payment_date)}</span>
                </div>
              )}
            </div>
          )
        })}

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Auto-Blacklisting:</strong> Borrowers with 3 or more missed payments will be
            automatically blacklisted. Track payments closely to ensure timely collection.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
