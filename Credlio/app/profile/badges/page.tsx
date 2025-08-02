import { createServerSupabaseClient } from "@/lib/supabase/server-client"

const BadgesPage = async () => {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return (
      <div>
        <h1>Badges</h1>
        <p>You must be logged in to view your badges.</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Badges</h1>
      <p>Here are your badges:</p>
      {/* Add badge display logic here */}
    </div>
  )
}

export default BadgesPage
