import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate required environment variables
function validateEnvironmentVariables() {
  const missing = []

  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL")
  if (!supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")

  if (missing.length > 0) {
    console.error("❌ Missing Supabase environment variables:", missing.join(", "))
    console.error("Please check your .env.local file")
    throw new Error(
      `Missing required Supabase environment variables: ${missing.join(", ")}\n` +
        "Please check your .env.local file and ensure all required variables are set.",
    )
  }

  // Validate URL format
  if (!supabaseUrl.startsWith("https://")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must start with https://")
  }

  // Validate key format (should start with eyJ for JWT)
  if (!supabaseAnonKey.startsWith("eyJ")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be invalid (should start with 'eyJ')")
  }

  if (supabaseServiceKey && !supabaseServiceKey.startsWith("eyJ")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY appears to be invalid (should start with 'eyJ')")
  }

  console.log("✅ Supabase environment variables validated successfully")
}

// Only validate in Node.js environment (not in browser)
if (typeof window === "undefined") {
  validateEnvironmentVariables()
}

// Create a Supabase client with the service role key for admin operations
export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database>(supabaseUrl!, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null

// Create a singleton Supabase client for client-side usage
let clientSingleton: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseBrowserClient() {
  // Only create client if we have the required environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables for browser client")
  }

  if (clientSingleton) return clientSingleton

  clientSingleton = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "credlio-auth",
    },
  })

  return clientSingleton
}

// Helper function to check if we're on the server
export const isServer = () => typeof window === "undefined"

// Export validated environment variables
export { supabaseUrl, supabaseAnonKey, supabaseServiceKey }
