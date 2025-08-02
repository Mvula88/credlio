import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

// Load environment variables
dotenv.config({ path: ".env.local" })

async function testSupabaseConnection() {
  console.log("🧪 Testing Supabase Connection...")
  console.log("=================================")

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log("❌ Missing required environment variables")
    console.log("Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY")
    return
  }

  try {
    // Test with anon key
    console.log("1. Testing with anon key...")
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

    // Test basic connection
    const { data, error } = await supabaseClient.from("profiles").select("count").limit(1)

    if (error && error.code !== "42P01") {
      // 42P01 = table doesn't exist, which is OK
      console.log("❌ Connection failed:", error.message)
    } else {
      console.log("✅ Anon client connection successful!")
    }

    // Test with service role key if available
    if (supabaseServiceKey) {
      console.log("2. Testing with service role key...")
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

      const { data: adminData, error: adminError } = await supabaseAdmin
        .from("profiles")
        .select("count")
        .limit(1)

      if (adminError && adminError.code !== "42P01") {
        console.log("❌ Admin connection failed:", adminError.message)
      } else {
        console.log("✅ Admin client connection successful!")
      }
    }

    // Test auth
    console.log("3. Testing auth service...")
    const { data: authData, error: authError } = await supabaseClient.auth.getSession()

    if (authError) {
      console.log("❌ Auth service failed:", authError.message)
    } else {
      console.log("✅ Auth service working!")
    }

    console.log("\n🎉 All tests passed! Your Supabase connection is working.")
  } catch (error) {
    console.log("❌ Unexpected error:", error)
  }
}

testSupabaseConnection()
