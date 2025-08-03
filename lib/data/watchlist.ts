import { createServerSupabaseClient } from "@/lib/supabase/server-client"

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
}: {
  title: string
  media_type: string
  tmdb_id: number
  poster_path: string | null
}) {
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

// Lender-Borrower Watchlist functions
export async function addBorrowerToWatchlist(
  lenderProfileId: string,
  borrowerProfileId: string,
  countryId: string
) {
  const supabase = createServerSupabaseClient()

  try {
    const { error } = await supabase
      .from("lender_watchlist")
      .insert([{ 
        lender_profile_id: lenderProfileId,
        borrower_profile_id: borrowerProfileId,
        country_id: countryId
      }])

    if (error) {
      console.error("Error adding borrower to watchlist:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error adding to watchlist:", error)
    return { success: false, error: "Unexpected error" }
  }
}

export async function removeBorrowerFromWatchlist(
  lenderProfileId: string,
  borrowerProfileId: string
) {
  const supabase = createServerSupabaseClient()

  try {
    const { error } = await supabase
      .from("lender_watchlist")
      .delete()
      .eq("lender_profile_id", lenderProfileId)
      .eq("borrower_profile_id", borrowerProfileId)

    if (error) {
      console.error("Error removing borrower from watchlist:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error removing from watchlist:", error)
    return { success: false, error: "Unexpected error" }
  }
}
