import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users, UserPlus, Search, Shield } from "lucide-react"
import Link from "next/link"

async function getBorrowers(lenderId: string) {
  const supabase = createServerSupabaseClient()
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("country_id")
    .eq("id", lenderId)
    .single()

  if (!profile) return []

  const { data: borrowers } = await supabase
    .from("profiles")
    .select(`
      *,
      countries(name, code),
      borrower_profiles(
        reputation_score,
        total_loans_requested,
        loans_repaid
      )
    `)
    .eq("role", "borrower")
    .eq("country_id", profile.country_id)
    .limit(20)

  return borrowers || []
}

export default async function BorrowersPage() {
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

  const borrowers = await getBorrowers(profile.id)

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Borrowers</h1>
          <p className="text-muted-foreground">
            Connect with verified borrowers in your region
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/lender/dashboard/borrowers/search">
            <Button variant="outline">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </Link>
          <Link href="/lender/dashboard/borrowers/invite">
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Borrower
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {borrowers.map((borrower) => (
          <Card key={borrower.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={borrower.profile_picture_url} />
                    <AvatarFallback>
                      {borrower.full_name?.charAt(0) || borrower.email.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {borrower.full_name || "Unnamed"}
                    </CardTitle>
                    <CardDescription>{borrower.email}</CardDescription>
                  </div>
                </div>
                {borrower.is_verified && (
                  <Badge variant="default" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Country</span>
                  <span>{borrower.countries?.name || "Unknown"}</span>
                </div>
                {borrower.borrower_profiles?.[0] && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reputation</span>
                      <span className="font-medium">
                        {borrower.borrower_profiles[0].reputation_score}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Loans</span>
                      <span>
                        {borrower.borrower_profiles[0].loans_repaid}/
                        {borrower.borrower_profiles[0].total_loans_requested}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Link href={`/lender/dashboard/borrowers/${borrower.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    View Profile
                  </Button>
                </Link>
                <Button size="sm" className="flex-1">
                  Make Offer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {borrowers.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No borrowers found</h3>
            <p className="text-muted-foreground mb-4">
              Start by inviting borrowers to join the platform
            </p>
            <Link href="/lender/dashboard/borrowers/invite">
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Your First Borrower
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}