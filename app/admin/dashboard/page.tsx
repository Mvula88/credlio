export const dynamic = "force-dynamic"

import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, CreditCard, DollarSign, Activity, UserCheck, UserX, Clock, CheckCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminStatsSection } from "@/components/admin/stats-section"
import { BlacklistSection } from "@/components/admin/blacklist-section"
import { UsersSection } from "@/components/admin/users-section"
import { PaymentsSection } from "@/components/admin/payments-section"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
    .select(`
      *,
      user_profile_roles (
        user_roles (name)
      )
    `)
    .eq("auth_user_id", user.id)
    .single()

  const isAdmin =
    profile?.user_profile_roles?.some((role: any) => role.user_roles.name === "admin") || profile?.role === "admin"

  if (!profile || !isAdmin) {
    redirect("/auth/signin")
  }

  // Get all countries for filtering
  const { data: countries } = await supabase.from("countries").select("id, name, code").order("name")

  // Get platform statistics (all countries by default)
  const { data: users, count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact" })

  const { data: loans, count: totalLoans } = await supabase.from("loan_requests").select("*", { count: "exact" })

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

  const { data: payments, count: totalPayments } = await supabase.from("loan_payments").select("*", { count: "exact" })

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
    .select(`
      *,
      borrower:profiles!borrower_profile_id (full_name),
      lender:profiles!lender_profile_id (full_name)
    `)
    .order("requested_at", { ascending: false })
    .limit(5)

  const { data: recentPayments } = await supabase
    .from("loan_payments")
    .select(`
      *,
      loan_request:loan_requests (
        purpose,
        borrower:profiles!borrower_profile_id (full_name)
      )
    `)
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform management and oversight</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {blacklistCount || 0} blacklisted
              {userCountryStats && ` • ${userCountryStats.users} in your country`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLoans || 0}</div>
            <p className="text-xs text-muted-foreground">
              {activeLoansCount || 0} active, {pendingLoansCount || 0} pending
              {userCountryStats && ` • ${userCountryStats.loans} in your country`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loan Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalLoanVolume.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ${activeLoanVolume.toLocaleString()} active
              {userCountryStats && ` • $${userCountryStats.volume.toLocaleString()} in your country`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payments</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayments || 0}</div>
            <p className="text-xs text-muted-foreground">
              {pendingPaymentsCount || 0} pending, {completedPaymentsCount || 0} completed
            </p>
          </CardContent>
        </Card>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                              <UserX className="h-3 w-3 mr-1" />
                              Blacklisted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">No recent users</p>
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
                      <div key={loan.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                  <p className="text-center py-4 text-muted-foreground">No recent loans</p>
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
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">${payment.amount_due.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.loan_request?.purpose} - {payment.loan_request?.borrower?.full_name}
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
                          {payment.payment_status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {payment.payment_status === "pending_confirmation" && <Clock className="h-3 w-3 mr-1" />}
                          {payment.payment_status === "scheduled" && <Activity className="h-3 w-3 mr-1" />}
                          {payment.payment_status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">No recent payments</p>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

        <TabsContent value="analytics" className="space-y-4">
          <AdminStatsSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
