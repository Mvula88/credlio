import { createServerSupabaseClient } from "@/lib/supabase/server-app"

export async function getWatchlist() {
  const supabase = createServerSupabaseClient()

  try {
    const { data, error } = await supabase.from("watchlist").select(`
        id,
        created_at,
        title,
        media_type,
        tmdb_id,
        poster_path
      `)

    if (error) {
      console.error("Error fetching watchlist:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Unexpected error fetching watchlist:", error)
    return []
  }
}

export async function addToWatchlist({
  title,
  media_type,
  tmdb_id,
  poster_path,
}: { title: string; media_type: string; tmdb_id: number; poster_path: string | null }) {
  const supabase = createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("watchlist")
      .insert([{ title, media_type, tmdb_id, poster_path }])
      .select()

    if (error) {
      console.error("Error adding to watchlist:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data[0] }
  } catch (error) {
    console.error("Unexpected error adding to watchlist:", error)
    return { success: false, error: "Unexpected error" }
  }
}

export async function removeFromWatchlist(id: string) {
  const supabase = createServerSupabaseClient()

  try {
    const { error } = await supabase.from("watchlist").delete().eq("id", id)

    if (error) {
      console.error("Error removing from watchlist:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error removing from watchlist:", error)
    return { success: false, error: "Unexpected error" }
  }
}
