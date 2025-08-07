import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { BlacklistManagement } from "@/components/lender/blacklist-management"

export default async function BlacklistPage() {
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

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Risky/Bad Borrowers Registry</h1>
        <p className="text-muted-foreground">
          View borrowers reported as risky or bad by lenders and the system to protect your investments
        </p>
      </div>
      <BlacklistManagement />
    </div>
  )
}