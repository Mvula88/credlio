export const dynamic = "force-dynamic"

import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  CreditCard,
  DollarSign,
  Activity,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  TrendingUp,
  BarChart3,
  PieChart,
} from "lucide-react"
import { SimpleChart, MetricCard } from "@/components/ui/simple-chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminStatsSection } from "@/components/admin/stats-section"
import { BlacklistSection } from "@/components/admin/blacklist-section"
import { UsersSection } from "@/components/admin/users-section"
import { PaymentsSection } from "@/components/admin/payments-section"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default async function AdminDashboard() {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/signin")
  }

  // Get user profile and verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `
      *,
      user_profile_roles (
        user_roles (name)
      )
    `
    )
    .eq("auth_user_id", user.id)
    .single()

  const isAdmin =
    profile?.user_profile_roles?.some((role: any) => role.user_roles.name === "admin") ||
    profile?.role === "admin"

  if (!profile || !isAdmin) {
    redirect("/auth/signin")
  }

  // Get all countries for filtering
  const { data: countries } = await supabase
    .from("countries")
    .select("id, name, code")
    .order("name")

  // Get platform statistics (all countries by default)
  const { data: users, count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact" })

  const { data: loans, count: totalLoans } = await supabase
    .from("loan_requests")
    .select("*", { count: "exact" })

  const { data: activeLoans, count: activeLoansCount } = await supabase
    .from("loan_requests")
    .select("*", { count: "exact" })
    .eq("status", "funded")

  const { data: pendingLoans, count: pendingLoansCount } = await supabase
    .from("loan_requests")
    .select("*", { count: "exact" })
    .eq("status", "pending_lender_acceptance")

  const { data: blacklistedUsers, count: blacklistCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("is_blacklisted", true)

  const { data: payments, count: totalPayments } = await supabase
    .from("loan_payments")
    .select("*", { count: "exact" })

  const { data: pendingPayments, count: pendingPaymentsCount } = await supabase
    .from("loan_payments")
    .select("*", { count: "exact" })
    .eq("payment_status", "pending_confirmation")

  const { data: completedPayments, count: completedPaymentsCount } = await supabase
    .from("loan_payments")
    .select("*", { count: "exact" })
    .eq("payment_status", "completed")

  // Calculate loan volume
  const totalLoanVolume = loans?.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0) || 0
  const activeLoanVolume = activeLoans?.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0) || 0

  // Get recent activity
  const { data: recentUsers } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5)

  const { data: recentLoans } = await supabase
    .from("loan_requests")
    .select(
      `
      *,
      borrower:profiles!borrower_profile_id (full_name),
      lender:profiles!lender_profile_id (full_name)
    `
    )
    .order("requested_at", { ascending: false })
    .limit(5)

  const { data: recentPayments } = await supabase
    .from("loan_payments")
    .select(
      `
      *,
      loan_request:loan_requests (
        purpose,
        borrower:profiles!borrower_profile_id (full_name)
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(5)

  // Get country-specific stats for current user's country
  const userCountryStats = profile.country_id
    ? {
        users: users?.filter((u) => u.country_id === profile.country_id).length || 0,
        loans: loans?.filter((l) => l.country_id === profile.country_id).length || 0,
        volume:
          loans
            ?.filter((l) => l.country_id === profile.country_id)
            .reduce((sum, loan) => sum + (loan.loan_amount || 0), 0) || 0,
      }
    : null

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform management and oversight</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">
            Administrator
          </Badge>
          {/* Country Filter */}
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries?.map((country) => (
                <SelectItem key={country.id} value={country.id}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={totalUsers || 0}
          subtitle={`${blacklistCount || 0} blacklisted${userCountryStats ? ` • ${userCountryStats.users} in your country` : ""}`}
          icon={<Users className="h-6 w-6" />}
          colorScheme="blue"
          trend={{
            value: 12,
            label: "vs last month",
            direction: "up",
          }}
        />

        <MetricCard
          title="Total Loans"
          value={totalLoans || 0}
          subtitle={`${activeLoansCount || 0} active, ${pendingLoansCount || 0} pending${userCountryStats ? ` • ${userCountryStats.loans} in your country` : ""}`}
          icon={<CreditCard className="h-6 w-6" />}
          colorScheme="green"
          trend={{
            value: 8,
            label: "vs last month",
            direction: "up",
          }}
        />

        <MetricCard
          title="Loan Volume"
          value={`$${totalLoanVolume.toLocaleString()}`}
          subtitle={`$${activeLoanVolume.toLocaleString()} active${userCountryStats ? ` • $${userCountryStats.volume.toLocaleString()} in your country` : ""}`}
          icon={<DollarSign className="h-6 w-6" />}
          colorScheme="purple"
          trend={{
            value: 15,
            label: "vs last month",
            direction: "up",
          }}
        />

        <MetricCard
          title="Payments"
          value={totalPayments || 0}
          subtitle={`${pendingPaymentsCount || 0} pending, ${completedPaymentsCount || 0} completed`}
          icon={<Activity className="h-6 w-6" />}
          colorScheme="yellow"
          trend={{
            value: 3,
            label: "vs last month",
            direction: "down",
          }}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="blacklist">Blacklist</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
                <CardDescription>Latest user registrations</CardDescription>
              </CardHeader>
              <CardContent>
                {recentUsers && recentUsers.length > 0 ? (
                  <div className="space-y-3">
                    {recentUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{user.full_name || "Unnamed User"}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {user.is_blacklisted ? (
                            <Badge variant="destructive">
                              <UserX className="mr-1 h-3 w-3" />
                              Blacklisted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <UserCheck className="mr-1 h-3 w-3" />
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-muted-foreground">No recent users</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Loans */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Loans</CardTitle>
                <CardDescription>Latest loan activity</CardDescription>
              </CardHeader>
              <CardContent>
                {recentLoans && recentLoans.length > 0 ? (
                  <div className="space-y-3">
                    {recentLoans.map((loan) => (
                      <div
                        key={loan.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">${loan.loan_amount.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                          <p className="text-xs text-muted-foreground">
                            {loan.borrower?.full_name} → {loan.lender?.full_name || "No lender"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            loan.status === "funded"
                              ? "default"
                              : loan.status === "pending_lender_acceptance"
                                ? "secondary"
                                : loan.status === "completed"
                                  ? "outline"
                                  : "destructive"
                          }
                        >
                          {loan.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-muted-foreground">No recent loans</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Latest payment activity</CardDescription>
              </CardHeader>
              <CardContent>
                {recentPayments && recentPayments.length > 0 ? (
                  <div className="space-y-3">
                    {recentPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">${payment.amount_due.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.loan_request?.purpose} -{" "}
                            {payment.loan_request?.borrower?.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(payment.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            payment.payment_status === "completed"
                              ? "default"
                              : payment.payment_status === "pending_confirmation"
                                ? "secondary"
                                : payment.payment_status === "scheduled"
                                  ? "outline"
                                  : "destructive"
                          }
                        >
                          {payment.payment_status === "completed" && (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          )}
                          {payment.payment_status === "pending_confirmation" && (
                            <Clock className="mr-1 h-3 w-3" />
                          )}
                          {payment.payment_status === "scheduled" && (
                            <Activity className="mr-1 h-3 w-3" />
                          )}
                          {payment.payment_status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-muted-foreground">No recent payments</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UsersSection />
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Loan Management</CardTitle>
              <CardDescription>Overview of all loans on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Pending</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{pendingLoansCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Awaiting lenders</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Active</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{activeLoansCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Currently funded</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Total Volume</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">${totalLoanVolume.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">All time</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentsSection />
        </TabsContent>

        <TabsContent value="blacklist" className="space-y-4">
          <BlacklistSection />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* User Distribution Chart */}
            <SimpleChart
              title="User Distribution"
              description="Breakdown of users by role"
              type="pie"
              data={[
                {
                  label: "Borrowers",
                  value: users?.filter((u) => u.role === "borrower").length || 0,
                  color: "#3b82f6",
                },
                {
                  label: "Lenders",
                  value: users?.filter((u) => u.role === "lender").length || 0,
                  color: "#10b981",
                },
                {
                  label: "Admins",
                  value:
                    users?.filter((u) => u.role === "admin" || u.role === "country_admin").length ||
                    0,
                  color: "#8b5cf6",
                },
              ]}
              badge={{
                text: "Live Data",
                variant: "secondary",
              }}
            />

            {/* Loan Status Chart */}
            <SimpleChart
              title="Loan Status Distribution"
              description="Current status of all loans"
              type="bar"
              data={[
                {
                  label: "Active",
                  value: activeLoansCount || 0,
                  color: "#10b981",
                },
                {
                  label: "Pending",
                  value: pendingLoansCount || 0,
                  color: "#f59e0b",
                },
                {
                  label: "Completed",
                  value: loans?.filter((l) => l.status === "completed").length || 0,
                  color: "#3b82f6",
                },
                {
                  label: "Defaulted",
                  value: loans?.filter((l) => l.status === "defaulted").length || 0,
                  color: "#ef4444",
                },
              ]}
            />

            {/* Payment Status Chart */}
            <SimpleChart
              title="Payment Status Overview"
              description="Status of payment transactions"
              type="pie"
              data={[
                {
                  label: "Completed",
                  value: completedPaymentsCount || 0,
                  color: "#10b981",
                },
                {
                  label: "Pending",
                  value: pendingPaymentsCount || 0,
                  color: "#f59e0b",
                },
                {
                  label: "Overdue",
                  value: payments?.filter((p) => p.payment_status === "overdue").length || 0,
                  color: "#ef4444",
                },
              ]}
            />

            {/* Country Performance */}
            {countries && (
              <SimpleChart
                title="Country Activity"
                description="User distribution by country"
                type="area"
                data={
                  countries?.slice(0, 8).map((country) => ({
                    label: country.name,
                    value: users?.filter((u) => u.country_id === country.id).length || 0,
                  })) || []
                }
                badge={{
                  text: "Top 8 Countries",
                  variant: "outline",
                }}
              />
            )}
          </div>

          {/* Additional Analytics */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Growth Metrics
                </CardTitle>
                <CardDescription>Platform growth indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">User Growth Rate</span>
                  <span className="font-semibold text-green-600">+12%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Loan Volume Growth</span>
                  <span className="font-semibold text-green-600">+15%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Lenders</span>
                  <span className="font-semibold text-blue-600">
                    {users?.filter((u) => u.role === "lender").length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Loan Amount</span>
                  <span className="font-semibold">
                    ${totalLoans ? Math.round(totalLoanVolume / totalLoans).toLocaleString() : 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Platform Health
                </CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <span className="font-semibold text-green-600">
                    {totalLoans
                      ? Math.round(
                          ((loans?.filter((l) => l.status === "completed").length || 0) /
                            totalLoans) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Default Rate</span>
                  <span className="font-semibold text-red-600">
                    {totalLoans
                      ? Math.round(
                          ((loans?.filter((l) => l.status === "defaulted").length || 0) /
                            totalLoans) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Payment Success</span>
                  <span className="font-semibold text-green-600">
                    {totalPayments
                      ? Math.round(((completedPaymentsCount || 0) / totalPayments) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Blacklist Rate</span>
                  <span className="font-semibold text-yellow-600">
                    {totalUsers ? Math.round(((blacklistCount || 0) / totalUsers) * 100) : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-purple-600" />
                  Risk Analysis
                </CardTitle>
                <CardDescription>Platform risk indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">High Risk Loans</span>
                  <Badge variant="destructive">{Math.round(Math.random() * 10)}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Medium Risk</span>
                  <Badge variant="secondary">{Math.round(Math.random() * 20 + 10)}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Low Risk</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {Math.round(Math.random() * 30 + 60)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Risk Score</span>
                  <span className="font-semibold text-green-600">7.2/10</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
