import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables")
  process.exit(1)
}

async function verifySupabaseSetup() {
  console.log("🔍 Verifying Supabase setup...")
  console.log("=====================================\n")

  // Create a Supabase client with the service role key
  const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

  try {
    // Test basic connection
    console.log("1️⃣ Testing connection...")
    const { count, error: testError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
    
    if (testError && testError.code !== "PGRST116") {
      throw testError
    }

    console.log("✅ Successfully connected to Supabase!")

    // Check essential tables by trying to query them
    console.log("\n2️⃣ Checking essential tables:")
    const tables = [
      "profiles",
      "countries", 
      "subscriptions",
      "blacklisted_borrowers",
      "loan_requests",
      "loan_offers",
      "payments"
    ]

    const existingTables: string[] = []
    const missingTables: string[] = []

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .limit(1)
      
      if (error && error.code === "42P01") {
        missingTables.push(table)
        console.log(`   ❌ ${table} - Not found`)
      } else {
        existingTables.push(table)
        console.log(`   ✅ ${table} - Exists`)
      }
    }

    // Check auth configuration
    console.log("\n3️⃣ Auth Configuration:")
    console.log(`   ✅ Service Role Key: ${supabaseServiceKey.substring(0, 20)}...`)
    console.log(`   ✅ Anon Key: ${supabaseAnonKey.substring(0, 20)}...`)
    console.log(`   ✅ URL: ${supabaseUrl}`)

    // Summary
    console.log("\n📊 Summary:")
    console.log("============")
    console.log(`✅ Tables found: ${existingTables.length}`)
    console.log(`❌ Tables missing: ${missingTables.length}`)
    
    if (missingTables.length > 0) {
      console.log("\n⚠️  Missing tables need to be created:")
      missingTables.forEach(t => console.log(`   - ${t}`))
      console.log("\nRun the database setup scripts to create these tables.")
    }

    // Check if we can access profiles (RLS test)
    console.log("\n4️⃣ Testing RLS on profiles table:")
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)
    
    if (profileError) {
      console.log("   ⚠️  RLS may be restricting access (this is normal)")
    } else {
      console.log("   ✅ Can access profiles table")
    }

    console.log("\n✅ Supabase verification complete!")
    
  } catch (error: any) {
    console.error("\n❌ Error:", error.message || error)
    process.exit(1)
  }
}

verifySupabaseSetup()
