export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  AlertTriangle, 
  Shield, 
  TrendingUp, 
  Users,
  FileWarning,
  Activity,
  AlertCircle
} from "lucide-react"

async function getRiskMetrics() {
  const supabase = createServerSupabaseClient()
  
  // Get high-risk borrowers
  const { data: riskyBorrowers } = await supabase
    .from("borrower_profiles")
    .select(`
      *,
      profiles:user_id(
        full_name,
        email,
        countries(name)
      )
    `)
    .lt("reputation_score", 40)
    .limit(10)

  // Get recent blacklisted users
  const { data: blacklisted } = await supabase
    .from("blacklisted_borrowers")
    .select(`
      *,
      profiles:borrower_profile_id(
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false })
    .limit(10)

  // Get overdue payments
  const { data: overduePayments } = await supabase
    .from("loan_payments")
    .select(`
      *,
      borrower:borrower_profile_id(
        full_name,
        email
      ),
      lender:lender_profile_id(
        full_name,
        email
      )
    `)
    .eq("status", "pending")
    .lt("due_date", new Date().toISOString())
    .limit(20)

  // Calculate risk metrics
  const { count: totalBorrowers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "borrower")

  const { count: totalDefaulted } = await supabase
    .from("loan_payments")
    .select("*", { count: "exact", head: true })
    .eq("status", "defaulted")

  const riskScore = totalBorrowers && totalDefaulted 
    ? Math.round((totalDefaulted / totalBorrowers) * 100)
    : 0

  return {
    riskyBorrowers: riskyBorrowers || [],
    blacklisted: blacklisted || [],
    overduePayments: overduePayments || [],
    totalBorrowers: totalBorrowers || 0,
    totalDefaulted: totalDefaulted || 0,
    riskScore
  }
}

export default async function ComplianceRiskPage() {
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

  const metrics = await getRiskMetrics()

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Risk & Compliance</h1>
        <p className="text-muted-foreground">
          Monitor platform risks and compliance issues
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Risk Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.riskScore}%</div>
            <p className="text-xs text-muted-foreground">
              Based on default rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Users</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.riskyBorrowers.length}</div>
            <p className="text-xs text-muted-foreground">
              Score below 40
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blacklisted</CardTitle>
            <FileWarning className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.blacklisted.length}</div>
            <p className="text-xs text-muted-foreground">
              Total blacklisted users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overduePayments.length}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {metrics.overduePayments.length > 5 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>High Number of Overdue Payments</AlertTitle>
          <AlertDescription>
            There are {metrics.overduePayments.length} overdue payments requiring immediate attention.
            Consider implementing automated reminders or stricter lending criteria.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>High Risk Borrowers</CardTitle>
            <CardDescription>
              Users with reputation scores below 40
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.riskyBorrowers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No high-risk borrowers found</p>
            ) : (
              <div className="space-y-3">
                {metrics.riskyBorrowers.slice(0, 5).map((borrower) => (
                  <div key={borrower.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {borrower.profiles?.full_name || borrower.profiles?.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Score: {borrower.reputation_score} | 
                        Defaults: {borrower.loans_defaulted}
                      </p>
                    </div>
                    <Badge variant="destructive">High Risk</Badge>
                  </div>
                ))}
              </div>
            )}
            {metrics.riskyBorrowers.length > 5 && (
              <Button variant="outline" className="w-full mt-4">
                View All ({metrics.riskyBorrowers.length})
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Blacklist Additions</CardTitle>
            <CardDescription>
              Recently blacklisted borrowers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.blacklisted.length === 0 ? (
              <p className="text-sm text-muted-foreground">No blacklisted users</p>
            ) : (
              <div className="space-y-3">
                {metrics.blacklisted.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {item.profiles?.full_name || item.profiles?.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.reason}
                      </p>
                    </div>
                    <Badge variant="destructive">Blacklisted</Badge>
                  </div>
                ))}
              </div>
            )}
            {metrics.blacklisted.length > 5 && (
              <Button variant="outline" className="w-full mt-4">
                View All ({metrics.blacklisted.length})
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overdue Payments</CardTitle>
          <CardDescription>
            Payments that are past their due date
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.overduePayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No overdue payments
            </p>
          ) : (
            <div className="space-y-3">
              {metrics.overduePayments.slice(0, 10).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      ${payment.amount_due} due
                    </p>
                    <p className="text-sm text-muted-foreground">
                      From: {payment.borrower?.full_name || payment.borrower?.email} 
                      → To: {payment.lender?.full_name || payment.lender?.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due: {new Date(payment.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">Overdue</Badge>
                    <div className="mt-2">
                      <Button size="sm" variant="outline">Send Reminder</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}