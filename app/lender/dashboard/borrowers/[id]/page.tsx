import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ArrowLeft, 
  Shield, 
  AlertCircle, 
  TrendingUp, 
  Calendar,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  FileText
} from "lucide-react"
import Link from "next/link"

async function getBorrowerProfile(borrowerId: string, lenderId: string) {
  const supabase = createServerSupabaseClient()
  
  const { data: borrower, error } = await supabase
    .from("profiles")
    .select(`
      *,
      countries(name, code, currency_code),
      borrower_profiles(
        reputation_score,
        total_loans_requested,
        loans_repaid,
        loans_defaulted,
        total_borrowed,
        total_repaid
      )
    `)
    .eq("id", borrowerId)
    .eq("role", "borrower")
    .single()

  if (error || !borrower) return null

  // Get loan history with this lender
  const { data: loans } = await supabase
    .from("loan_offers")
    .select(`
      *,
      loan_requests(*)
    `)
    .eq("lender_profile_id", lenderId)
    .eq("loan_requests.borrower_profile_id", borrowerId)

  // Check if blacklisted
  const { data: blacklist } = await supabase
    .from("blacklisted_borrowers")
    .select("*")
    .eq("borrower_profile_id", borrowerId)
    .single()

  return {
    ...borrower,
    loan_history: loans || [],
    is_blacklisted: !!blacklist
  }
}

export default async function BorrowerProfilePage({
  params
}: {
  params: { id: string }
}) {
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

  const borrower = await getBorrowerProfile(params.id, profile.id)

  if (!borrower) {
    notFound()
  }

  const borrowerProfile = borrower.borrower_profiles?.[0]
  const reputation = borrowerProfile?.reputation_score || 50

  return (
    <div className="container mx-auto py-8 px-4">
      <Link href="/lender/dashboard/borrowers/search">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search
        </Button>
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={borrower.profile_picture_url} />
                    <AvatarFallback className="text-lg">
                      {borrower.full_name?.charAt(0) || borrower.email.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">
                      {borrower.full_name || "Unnamed Borrower"}
                    </CardTitle>
                    <CardDescription>{borrower.email}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  {borrower.is_verified && (
                    <Badge variant="default">
                      <Shield className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                  {borrower.is_blacklisted && (
                    <Badge variant="destructive">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Blacklisted
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{borrower.email}</span>
                </div>
                {borrower.phone_number && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{borrower.phone_number}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {borrower.countries?.name || "Unknown Location"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Joined {new Date(borrower.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {borrower.address && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Address</p>
                  <p className="text-sm">{borrower.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loan History with You</CardTitle>
              <CardDescription>
                Previous loans and interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {borrower.loan_history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No previous loan history with this borrower
                </p>
              ) : (
                <div className="space-y-3">
                  {borrower.loan_history.map((loan) => (
                    <div key={loan.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {borrower.countries?.currency_code} {loan.offered_amount}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {loan.interest_rate}% for {loan.duration_months} months
                        </p>
                      </div>
                      <Badge variant={
                        loan.status === "accepted" ? "default" :
                        loan.status === "pending" ? "secondary" : "outline"
                      }>
                        {loan.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Reputation Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="text-4xl font-bold mb-2">{reputation}</div>
                <Badge variant={
                  reputation >= 80 ? "default" :
                  reputation >= 60 ? "secondary" :
                  reputation >= 40 ? "outline" : "destructive"
                }>
                  {reputation >= 80 ? "Excellent" :
                   reputation >= 60 ? "Good" :
                   reputation >= 40 ? "Fair" : "Poor"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Borrowing Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Loans</span>
                <span className="font-medium">
                  {borrowerProfile?.total_loans_requested || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Loans Repaid</span>
                <span className="font-medium">
                  {borrowerProfile?.loans_repaid || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Defaults</span>
                <span className="font-medium">
                  {borrowerProfile?.loans_defaulted || 0}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="text-sm text-muted-foreground">Total Borrowed</span>
                <span className="font-medium">
                  {borrower.countries?.currency_code} {borrowerProfile?.total_borrowed || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Repaid</span>
                <span className="font-medium">
                  {borrower.countries?.currency_code} {borrowerProfile?.total_repaid || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full">
                <CreditCard className="mr-2 h-4 w-4" />
                Make Loan Offer
              </Button>
              <Button variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                View Documents
              </Button>
              {!borrower.is_blacklisted && (
                <Button variant="destructive" variant="outline" className="w-full">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Report Borrower
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}