import { createServerSupabaseClient } from "@/lib/supabase/server-client"

export default async function OnboardingPage() {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <div>
      <h1>Onboarding Page</h1>
      {session ? <p>Welcome, user!</p> : <p>Please sign in to continue.</p>}
    </div>
  )
}
