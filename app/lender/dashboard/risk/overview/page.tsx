import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Shield, TrendingUp, Users, AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

async function getRiskMetrics(lenderId: string) {
  const supabase = createServerSupabaseClient()
  
  // Get all borrowers this lender has interacted with
  const { data: loans } = await supabase
    .from("loan_offers")
    .select(`
      *,
      loan_requests(
        borrower_profile_id,
        profiles:borrower_profile_id(
          id,
          full_name,
          email,
          is_blacklisted,
          borrower_profiles(
            reputation_score,
            loans_defaulted,
            total_loans_requested
          )
        )
      )
    `)
    .eq("lender_profile_id", lenderId)
    .eq("status", "accepted")

  // Get blacklisted borrowers
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
    .limit(5)

  // Calculate risk metrics
  const totalLoans = loans?.length || 0
  const riskyLoans = loans?.filter(l => 
    l.loan_requests?.profiles?.borrower_profiles?.[0]?.reputation_score < 50
  ).length || 0
  const defaultedLoans = loans?.filter(l => 
    l.loan_requests?.profiles?.borrower_profiles?.[0]?.loans_defaulted > 0
  ).length || 0

  const riskScore = totalLoans > 0 
    ? Math.round(((totalLoans - riskyLoans - defaultedLoans) / totalLoans) * 100)
    : 100

  return {
    totalLoans,
    riskyLoans,
    defaultedLoans,
    riskScore,
    blacklisted: blacklisted || [],
    recentLoans: loans?.slice(0, 5) || []
  }
}

export default async function RiskOverviewPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (profile?.role !== "lender") {
    redirect("/")
  }

  const metrics = await getRiskMetrics(profile.id)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Risk Overview</h1>
        <p className="text-muted-foreground">Monitor and manage lending risks</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Risk Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.riskScore}%</div>
            <Progress value={metrics.riskScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Based on borrower profiles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Loans</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalLoans}</div>
            <p className="text-xs text-muted-foreground">
              Across all borrowers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risky Loans</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.riskyLoans}</div>
            <p className="text-xs text-muted-foreground">
              Low reputation borrowers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Defaulted Loans</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.defaultedLoans}</div>
            <p className="text-xs text-muted-foreground">
              Historical defaults
            </p>
          </CardContent>
        </Card>
      </div>

      {metrics.riskyLoans > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Risk Alert</AlertTitle>
          <AlertDescription>
            You have {metrics.riskyLoans} loans with borrowers who have low reputation scores.
            Consider reviewing these loans for potential risks.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Blacklisted Borrowers</CardTitle>
            <CardDescription>
              Borrowers recently added to the blacklist
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.blacklisted.length === 0 ? (
              <p className="text-sm text-muted-foreground">No blacklisted borrowers found</p>
            ) : (
              <div className="space-y-4">
                {metrics.blacklisted.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {item.profiles?.full_name || item.profiles?.email}
                      </p>
                      <p className="text-sm text-muted-foreground">{item.reason}</p>
                    </div>
                    <Badge variant="destructive">Blacklisted</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>
              Breakdown of your loan portfolio by risk level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Low Risk</span>
                  <span className="text-sm text-muted-foreground">
                    {metrics.totalLoans - metrics.riskyLoans - metrics.defaultedLoans} loans
                  </span>
                </div>
                <Progress 
                  value={(metrics.totalLoans - metrics.riskyLoans - metrics.defaultedLoans) / metrics.totalLoans * 100 || 0} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Medium Risk</span>
                  <span className="text-sm text-muted-foreground">{metrics.riskyLoans} loans</span>
                </div>
                <Progress 
                  value={metrics.riskyLoans / metrics.totalLoans * 100 || 0} 
                  className="h-2 [&>div]:bg-yellow-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">High Risk</span>
                  <span className="text-sm text-muted-foreground">{metrics.defaultedLoans} loans</span>
                </div>
                <Progress 
                  value={metrics.defaultedLoans / metrics.totalLoans * 100 || 0} 
                  className="h-2 [&>div]:bg-red-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}