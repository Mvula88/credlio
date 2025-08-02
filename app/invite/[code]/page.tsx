import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"

const InvitePage = async ({ params }: { params: { code: string } }) => {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("invites")
    .select("email, organization_id")
    .eq("code", params.code)
    .single()

  if (error) {
    console.error("Error fetching invite:", error)
    redirect("/auth/sign-up?error=invalid_invite")
  }

  if (!data) {
    redirect("/auth/sign-up?error=invalid_invite")
  }

  const { email, organization_id } = data

  redirect(
    `/auth/sign-up?email=${email}&organization_id=${organization_id}&invite_code=${params.code}`
  )
}

export default InvitePage
