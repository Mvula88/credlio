"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DollarSign,
  TrendingUp,
  Users,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Activity,
  Shield,
  FileText,
  Calculator,
  Search,
  UserPlus,
  Bell,
  CreditCard,
  Building2,
  Target,
  Zap
} from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

interface LenderOverviewProps {
  profile: any
  metrics: {
    totalLoans: number
    activeLoans: number
    totalDeployed: number
    totalRepaid: number
    repaymentRate: number
    averageLoanSize: number
    totalBorrowers: number
    overdueLoans: number
    portfolioRisk: string
    monthlyGrowth: number
  }
  recentLoans: any[]
  recentRepayments: any[]
  notifications: any[]
  subscription: any
}

export function LenderOverview({
  profile,
  metrics,
  recentLoans,
  recentRepayments,
  notifications,
  subscription
}: LenderOverviewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("month")

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "low":
        return "text-green-600 bg-green-100"
      case "medium":
        return "text-yellow-600 bg-yellow-100"
      case "high":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
      case "completed":
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Completed</Badge>
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>
      case "defaulted":
        return <Badge variant="destructive">Defaulted</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile.full_name?.split(" ")[0] || "Lender"}
          </h1>
          <p className="mt-2 text-gray-600">
            Here's an overview of your lending portfolio
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/lender/report-defaulter">
            <Button variant="destructive" size="lg" className="gap-2">
              <AlertCircle className="h-5 w-5" />
              Report Defaulter
            </Button>
          </Link>
          <Link href="/lender/dashboard/borrowers/search">
            <Button variant="outline" size="lg" className="gap-2">
              <Search className="h-5 w-5" />
              Search Borrower
            </Button>
          </Link>
          <Link href="/lender/dashboard/borrowers/invite">
            <Button size="lg" className="gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Borrower
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deployed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalDeployed)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metrics.monthlyGrowth > 0 ? (
                <>
                  <ArrowUpRight className="mr-1 h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{metrics.monthlyGrowth}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="mr-1 h-3 w-3 text-red-600" />
                  <span className="text-red-600">{metrics.monthlyGrowth}%</span>
                </>
              )}
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeLoans}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.overdueLoans > 0 && (
                <span className="text-amber-600">{metrics.overdueLoans} overdue</span>
              )}
              {metrics.overdueLoans === 0 && "All on track"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repayment Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.repaymentRate}%</div>
            <Progress value={metrics.repaymentRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Risk</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className={getRiskColor(metrics.portfolioRisk)}>
                {metrics.portfolioRisk.toUpperCase()}
              </Badge>
              <Link href="/lender/dashboard/risk/overview">
                <Button variant="ghost" size="sm">View Details</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Alert */}
      {!subscription && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                  <CreditCard className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <CardTitle>Unlock Full Features</CardTitle>
                  <CardDescription>
                    Start your free trial and access unlimited credit reports
                  </CardDescription>
                </div>
              </div>
              <Link href="/lender/subscribe">
                <Button size="lg" className="bg-amber-600 hover:bg-amber-700">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio Overview</TabsTrigger>
          <TabsTrigger value="features">Risk & Verification</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="notifications">
            Notifications
            {notifications.length > 0 && (
              <Badge className="ml-2" variant="destructive">
                {notifications.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Recent Loans */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Loans</CardTitle>
                <CardDescription>Your latest lending activity</CardDescription>
              </CardHeader>
              <CardContent>
                {recentLoans.length > 0 ? (
                  <div className="space-y-4">
                    {recentLoans.map((loan) => (
                      <div key={loan.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                            {loan.borrower?.full_name?.charAt(0) || "B"}
                          </div>
                          <div>
                            <p className="font-medium">{loan.borrower?.full_name || "Unknown"}</p>
                            <p className="text-sm text-gray-500">
                              {formatCurrency(loan.amount)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(loan.status)}
                          <p className="mt-1 text-xs text-gray-500">
                            {formatDate(loan.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500">No recent loans</p>
                )}
                <Link href="/lender/dashboard/loans/active">
                  <Button variant="outline" className="mt-4 w-full">
                    View All Loans
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Recent Repayments */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Repayments</CardTitle>
                <CardDescription>Latest payments received</CardDescription>
              </CardHeader>
              <CardContent>
                {recentRepayments.length > 0 ? (
                  <div className="space-y-4">
                    {recentRepayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">
                              {payment.loan?.borrower?.full_name || "Unknown"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatCurrency(payment.amount)}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">
                          {formatDate(payment.payment_date)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500">No recent repayments</p>
                )}
                <Link href="/lender/dashboard/loans/repayments">
                  <Button variant="outline" className="mt-4 w-full">
                    View All Repayments
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Short-term (&lt; 30 days)</span>
                      <span className="text-sm font-medium">35%</span>
                    </div>
                    <Progress value={35} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Medium-term (30-90 days)</span>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Long-term (&gt; 90 days)</span>
                      <span className="text-sm font-medium">20%</span>
                    </div>
                    <Progress value={20} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Borrower Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Business Loans</span>
                    <Badge>{Math.floor(metrics.totalLoans * 0.6)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Personal Loans</span>
                    <Badge>{Math.floor(metrics.totalLoans * 0.3)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Emergency Loans</span>
                    <Badge>{Math.floor(metrics.totalLoans * 0.1)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Loan Size</span>
                    <span className="font-medium">{formatCurrency(metrics.averageLoanSize)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Borrowers</span>
                    <span className="font-medium">{metrics.totalBorrowers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Repaid</span>
                    <span className="font-medium">{formatCurrency(metrics.totalRepaid)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Document Verification */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Document Verification</CardTitle>
                    <CardDescription>
                      Verify borrower documents before approval
                    </CardDescription>
                  </div>
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Advanced document verification system to ensure authenticity of borrower documents.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      ID/Passport Verification
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Proof of Income Validation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Bank Statement Analysis
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      WhatsApp Call Verification
                    </li>
                  </ul>
                  <Link href="/lender/new-verification">
                    <Button className="w-full mt-4">Start Verification</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Blacklist Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Blacklist System</CardTitle>
                    <CardDescription>
                      Manage risky and defaulted borrowers
                    </CardDescription>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Comprehensive blacklist system to protect your investments.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      Auto-blacklist after 7 days default
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      Risk score tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      Cross-lender reporting
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      Deregistration requests
                    </li>
                  </ul>
                  <Link href="/lender/dashboard/risk/blacklist">
                    <Button variant="destructive" className="w-full mt-4">Manage Blacklist</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Loan Agreement Generation */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Loan Agreements</CardTitle>
                    <CardDescription>
                      Generate legally binding agreements
                    </CardDescription>
                  </div>
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Create professional loan agreements with strong legal protection.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Customizable terms & conditions
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Digital signature support
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Auto-blacklist warnings
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Legal action clauses
                    </li>
                  </ul>
                  <Link href="/lender/requests">
                    <Button variant="outline" className="w-full mt-4">View Loan Requests</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Loan Approval Checklist */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Approval Checklist</CardTitle>
                    <CardDescription>
                      Comprehensive verification before approval
                    </CardDescription>
                  </div>
                  <Target className="h-8 w-8 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Complete checklist system to ensure safe lending decisions.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Identity verification
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Credit history check
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      WhatsApp call recording
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Risk assessment score
                    </li>
                  </ul>
                  <Link href="/lender/approve/pending">
                    <Button variant="outline" className="w-full mt-4">Review Pending Approvals</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lending Analytics</CardTitle>
              <CardDescription>
                Detailed insights into your lending performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Monthly Trends</h4>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-12 w-12 text-gray-400" />
                    <span className="ml-2 text-gray-500">Chart visualization here</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Quick Stats</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-gray-500">Default Rate</p>
                      <p className="text-xl font-bold">2.3%</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-gray-500">Avg. Interest</p>
                      <p className="text-xl font-bold">12.5%</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-gray-500">Repeat Borrowers</p>
                      <p className="text-xl font-bold">68%</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-gray-500">Avg. Duration</p>
                      <p className="text-xl font-bold">45 days</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Stay updated with your lending activity</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <Bell className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-gray-600">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No new notifications
                </p>
              )}
              <Link href="/lender/dashboard/notifications">
                <Button variant="outline" className="mt-4 w-full">
                  View All Notifications
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Link href="/lender/new-verification">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Shield className="h-4 w-4" />
                Document Verification
              </Button>
            </Link>
            <Link href="/lender/dashboard/risk/blacklist">
              <Button variant="outline" className="w-full justify-start gap-2">
                <XCircle className="h-4 w-4" />
                Blacklist Management
              </Button>
            </Link>
            <Link href="/lender/approve/pending">
              <Button variant="outline" className="w-full justify-start gap-2">
                <CheckCircle className="h-4 w-4" />
                Loan Approvals
              </Button>
            </Link>
            <Link href="/lender/deregistration-requests">
              <Button variant="outline" className="w-full justify-start gap-2">
                <UserPlus className="h-4 w-4" />
                Deregistration Requests
              </Button>
            </Link>
            <Link href="/lender/dashboard/borrowers/search">
              <Button variant="outline" className="w-full justify-start gap-2">
                <FileText className="h-4 w-4" />
                Check Credit Report
              </Button>
            </Link>
            <Link href="/lender/dashboard/risk/calculator">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Calculator className="h-4 w-4" />
                Risk Calculator
              </Button>
            </Link>
            <Link href="/lender/dashboard/marketplace">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" />
                Browse Marketplace
              </Button>
            </Link>
            <Link href="/lender/loans/generate-agreement">
              <Button variant="outline" className="w-full justify-start gap-2">
                <FileText className="h-4 w-4" />
                Generate Agreement
              </Button>
            </Link>
            <Link href="/lender/watchlist">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Target className="h-4 w-4" />
                Manage Watchlist
              </Button>
            </Link>
            <Link href="/lender/report-defaulter">
              <Button variant="outline" className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:border-red-300">
                <AlertCircle className="h-4 w-4" />
                Report Defaulter
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}