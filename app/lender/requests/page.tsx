import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { LoanRequestsMarketplace } from "@/components/lender/loan-requests-marketplace"

export default async function RequestsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, country_id")
    .eq("auth_user_id", user.id)
    .single()

  if (profile?.role !== "lender") {
    redirect("/")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Loan Requests</h1>
        <p className="text-muted-foreground">
          Browse and respond to loan requests from verified borrowers
        </p>
      </div>
      <LoanRequestsMarketplace />
    </div>
  )
}