import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import type { Database } from "../lib/types/database"

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables")
  process.exit(1)
}

async function verifySupabaseSetup() {
  console.log("🔍 Verifying Supabase setup...")

  // Create a Supabase client with the service role key
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

  try {
    // Test connection by getting Supabase version
    const { data, error } = await supabase.rpc("version")

    if (error) {
      throw error
    }

    console.log("✅ Successfully connected to Supabase!")
    console.log(`📊 Supabase version: ${data}`)

    // Check if essential tables exist
    const { data: tables, error: tablesError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")

    if (tablesError) {
      throw tablesError
    }

    console.log("\n📋 Existing tables in your database:")
    if (tables && tables.length > 0) {
      tables.forEach((table: any) => {
        console.log(`- ${table.table_name}`)
      })
    } else {
      console.log("No tables found. You need to run the setup scripts.")
    }

    // Check if RLS is enabled
    const { data: rlsData, error: rlsError } = await supabase
      .from("information_schema.tables")
      .select("table_name, has_table_privilege(table_name, 'SELECT') as can_select")
      .eq("table_schema", "public")

    if (rlsError) {
      throw rlsError
    }

    console.log("\n🔒 Row Level Security status:")
    if (rlsData && rlsData.length > 0) {
      rlsData.forEach((table: any) => {
        console.log(
          `- ${table.table_name}: ${table.can_select ? "Accessible" : "RLS may be restricting access"}`
        )
      })
    }
  } catch (error) {
    console.error("❌ Error connecting to Supabase:", error)
    process.exit(1)
  }
}

verifySupabaseSetup()
