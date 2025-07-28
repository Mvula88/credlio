export const dynamic = "force-dynamic"

import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { DollarSign, TrendingUp, CreditCard, AlertCircle, Plus, Calendar, CheckCircle, FileText } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function BorrowerDashboardPage() {
  const supabase = createServerSupabaseClient()

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session || !session.user) {
    redirect("/auth/signin")
  }

  const user = session.user

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("auth_user_id", user.id).single()

  if (!profile) {
    redirect("/auth/signin")
  }

  // Get borrower's loan requests with offers
  const { data: loanRequests } = await supabase
    .from("loan_requests")
    .select(`
      *,
      loan_offers (
        id,
        offer_amount,
        interest_rate,
        repayment_terms_proposed,
        offer_status,
        lender:profiles!lender_profile_id (full_name)
      )
    `)
    .eq("borrower_profile_id", profile.id)
    .order("requested_at", { ascending: false })

  // Get active loans (funded requests)
  const { data: activeLoans } = await supabase
    .from("loan_requests")
    .select(`
      *,
      loan_payments (*),
      lender:profiles!lender_profile_id (full_name)
    `)
    .eq("borrower_profile_id", profile.id)
    .eq("status", "funded")

  // Get upcoming payments
  const { data: upcomingPayments } = await supabase
    .from("loan_payments")
    .select(`
      *,
      loan_request:loan_requests (
        purpose,
        lender:profiles!lender_profile_id (full_name)
      )
    `)
    .eq("borrower_profile_id", profile.id)
    .in("payment_status", ["scheduled", "pending_confirmation"])
    .gte("due_date", new Date().toISOString().split("T")[0])
    .order("due_date", { ascending: true })
    .limit(5)

  // Get payment history
  const { data: paymentHistory } = await supabase
    .from("loan_payments")
    .select(`
      *,
      loan_request:loan_requests (
        purpose,
        lender:profiles!lender_profile_id (full_name)
      )
    `)
    .eq("borrower_profile_id", profile.id)
    .in("payment_status", ["completed", "failed"])
    .order("payment_date", { ascending: false })
    .limit(10)

  // Calculate statistics
  const totalRequested = loanRequests?.reduce((sum, req) => sum + req.loan_amount, 0) || 0
  const activeLoansCount = activeLoans?.length || 0
  const totalOffers = loanRequests?.reduce((sum, req) => sum + (req.loan_offers?.length || 0), 0) || 0
  const upcomingPaymentsAmount = upcomingPayments?.reduce((sum, payment) => sum + payment.amount_due, 0) || 0

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Borrower Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.full_name || user.email}</p>
        </div>
        <Link href="/borrower/loans/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Loan Request
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requested</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRequested.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{loanRequests?.length || 0} requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLoansCount}</div>
            <p className="text-xs text-muted-foreground">Currently funded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Offers</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOffers}</div>
            <p className="text-xs text-muted-foreground">Received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trust Score</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.trust_score || 0}</div>
            <p className="text-xs text-muted-foreground">Reputation</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Payments Alert */}
      {upcomingPayments && upcomingPayments.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Calendar className="h-5 w-5" />
              Upcoming Payments
            </CardTitle>
            <CardDescription className="text-orange-700">
              You have {upcomingPayments.length} payments due soon (${upcomingPaymentsAmount.toLocaleString()})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/borrower/payments">
              <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                View Payment Schedule
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
          <TabsTrigger value="loans">Active Loans</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Loan Requests */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Loan Requests</CardTitle>
                <CardDescription>Your latest requests and their status</CardDescription>
              </CardHeader>
              <CardContent>
                {loanRequests && loanRequests.length > 0 ? (
                  <div className="space-y-3">
                    {loanRequests.slice(0, 5).map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">${request.loan_amount.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{request.purpose}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(request.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge
                            variant={
                              request.status === "funded"
                                ? "default"
                                : request.status === "pending_lender_acceptance"
                                  ? "secondary"
                                  : request.status === "completed"
                                    ? "outline"
                                    : "destructive"
                            }
                          >
                            {request.status.replace(/_/g, " ")}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{request.loan_offers?.length || 0} offers</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">No loan requests yet</p>
                    <Link href="/borrower/loans/create">
                      <Button size="sm">Create Your First Request</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Next Payments</CardTitle>
                <CardDescription>Payments due soon</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingPayments && upcomingPayments.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">${payment.amount_due.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{payment.loan_request?.purpose}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(payment.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={payment.payment_status === "pending_confirmation" ? "secondary" : "outline"}>
                          {payment.payment_status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">No upcoming payments</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Loan Requests</CardTitle>
              <CardDescription>Manage your loan requests and offers</CardDescription>
            </CardHeader>
            <CardContent>
              {loanRequests && loanRequests.length > 0 ? (
                <div className="space-y-4">
                  {loanRequests.map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">${request.loan_amount.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{request.purpose}</p>
                          <p className="text-xs text-muted-foreground">
                            Requested: {new Date(request.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            request.status === "funded"
                              ? "default"
                              : request.status === "pending_lender_acceptance"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {request.status.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      {request.loan_offers && request.loan_offers.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Offers ({request.loan_offers.length})</p>
                          {request.loan_offers.slice(0, 3).map((offer) => (
                            <div key={offer.id} className="text-sm p-2 bg-gray-50 rounded">
                              <span className="font-medium">${offer.offer_amount.toLocaleString()}</span> at{" "}
                              <span className="font-medium">{offer.interest_rate}%</span> from {offer.lender?.full_name}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Link href={`/borrower/loans/${request.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No loan requests yet</p>
                  <Link href="/borrower/loans/create">
                    <Button>Create Your First Request</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Loans</CardTitle>
              <CardDescription>Loans you need to repay</CardDescription>
            </CardHeader>
            <CardContent>
              {activeLoans && activeLoans.length > 0 ? (
                <div className="space-y-4">
                  {activeLoans.map((loan) => {
                    const totalPaid =
                      loan.loan_payments
                        ?.filter((p: any) => p.payment_status === "completed")
                        .reduce((sum: number, payment: any) => sum + payment.amount_due, 0) || 0
                    const progress = loan.loan_amount > 0 ? (totalPaid / loan.loan_amount) * 100 : 0

                    return (
                      <div key={loan.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">${loan.loan_amount.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                            <p className="text-sm text-muted-foreground">Lender: {loan.lender?.full_name}</p>
                          </div>
                          <Badge>Active</Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Repayment Progress</span>
                            <span>
                              ${totalPaid.toLocaleString()} / ${loan.loan_amount.toLocaleString()}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Link href={`/borrower/loans/${loan.id}`}>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </Link>
                          <Link href={`/borrower/payments?loan=${loan.id}`}>
                            <Button size="sm">Make Payment</Button>
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No active loans</p>
                  <Link href="/borrower/loans/create">
                    <Button>Request a Loan</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
                <CardDescription>Your payment statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Upcoming Payments</span>
                    <span className="font-medium">${upcomingPaymentsAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Completed This Month</span>
                    <span className="font-medium">
                      $
                      {paymentHistory
                        ?.filter(
                          (p) =>
                            p.payment_status === "completed" &&
                            new Date(p.payment_date).getMonth() === new Date().getMonth(),
                        )
                        .reduce((sum, p) => sum + p.amount_due, 0)
                        .toLocaleString() || "0"}
                    </span>
                  </div>
                  <div className="pt-4">
                    <Link href="/borrower/payments">
                      <Button className="w-full">
                        <FileText className="h-4 w-4 mr-2" />
                        View All Payments
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Payment History */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Your latest payment activity</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentHistory && paymentHistory.length > 0 ? (
                  <div className="space-y-3">
                    {paymentHistory.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">${payment.amount_due.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{payment.loan_request?.purpose}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.payment_date
                              ? new Date(payment.payment_date).toLocaleDateString()
                              : new Date(payment.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={payment.payment_status === "completed" ? "default" : "destructive"}>
                          {payment.payment_status === "completed" ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          )}
                          {payment.payment_status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">No payment history</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
