import { createServerSupabaseClient } from "@/lib/supabase/server-app"

export async function getLoanOffers() {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("loan_offers").select("*")

  if (error) {
    console.error("Error fetching loan offers:", error)
    return []
  }

  return data
}
