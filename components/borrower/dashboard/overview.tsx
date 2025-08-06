"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Star,
  FileText,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Activity,
  Target,
  Award,
  Bell,
  ChevronRight
} from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

interface BorrowerOverviewProps {
  profile: any
  metrics: {
    creditScore: number
    reputationScore: number
    totalLoans: number
    activeLoans: number
    totalBorrowed: number
    totalRepaid: number
    onTimePaymentRate: number
    nextPaymentAmount: number
    nextPaymentDays: number | null
    pendingRequests: number
    totalOffers: number
  }
  activeLoans: any[]
  recentPayments: any[]
  pendingRequests: any[]
  notifications: any[]
  creditHistory: any[]
}

export function BorrowerOverview({
  profile,
  metrics,
  activeLoans,
  recentPayments,
  pendingRequests,
  notifications,
  creditHistory
}: BorrowerOverviewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("month")

  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return "text-green-600 bg-green-100"
    if (score >= 650) return "text-blue-600 bg-blue-100"
    if (score >= 550) return "text-yellow-600 bg-yellow-100"
    return "text-red-600 bg-red-100"
  }

  const getCreditScoreLabel = (score: number) => {
    if (score >= 750) return "Excellent"
    if (score >= 650) return "Good"
    if (score >= 550) return "Fair"
    return "Poor"
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const calculateRepaymentProgress = (loan: any) => {
    if (!loan.repayments || loan.repayments.length === 0) return 0
    const totalRepaid = loan.repayments.reduce((sum: number, payment: any) => 
      payment.status === "completed" ? sum + payment.amount : sum, 0
    )
    const totalAmount = loan.amount * (1 + (loan.interest_rate || 0) / 100)
    return Math.min((totalRepaid / totalAmount) * 100, 100)
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile.full_name?.split(" ")[0] || "Borrower"}
          </h1>
          <p className="mt-2 text-gray-600">
            Track your loans and build your credit reputation
          </p>
        </div>
        <Link href="/borrower/dashboard/requests/new">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            New Loan Request
          </Button>
        </Link>
      </div>

      {/* Credit Score Card */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle>Your Credit Score</CardTitle>
          <CardDescription>
            Build your reputation with every successful loan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold">{metrics.creditScore}</span>
                <Badge className={getCreditScoreColor(metrics.creditScore)}>
                  {getCreditScoreLabel(metrics.creditScore)}
                </Badge>
              </div>
              <Progress value={(metrics.creditScore / 850) * 100} className="h-3 w-64" />
              <p className="text-sm text-gray-600">
                {metrics.creditScore >= 650 
                  ? "Great job! Keep making on-time payments"
                  : "Improve your score with consistent payments"}
              </p>
            </div>
            <div className="text-right space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" />
                <span>Reputation: {metrics.reputationScore}/100</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4" />
                <span>On-time: {metrics.onTimePaymentRate}%</span>
              </div>
              <Link href="/borrower/dashboard/reputation/score">
                <Button variant="outline" size="sm">View Details</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeLoans}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(activeLoans.reduce((sum, loan) => sum + loan.amount, 0))} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metrics.nextPaymentDays !== null ? (
              <>
                <div className="text-2xl font-bold">
                  {metrics.nextPaymentDays} days
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(metrics.nextPaymentAmount)} due
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">No payments due</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loan Offers</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOffers}</div>
            <p className="text-xs text-muted-foreground">
              On {metrics.pendingRequests} requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Repaid</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRepaid)}</div>
            <p className="text-xs text-muted-foreground">
              Of {formatCurrency(metrics.totalBorrowed)} borrowed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Payments Alert */}
      {metrics.nextPaymentDays !== null && metrics.nextPaymentDays <= 7 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">Payment Due Soon!</span>
                <p className="text-sm mt-1">
                  You have a payment of {formatCurrency(metrics.nextPaymentAmount)} due in {metrics.nextPaymentDays} days
                </p>
              </div>
              <Link href="/borrower/dashboard/loans/repayments">
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                  Make Payment
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Loans */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Loans</CardTitle>
                <CardDescription>Your current loan obligations</CardDescription>
              </div>
              <Link href="/borrower/dashboard/loans/active">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {activeLoans.length > 0 ? (
              <div className="space-y-4">
                {activeLoans.slice(0, 3).map((loan) => {
                  const progress = calculateRepaymentProgress(loan)
                  return (
                    <div key={loan.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                            {loan.lender?.company_name?.charAt(0) || loan.lender?.full_name?.charAt(0) || "L"}
                          </div>
                          <div>
                            <p className="font-medium">
                              {loan.lender?.company_name || loan.lender?.full_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatCurrency(loan.amount)} at {loan.interest_rate}%
                            </p>
                          </div>
                        </div>
                        <Badge variant={loan.status === "overdue" ? "destructive" : "default"}>
                          {loan.status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Repayment Progress</span>
                          <span className="font-medium">{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No active loans</p>
                <Link href="/borrower/dashboard/requests/new">
                  <Button variant="outline" size="sm" className="mt-4">
                    Create Loan Request
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Your payment history</CardDescription>
              </div>
              <Link href="/borrower/dashboard/loans/repayments">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentPayments.length > 0 ? (
              <div className="space-y-3">
                {recentPayments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">
                          {payment.loan?.lender?.company_name || payment.loan?.lender?.full_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(payment.payment_date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      {getPaymentStatusBadge(payment.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No recent payments</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Loan Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Loan Requests</CardTitle>
                <CardDescription>Review offers from lenders</CardDescription>
              </div>
              <Link href="/borrower/dashboard/requests/my-requests">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          {formatCurrency(request.amount)}
                        </span>
                        {request.offers?.[0]?.count > 0 && (
                          <Badge className="bg-green-100 text-green-800">
                            {request.offers[0].count} offers
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{request.purpose}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Duration:</span>
                        <span>{request.duration_months} months</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Interest:</span>
                        <span>{request.interest_rate}% p.a.</span>
                      </div>
                      <Link href={`/borrower/dashboard/requests/offers?request=${request.id}`}>
                        <Button size="sm" className="w-full mt-3">
                          {request.offers?.[0]?.count > 0 ? "View Offers" : "View Details"}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Link href="/borrower/dashboard/requests/new">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Plus className="h-4 w-4" />
                New Request
              </Button>
            </Link>
            <Link href="/borrower/dashboard/loans/repayments">
              <Button variant="outline" className="w-full justify-start gap-2">
                <DollarSign className="h-4 w-4" />
                Make Payment
              </Button>
            </Link>
            <Link href="/borrower/dashboard/documents">
              <Button variant="outline" className="w-full justify-start gap-2">
                <FileText className="h-4 w-4" />
                Upload Documents
              </Button>
            </Link>
            <Link href="/borrower/dashboard/reputation/score">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Star className="h-4 w-4" />
                View Score
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}