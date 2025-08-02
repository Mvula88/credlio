import { createServerSupabaseClient } from "@/lib/supabase/server-client"

export async function getBorrowerSmartTagsSimple(borrowerId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("smart_tags")
    .select("tag_name, tag_value")
    .eq("user_id", borrowerId)
    .eq("is_active", true)

  if (error) {
    console.error("Error fetching smart tags:", error)
    return []
  }

  return data || []
}
