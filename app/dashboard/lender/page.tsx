export const dynamic = "force-dynamic"

import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Users, TrendingUp, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default async function LenderDashboardPage() {
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
  let { data: profile } = await supabase.from("profiles").select("*").eq("auth_user_id", user.id).single()

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

  // Get lender's offers (with error handling)
  const { data: offers } = await supabase
    .from("loan_offers")
    .select(`
      *,
      loan_requests(*)
    `)
    .eq("lender_id", user.id)
    .order("created_at", { ascending: false })

  // Get active loans (accepted offers) (with error handling)
  const { data: activeLoans } = await supabase
    .from("loan_offers")
    .select(`
      *,
      loan_requests(*),
      loan_payments(*)
    `)
    .eq("lender_id", user.id)
    .eq("status", "accepted")

  // Get available loan requests (with error handling)
  const { data: availableRequests } = await supabase
    .from("loan_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5)

  const totalOffered = offers?.reduce((sum, offer) => sum + offer.amount, 0) || 0
  const activeLoansCount = activeLoans?.length || 0
  const totalOffers = offers?.length || 0

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lender Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.full_name || user.email}</p>
        </div>
        <Link href="/lender/requests">
          <Button>Browse Requests</Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Offered</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalOffered.toLocaleString()}</div>
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
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOffers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalOffers > 0 ? Math.round((activeLoansCount / totalOffers) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Loan Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Available Loan Requests</CardTitle>
          <CardDescription>Recent loan requests looking for lenders</CardDescription>
        </CardHeader>
        <CardContent>
          {availableRequests && availableRequests.length > 0 ? (
            <div className="space-y-4">
              {availableRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">${request.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{request.purpose}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.interest_rate}% interest • {request.term_months} months
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge variant="secondary">Available</Badge>
                    <div>
                      <Link href={`/lender/requests/${request.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No loan requests available at the moment</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Offers */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Offers</CardTitle>
          <CardDescription>Your latest loan offers and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {offers && offers.length > 0 ? (
            <div className="space-y-4">
              {offers.slice(0, 5).map((offer) => (
                <div key={offer.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">${offer.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{offer.loan_requests?.purpose}</p>
                    <p className="text-xs text-muted-foreground">
                      Offered {new Date(offer.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge
                      variant={
                        offer.status === "accepted"
                          ? "default"
                          : offer.status === "pending"
                            ? "secondary"
                            : offer.status === "rejected"
                              ? "destructive"
                              : "outline"
                      }
                    >
                      {offer.status}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {offer.interest_rate}% • {offer.term_months}mo
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No offers made yet</p>
              <Link href="/lender/requests">
                <Button>Browse Loan Requests</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
