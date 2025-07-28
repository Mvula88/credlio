import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

async function checkConnection() {
  console.log("Checking Supabase connection...")
  console.log(`URL: ${supabaseUrl}`)

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Try a simple query to check connection
    const { data, error } = await supabase.from("profiles").select("count").limit(1)

    if (error) throw error

    console.log("✅ Successfully connected to Supabase!")
    console.log("Database response:", data)
  } catch (error) {
    console.error("❌ Failed to connect to Supabase:", error)
  }
}

checkConnection()
