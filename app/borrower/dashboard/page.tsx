import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertCircle,
  CreditCard,
  History,
  FileText,
  TrendingUp,
  Plus,
  Clock,
  DollarSign,
  Calendar,
  User,
  Shield,
  BarChart3,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { BorrowerReputationSection } from "@/components/borrower/reputation-section"
import { BorrowerBlacklistStatus } from "@/components/borrower/blacklist-status"
import { MyLoanRequests } from "@/components/borrower/my-loan-requests"
import { ReceivedOffers } from "@/components/borrower/received-offers"
import { LoanBehaviorHistory } from "@/components/borrower/loan-behavior-history"
import { BorrowerProfile } from "@/components/profile/borrower-profile"

export const dynamic = "force-dynamic"

export default async function BorrowerDashboard() {
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== "borrower") {
    redirect("/auth/signin")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Platform Notice */}
      <div className="bg-blue-600 px-4 py-3 text-white">
        <div className="container mx-auto flex max-w-7xl items-center gap-2 text-sm">
          <Shield className="h-4 w-4" />
          <span>
            <strong>Secure Platform:</strong> We facilitate reputation tracking only. All loans and
            payments are handled offline between parties.
          </span>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Welcome back, {profile.full_name?.split(" ")[0] || "Borrower"}
              </h1>
              <p className="mt-2 text-gray-600">
                Track your reputation and manage loan requests from one place
              </p>
            </div>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              New Loan Request
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="border-2 transition-colors hover:border-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reputation Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">75</div>
                <span className="flex items-center text-sm text-green-600">
                  <ArrowUpRight className="h-3 w-3" />
                  +5
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Good Standing</p>
            </CardContent>
          </Card>

          <Card className="border-2 transition-colors hover:border-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="mt-1 text-xs text-muted-foreground">$2,500 total</p>
            </CardContent>
          </Card>

          <Card className="border-2 transition-colors hover:border-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-Time Payments</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">92%</div>
              <p className="mt-1 text-xs text-muted-foreground">23 of 25 payments</p>
            </CardContent>
          </Card>

          <Card className="border-2 transition-colors hover:border-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5 days</div>
              <p className="mt-1 text-xs text-muted-foreground">$150 due</p>
            </CardContent>
          </Card>
        </div>

        {/* Blacklist Status Alert */}
        <BorrowerBlacklistStatus borrowerId={profile.id} />

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-[720px]">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <FileText className="h-4 w-4" />
              Requests
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Offers
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="reputation" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Reputation
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Reputation Summary */}
              <BorrowerReputationSection borrowerId={profile.id} />

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest transactions and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 rounded-lg bg-green-50 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Payment Received</p>
                        <p className="text-sm text-gray-600">$200 payment confirmed</p>
                      </div>
                      <span className="text-sm text-gray-500">2 hours ago</span>
                    </div>

                    <div className="flex items-center gap-4 rounded-lg bg-blue-50 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">New Loan Offer</p>
                        <p className="text-sm text-gray-600">$500 at 10% interest</p>
                      </div>
                      <span className="text-sm text-gray-500">1 day ago</span>
                    </div>

                    <div className="flex items-center gap-4 rounded-lg bg-purple-50 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Score Improved</p>
                        <p className="text-sm text-gray-600">+5 points for on-time payment</p>
                      </div>
                      <span className="text-sm text-gray-500">3 days ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Payments</CardTitle>
                <CardDescription>Stay on track with your repayment schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                        <Clock className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">Quick Cash Ltd</p>
                        <p className="text-sm text-gray-600">Due in 5 days</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">$150</p>
                      <Badge variant="outline" className="text-orange-600">
                        Due Soon
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                        <Calendar className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">MicroLend Plus</p>
                        <p className="text-sm text-gray-600">Due in 12 days</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">$300</p>
                      <Badge variant="outline">Scheduled</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <MyLoanRequests borrowerId={profile.id} />
          </TabsContent>

          <TabsContent value="offers" className="space-y-6">
            <ReceivedOffers borrowerId={profile.id} />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <LoanBehaviorHistory borrowerId={profile.id} />
          </TabsContent>

          <TabsContent value="reputation" className="space-y-6">
            <div className="grid gap-6">
              <BorrowerReputationSection borrowerId={profile.id} detailed />

              {/* Reputation Tips */}
              <Card>
                <CardHeader>
                  <CardTitle>Improve Your Score</CardTitle>
                  <CardDescription>
                    Follow these tips to build better credit reputation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Make payments on time</p>
                        <p className="text-sm text-gray-600">
                          Payment history accounts for 40% of your score
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Keep loan amounts reasonable</p>
                        <p className="text-sm text-gray-600">
                          Borrow only what you can comfortably repay
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Build long-term relationships</p>
                        <p className="text-sm text-gray-600">
                          Successful repeat loans improve your reputation
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Complete your profile</p>
                        <p className="text-sm text-gray-600">
                          Verified profiles get better loan offers
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <BorrowerProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
