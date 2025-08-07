import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { ReceivedOffers } from "@/components/borrower/received-offers"

export default async function OffersPage() {
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

  if (profile?.role !== "borrower") {
    redirect("/")
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Loan Offers</h1>
        <p className="text-muted-foreground">
          Review and manage offers from lenders
        </p>
      </div>
      <ReceivedOffers borrowerProfileId={profile.id} />
    </div>
  )
}