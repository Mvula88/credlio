import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

// ⚠️ NEVER import this file in components or pages that get compiled for the frontend
// Only use in server actions, API routes, and backend utilities

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase URL or Service Role Key is missing from environment variables.")
}

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})
