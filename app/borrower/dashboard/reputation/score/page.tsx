import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Trophy, 
  TrendingUp, 
  AlertTriangle, 
  Award,
  Star,
  Target,
  Zap,
  Shield
} from "lucide-react"

async function getReputationData(borrowerId: string) {
  const supabase = createServerSupabaseClient()
  
  // Get borrower profile with reputation data
  const { data: borrowerProfile } = await supabase
    .from("borrower_profiles")
    .select("*")
    .eq("user_id", borrowerId)
    .single()

  // Get reputation badges
  const { data: badges } = await supabase
    .from("reputation_badges")
    .select("*")
    .eq("profile_id", borrowerId)
    .eq("is_active", true)

  // Get loan history for reputation factors
  const { data: loans } = await supabase
    .from("loan_offers")
    .select(`
      *,
      loan_requests(*)
    `)
    .eq("loan_requests.borrower_profile_id", borrowerId)
    .eq("status", "accepted")

  // Get payment history
  const { data: payments } = await supabase
    .from("loan_payments")
    .select("*")
    .eq("borrower_profile_id", borrowerId)

  const completedPayments = payments?.filter(p => p.status === "completed").length || 0
  const totalPayments = payments?.length || 0
  const paymentRate = totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 100

  return {
    profile: borrowerProfile,
    badges: badges || [],
    loanCount: loans?.length || 0,
    paymentRate,
    completedPayments,
    totalPayments
  }
}

export default async function ReputationScorePage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("auth_user_id", user.id)
    .single()

  if (profile?.role !== "borrower") {
    redirect("/")
  }

  const reputation = await getReputationData(profile.id)
  const score = reputation.profile?.reputation_score || 50
  
  const getScoreLevel = (score: number) => {
    if (score >= 80) return { level: "Excellent", color: "green" }
    if (score >= 60) return { level: "Good", color: "blue" }
    if (score >= 40) return { level: "Fair", color: "yellow" }
    return { level: "Poor", color: "red" }
  }

  const scoreLevel = getScoreLevel(score)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reputation Score</h1>
        <p className="text-muted-foreground">
          Build trust with lenders through your borrowing history
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Your Reputation Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-6xl font-bold mb-2">{score}</div>
              <Badge 
                variant={
                  scoreLevel.level === "Excellent" ? "default" :
                  scoreLevel.level === "Good" ? "secondary" :
                  scoreLevel.level === "Fair" ? "outline" : "destructive"
                }
                className="text-lg px-4 py-1"
              >
                {scoreLevel.level}
              </Badge>
              <Progress value={score} className="mt-6" />
              <p className="text-sm text-muted-foreground mt-4">
                Your score is updated based on your loan and payment history
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Score Factors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Payment History</span>
                <span className="text-sm text-muted-foreground">
                  {reputation.completedPayments}/{reputation.totalPayments}
                </span>
              </div>
              <Progress value={reputation.paymentRate} />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Loan Count</span>
                <span className="text-sm text-muted-foreground">
                  {reputation.loanCount} loans
                </span>
              </div>
              <Progress value={Math.min(reputation.loanCount * 10, 100)} />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Profile Completion</span>
                <span className="text-sm text-muted-foreground">100%</span>
              </div>
              <Progress value={100} />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Default Rate</span>
                <span className="text-sm text-muted-foreground">
                  {reputation.profile?.loans_defaulted || 0} defaults
                </span>
              </div>
              <Progress 
                value={reputation.profile?.loans_defaulted ? 100 : 0} 
                className="[&>div]:bg-red-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Reputation Badges
          </CardTitle>
          <CardDescription>
            Earn badges to showcase your creditworthiness
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reputation.badges.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Complete loans and maintain good payment history to earn badges
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {reputation.badges.map((badge) => (
                <div key={badge.id} className="flex items-center gap-3 p-4 border rounded-lg">
                  <div className="p-2 bg-primary/10 rounded-full">
                    {badge.badge_type === "star" && <Star className="h-5 w-5 text-primary" />}
                    {badge.badge_type === "shield" && <Shield className="h-5 w-5 text-primary" />}
                    {badge.badge_type === "zap" && <Zap className="h-5 w-5 text-primary" />}
                    {badge.badge_type === "target" && <Target className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <p className="font-medium">{badge.badge_name}</p>
                    <p className="text-sm text-muted-foreground">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Improve Your Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Make payments on time</p>
              <p className="text-sm text-muted-foreground">
                Timely repayments significantly boost your score
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Complete your profile</p>
              <p className="text-sm text-muted-foreground">
                Verified profiles get better loan offers
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Build loan history</p>
              <p className="text-sm text-muted-foreground">
                Successfully completed loans improve trust
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium">Avoid defaults</p>
              <p className="text-sm text-muted-foreground">
                Defaults severely impact your reputation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}