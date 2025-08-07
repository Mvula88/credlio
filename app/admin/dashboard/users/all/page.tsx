import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { UsersSection } from "@/components/admin/users-section"

export default async function AllUsersPage() {
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

  if (!profile?.role?.includes("admin")) {
    redirect("/")
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">All Users</h1>
        <p className="text-muted-foreground">
          Manage and monitor all system users
        </p>
      </div>
      <UsersSection />
    </div>
  )
}