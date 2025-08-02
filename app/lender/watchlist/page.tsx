import { createServerSupabaseClient } from "@/lib/supabase/server-client"

const WatchlistPage = async () => {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Please sign in to view your watchlist.</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Watchlist</h1>
      <p>This is your watchlist page.</p>
    </div>
  )
}

export default WatchlistPage
