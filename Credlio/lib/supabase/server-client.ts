import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/lib/types/database"

// Safe for App Router - user context only, no service role key
export const createServerSupabaseClient = () => {
  return createServerComponentClient<Database>({ cookies })
}
