import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/types/database"
import { createFetchWithTimeout } from "./supabase/fetch-with-timeout"

// Create a single instance that will be reused
let supabaseClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export const createSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient<Database>({
      global: {
        fetch: createFetchWithTimeout(30000), // 30 second timeout
      },
    })
  }
  return supabaseClient
}

// Export the singleton instance
export const supabase = createSupabaseClient()

// Default export for compatibility
export default supabase
