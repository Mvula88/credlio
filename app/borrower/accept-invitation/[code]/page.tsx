import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"

interface Params {
  code: string
}

interface Props {
  params: Params
}

async function AcceptInvitationPage({ params }: Props) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("invitations")
    .select("email, organization_id, accepted")
    .eq("code", params.code)
    .single()

  if (error) {
    console.error("Error fetching invitation:", error)
    return <div>Error fetching invitation.</div>
  }

  if (!data) {
    console.warn("Invitation not found.")
    return <div>Invitation not found.</div>
  }

  if (data.accepted) {
    console.warn("Invitation already accepted.")
    return <div>Invitation already accepted.</div>
  }

  // Redirect to signup page with invitation details
  redirect(`/signup?email=${data.email}&organization_id=${data.organization_id}&invitation_code=${params.code}`)
}

export default AcceptInvitationPage
