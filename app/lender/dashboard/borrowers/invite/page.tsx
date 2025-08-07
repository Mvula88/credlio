import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { BorrowerInvite } from "@/components/lender/borrower-invite"

export default async function InviteBorrowerPage() {
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
    <div className="container mx-auto py-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Invite Borrower</h1>
        <p className="text-muted-foreground mb-8">
          Send an invitation to a borrower to join the platform
        </p>
        <BorrowerInvite lenderProfileId={profile.id} />
      </div>
    </div>
  )
}