export const dynamic = "force-dynamic"

import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CalendarDays, DollarSign, TrendingUp, AlertCircle } from "lucide-react"
import Link from "next/link"

export default async function BorrowerDashboardPage() {
  const supabase = createServerSupabaseClient()

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  // Only redirect if there's no session at all
  if (sessionError || !session || !session.user) {
    redirect("/auth/signin")
  }

  const user = session.user

  // Get user profile - create if doesn't exist
  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    const { data: newProfile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        auth_user_id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
        email: user.email!,
      })
      .select()
      .single()

    if (profileError) {
      console.error("Profile creation error:", profileError)
      // Don't redirect, just use basic user info
      profile = {
        id: user.id,
        auth_user_id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
        email: user.email!,
        reputation_score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    } else {
      profile = newProfile
    }
  }

  // Get borrower's loan requests (with error handling)
  const { data: loanRequests } = await supabase
    .from("loan_requests")
    .select(
      `
      *,
      loan_offers(count)
    `
    )
    .eq("borrower_id", user.id)
    .order("created_at", { ascending: false })

  // Get active loans (with error handling)
  const { data: activeLoans } = await supabase
    .from("loan_requests")
    .select(
      `
      *,
      loan_payments(*)
    `
    )
    .eq("borrower_id", user.id)
    .eq("status", "active")

  const totalRequested = loanRequests?.reduce((sum, req) => sum + req.amount, 0) || 0
  const activeLoansCount = activeLoans?.length || 0
  const totalOffers =
    loanRequests?.reduce((sum, req) => sum + (req.loan_offers?.[0]?.count || 0), 0) || 0

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Borrower Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.full_name || user.email}</p>
        </div>
        <Link href="/borrower/loans/create">
          <Button>Create Loan Request</Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requested</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRequested.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLoansCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Offers</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOffers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reputation Score</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.reputation_score || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Loan Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Loan Requests</CardTitle>
          <CardDescription>Your latest loan requests and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {loanRequests && loanRequests.length > 0 ? (
            <div className="space-y-4">
              {loanRequests.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium">${request.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{request.purpose}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-2 text-right">
                    <Badge
                      variant={
                        request.status === "active"
                          ? "default"
                          : request.status === "pending"
                            ? "secondary"
                            : request.status === "completed"
                              ? "outline"
                              : "destructive"
                      }
                    >
                      {request.status}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {request.loan_offers?.[0]?.count || 0} offers
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="mb-4 text-muted-foreground">No loan requests yet</p>
              <Link href="/borrower/loans/create">
                <Button>Create Your First Request</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Loans */}
      {activeLoans && activeLoans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Loans</CardTitle>
            <CardDescription>Loans you need to repay</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeLoans.map((loan) => {
                const totalPaid =
                  loan.loan_payments?.reduce(
                    (sum: number, payment: any) =>
                      payment.status === "confirmed" ? sum + payment.amount : sum,
                    0
                  ) || 0
                const progress = (totalPaid / loan.amount) * 100

                return (
                  <div key={loan.id} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">${loan.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                      </div>
                      <Badge>Active</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Repayment Progress</span>
                        <span>
                          ${totalPaid.toLocaleString()} / ${loan.amount.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div className="flex justify-end">
                      <Link href={`/borrower/loans/${loan.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
