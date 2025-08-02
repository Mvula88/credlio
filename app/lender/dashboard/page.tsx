import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  AlertCircle,
  CreditCard,
  Search,
  Users,
  FileText,
  TrendingUp,
  Shield,
  UserPlus,
  DollarSign,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Zap,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calculator,
  User,
} from "lucide-react"
import { SubscriptionStatus } from "@/components/lender/subscription-status"
import { BorrowerReportsSection } from "@/components/lender/borrower-reports"
import { BlacklistManagement } from "@/components/lender/blacklist-management"
import { MarketplaceSection } from "@/components/lender/marketplace-section"
import { ActiveLoansTracker } from "@/components/lender/active-loans-tracker"
import { BorrowerInviteSection } from "@/components/lender/borrower-invite"
import { LenderStats } from "@/components/lender/lender-stats"
import { MyBorrowers } from "@/components/lender/my-borrowers"
import { LenderProfile } from "@/components/profile/lender-profile"
import { OffPlatformDefaulters } from "@/components/lender/off-platform-defaulters"
import { GhostBorrowerTracker } from "@/components/lender/ghost-borrower-tracker"
import { UnifiedRiskView } from "@/components/lender/unified-risk-view"

export const dynamic = "force-dynamic"

export default async function LenderDashboard() {
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== "lender") {
    redirect("/auth/signin")
  }

  // Get subscription status and country info
  const supabase = createServerSupabaseClient()
  
  // Get country code
  const { data: countryData } = await supabase
    .from("countries")
    .select("code")
    .eq("id", profile.country_id)
    .single()
  
  const countryCode = countryData?.code || 'US'
  const { data: subscription } = await supabase
    .from("lender_subscriptions")
    .select(
      `
      *,
      plan:subscription_plans(*)
    `
    )
    .eq("lender_id", profile.id)
    .eq("status", "active")
    .single()

  const hasActiveSubscription = !!subscription
  const subscriptionTier = subscription?.plan?.tier || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Platform Notice Banner */}
      <div className="bg-green-600 px-4 py-3 text-white">
        <div className="container mx-auto flex max-w-7xl items-center gap-2 text-sm">
          <Shield className="h-4 w-4" />
          <span>
            <strong>Reputation Bureau:</strong> We provide credit intelligence. All loans and
            document verification happen offline between parties.
          </span>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Welcome back, {profile.full_name?.split(" ")[0] || "Lender"}
              </h1>
              <p className="mt-2 text-gray-600">
                Make smarter lending decisions with comprehensive borrower intelligence
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="gap-2">
                <Search className="h-5 w-5" />
                Search Borrower
              </Button>
              <Button size="lg" className="gap-2">
                <UserPlus className="h-5 w-5" />
                Invite Borrower
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="border-2 transition-colors hover:border-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="mt-1 text-xs text-muted-foreground">$45,000 deployed</p>
            </CardContent>
          </Card>

          <Card className="border-2 transition-colors hover:border-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Repayment Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">94%</div>
                <span className="flex items-center text-sm text-green-600">
                  <ArrowUpRight className="h-3 w-3" />
                  +2%
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Above average</p>
            </CardContent>
          </Card>

          <Card className="border-2 transition-colors hover:border-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reports Viewed</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscriptionTier >= 2 ? "Unlimited" : "8/10"}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card className="border-2 transition-colors hover:border-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risk Alerts</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="mt-1 text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Status */}
        {!hasActiveSubscription ? (
          <Card className="mb-8 border-amber-200 bg-amber-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                    <CreditCard className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle>Start Your Free Trial</CardTitle>
                    <CardDescription>
                      Get 1 day free, then choose a plan that fits your business
                    </CardDescription>
                  </div>
                </div>
                <Button size="lg" className="bg-amber-600 hover:bg-amber-700">
                  View Plans
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ) : (
          <SubscriptionStatus subscription={subscription} lenderId={profile.id} />
        )}

        {/* Main Dashboard Content */}
        {hasActiveSubscription ? (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-8 lg:w-[900px]">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="borrowers" className="gap-2">
                <Users className="h-4 w-4" />
                My Borrowers
              </TabsTrigger>
              <TabsTrigger value="search" className="gap-2">
                <Search className="h-4 w-4" />
                Search
              </TabsTrigger>
              <TabsTrigger value="marketplace" className="gap-2" disabled={subscriptionTier < 2}>
                <Users className="h-4 w-4" />
                Marketplace
                {subscriptionTier < 2 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    Premium
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="loans" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Loans
              </TabsTrigger>
              <TabsTrigger value="risk" className="gap-2">
                <Shield className="h-4 w-4" />
                Risk Management
              </TabsTrigger>
              <TabsTrigger value="ghost" className="gap-2">
                <Users className="h-4 w-4" />
                Ghost Borrowers
              </TabsTrigger>
              <TabsTrigger value="invite" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invite
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Risk Analysis Panel */}
                <Card>
                  <CardHeader>
                    <CardTitle>Portfolio Risk Analysis</CardTitle>
                    <CardDescription>
                      Real-time risk assessment of your lending portfolio
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium">Overall Risk Score</span>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Low Risk
                          </Badge>
                        </div>
                        <Progress value={25} className="h-2" />
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">8</div>
                          <div className="text-xs text-gray-500">Low Risk</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">3</div>
                          <div className="text-xs text-gray-500">Medium Risk</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">1</div>
                          <div className="text-xs text-gray-500">High Risk</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common tasks and workflows</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="justify-start gap-2">
                        <Search className="h-4 w-4" />
                        Check Borrower
                      </Button>
                      <Button variant="outline" className="justify-start gap-2">
                        <Calculator className="h-4 w-4" />
                        Risk Calculator
                      </Button>
                      <Button variant="outline" className="justify-start gap-2">
                        <FileText className="h-4 w-4" />
                        View Reports
                      </Button>
                      <Button variant="outline" className="justify-start gap-2">
                        <Shield className="h-4 w-4" />
                        Report Default
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates from your portfolio</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 rounded-lg bg-green-50 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Payment Received</p>
                        <p className="text-sm text-gray-600">John Doe completed payment of $500</p>
                      </div>
                      <span className="text-sm text-gray-500">2 hours ago</span>
                    </div>

                    <div className="flex items-center gap-4 rounded-lg bg-blue-50 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">New Report Available</p>
                        <p className="text-sm text-gray-600">
                          Credit report for Jane Smith is ready
                        </p>
                      </div>
                      <span className="text-sm text-gray-500">5 hours ago</span>
                    </div>

                    <div className="flex items-center gap-4 rounded-lg bg-yellow-50 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Payment Overdue</p>
                        <p className="text-sm text-gray-600">
                          Mike Johnson's payment is 3 days late
                        </p>
                      </div>
                      <span className="text-sm text-gray-500">1 day ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="borrowers" className="space-y-6">
              <MyBorrowers />
            </TabsContent>

            <TabsContent value="search" className="space-y-6">
              <BorrowerReportsSection lenderId={profile.id} subscriptionTier={subscriptionTier} />
            </TabsContent>

            <TabsContent value="marketplace" className="space-y-6">
              {subscriptionTier >= 2 ? (
                <MarketplaceSection lenderId={profile.id} />
              ) : (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                        <Zap className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle>Upgrade to Premium</CardTitle>
                        <CardDescription>
                          Unlock marketplace access and unlimited reports
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" size="lg">
                      Upgrade Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="loans" className="space-y-6">
              <ActiveLoansTracker lenderId={profile.id} />
            </TabsContent>

            <TabsContent value="risk" className="space-y-6">
              <Tabs defaultValue="unified" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="unified">All Risks</TabsTrigger>
                  <TabsTrigger value="blacklist">Blacklist</TabsTrigger>
                  <TabsTrigger value="offplatform">Off-Platform</TabsTrigger>
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>
                <TabsContent value="unified" className="space-y-4">
                  <UnifiedRiskView countryCode={countryCode} />
                </TabsContent>
                <TabsContent value="blacklist" className="space-y-4">
                  <BlacklistManagement lenderId={profile.id} subscriptionTier={subscriptionTier} />
                </TabsContent>
                <TabsContent value="offplatform" className="space-y-4">
                  <OffPlatformDefaulters lenderId={profile.id} countryCode={countryCode} />
                </TabsContent>
                <TabsContent value="reports" className="space-y-4">
                  <BorrowerReportsSection lenderId={profile.id} subscriptionTier={subscriptionTier} />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="ghost" className="space-y-6">
              <GhostBorrowerTracker lenderId={profile.id} countryCode={countryCode} />
            </TabsContent>

            <TabsContent value="invite" className="space-y-6">
              <BorrowerInviteSection lenderId={profile.id} />
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <LenderProfile />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Choose Your Plan</CardTitle>
                <CardDescription>Start with a 1-day free trial</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-lg border-2 p-6 transition-colors hover:border-blue-500">
                    <h3 className="mb-2 text-lg font-semibold">Basic Plan</h3>
                    <div className="mb-4 text-3xl font-bold">
                      $15<span className="text-sm font-normal text-gray-500">/month</span>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        10 credit reports per month
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Blacklist access
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Risk assessment tools
                      </li>
                    </ul>
                  </div>

                  <div className="relative rounded-lg border-2 p-6 transition-colors hover:border-purple-500">
                    <Badge className="absolute -top-3 right-4">Most Popular</Badge>
                    <h3 className="mb-2 text-lg font-semibold">Premium Plan</h3>
                    <div className="mb-4 text-3xl font-bold">
                      $22<span className="text-sm font-normal text-gray-500">/month</span>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Unlimited credit reports
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Marketplace access
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Smart matching
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Priority support
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Document Notice */}
        <Card className="mt-8 border-gray-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-base">Important Reminder</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Always verify borrower documents (ID, proof of income, bank statements) offline before
              lending. This platform provides reputation data to supplement your due diligence
              process.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
