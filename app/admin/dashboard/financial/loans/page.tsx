export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { DollarSign, TrendingUp, Users, Activity } from "lucide-react"

async function getFinancialMetrics() {
  const supabase = createServerSupabaseClient()
  
  // Get all loans
  const { data: loans } = await supabase
    .from("loan_offers")
    .select(`
      *,
      loan_requests(
        borrower_profile_id,
        borrower:borrower_profile_id(
          full_name,
          email,
          countries(currency_code)
        )
      ),
      lender:lender_profile_id(
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false })
    .limit(50)

  // Calculate metrics
  const { data: totalLentData } = await supabase
    .from("loan_offers")
    .select("offered_amount")
    .eq("status", "accepted")

  const totalLent = totalLentData?.reduce((sum, loan) => sum + loan.offered_amount, 0) || 0

  const { data: totalRepaidData } = await supabase
    .from("loan_payments")
    .select("amount_paid")
    .eq("status", "completed")

  const totalRepaid = totalRepaidData?.reduce((sum, payment) => sum + payment.amount_paid, 0) || 0

  const { count: activeLoans } = await supabase
    .from("loan_offers")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")

  const { count: completedLoans } = await supabase
    .from("loan_offers")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed")

  return {
    loans: loans || [],
    totalLent,
    totalRepaid,
    activeLoans: activeLoans || 0,
    completedLoans: completedLoans || 0
  }
}

export default async function FinancialLoansPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile?.role?.includes("admin")) {
    redirect("/")
  }

  const metrics = await getFinancialMetrics()

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financial Overview - Loans</h1>
        <p className="text-muted-foreground">
          Monitor all loan transactions and financial metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalLent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All accepted loans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Repaid</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalRepaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Successfully collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeLoans}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completedLoans}</div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Loans</CardTitle>
          <CardDescription>
            Latest loan transactions across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.loans.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No loans found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Lender</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {loan.loan_requests?.borrower?.full_name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {loan.loan_requests?.borrower?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {loan.lender?.full_name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {loan.lender?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {loan.loan_requests?.borrower?.countries?.currency_code || "$"} 
                      {loan.offered_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{loan.interest_rate}%</TableCell>
                    <TableCell>{loan.duration_months} months</TableCell>
                    <TableCell>
                      <Badge variant={
                        loan.status === "accepted" || loan.status === "active" ? "default" :
                        loan.status === "completed" ? "secondary" :
                        loan.status === "rejected" ? "destructive" : "outline"
                      }>
                        {loan.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(loan.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Loan Distribution by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Loans</span>
                <span className="font-medium">{metrics.activeLoans}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Completed Loans</span>
                <span className="font-medium">{metrics.completedLoans}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Loans</span>
                <span className="font-medium">{metrics.loans.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Average Loan Size</span>
                <span className="font-medium">
                  ${metrics.loans.length > 0 
                    ? Math.round(metrics.totalLent / metrics.loans.filter(l => l.status === "accepted").length).toLocaleString()
                    : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Repayment Rate</span>
                <span className="font-medium">
                  {metrics.totalLent > 0 
                    ? Math.round((metrics.totalRepaid / metrics.totalLent) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Outstanding Amount</span>
                <span className="font-medium">
                  ${(metrics.totalLent - metrics.totalRepaid).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}