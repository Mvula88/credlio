import { createServerSupabaseClient } from "@/lib/supabase/server-client"

export async function getUserBadgesSimple(userId: string) {
  const supabase = createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("reputation_badges")
      .select("badge_type, earned_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("earned_at", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching user badges:", error)
    return []
  }
}
