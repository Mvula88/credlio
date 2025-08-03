import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import SimpleAdminDashboard from "@/components/admin/simple-admin-dashboard"

export default async function AdminPage() {
  const supabase = createServerComponentClient({ cookies })

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  // Check admin status
  const { data: isAdminResult, error: adminError } = await supabase.rpc("is_admin")

  if (adminError || !isAdminResult) {
    redirect("/")
  }

  // Get admin view settings
  const { data: viewSettings } = await supabase.rpc("get_admin_view_settings").single()

  const initialView = (viewSettings as any)?.current_view || "super_admin"
  const initialCountry = (viewSettings as any)?.selected_country_code || undefined

  return (
    <div className="container mx-auto px-4 py-8">
      <SimpleAdminDashboard
        initialView={initialView as "super_admin" | "country_admin"}
        initialCountry={initialCountry}
      />
    </div>
  )
}
