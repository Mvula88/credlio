import { Suspense } from "react"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, UserPlus, Shield, AlertCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

async function searchBorrowers(searchTerm: string = "") {
  const supabase = createServerSupabaseClient()
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, countries(name, code)")
    .eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id)
    .single()

  if (!profile) return []

  let query = supabase
    .from("profiles")
    .select(`
      *,
      countries(name, code),
      borrower_profiles(
        reputation_score,
        total_loans_requested,
        loans_repaid,
        loans_defaulted
      )
    `)
    .eq("role", "borrower")
    .eq("country_id", profile.country_id)

  if (searchTerm) {
    query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
  }

  const { data: borrowers, error } = await query.limit(20)

  if (error) {
    console.error("Error searching borrowers:", error)
    return []
  }

  return borrowers || []
}

export default async function BorrowerSearchPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
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

  if (profile?.role !== "lender") {
    redirect("/")
  }

  const borrowers = await searchBorrowers(searchParams.q)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Search Borrowers</h1>
          <p className="text-muted-foreground">Find and connect with verified borrowers</p>
        </div>
        <Link href="/lender/dashboard/borrowers/invite">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Borrower
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>Search for borrowers by name or email</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                name="q"
                placeholder="Search borrowers..."
                defaultValue={searchParams.q}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {borrowers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No borrowers found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or invite new borrowers to the platform
              </p>
            </CardContent>
          </Card>
        ) : (
          borrowers.map((borrower) => (
            <Card key={borrower.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={borrower.profile_picture_url} />
                      <AvatarFallback>
                        {borrower.full_name?.charAt(0) || borrower.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{borrower.full_name || "Unnamed"}</h3>
                        {borrower.is_verified && (
                          <Badge variant="default" className="gap-1">
                            <Shield className="h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{borrower.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {borrower.countries?.name || "Unknown Country"}
                      </p>
                      {borrower.borrower_profiles?.[0] && (
                        <div className="flex gap-4 mt-2 text-sm">
                          <span>
                            Score: <strong>{borrower.borrower_profiles[0].reputation_score}</strong>
                          </span>
                          <span>
                            Loans: <strong>{borrower.borrower_profiles[0].total_loans_requested}</strong>
                          </span>
                          <span>
                            Repaid: <strong>{borrower.borrower_profiles[0].loans_repaid}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/lender/dashboard/borrowers/${borrower.id}`}>
                      <Button variant="outline" size="sm">View Profile</Button>
                    </Link>
                    <Button size="sm">Make Offer</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}