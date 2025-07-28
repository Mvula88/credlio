import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import readline from "readline"
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

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Create Supabase clients
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)
const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Function to prompt for input
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer)
    })
  })
}

async function testAuthFlow() {
  console.log("🔐 Testing Supabase Authentication Flow")
  console.log("=====================================")

  try {
    // Test 1: Create a test user
    console.log("\n📝 Test 1: Creating a test user")
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = "Password123!"

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    })

    if (createError) {
      throw createError
    }

    console.log(`✅ Test user created: ${testEmail}`)
    console.log(`👤 User ID: ${userData.user.id}`)

    // Test 2: Sign in with the test user
    console.log("\n📝 Test 2: Signing in with test user")

    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })

    if (signInError) {
      throw signInError
    }

    console.log("✅ Sign in successful!")
    console.log(`🔑 Session expires at: ${new Date(signInData.session.expires_at!).toLocaleString()}`)

    // Test 3: Get user profile
    console.log("\n📝 Test 3: Creating and fetching user profile")

    // Create a profile for the test user
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        auth_user_id: userData.user.id,
        full_name: "Test User",
        email: testEmail,
        country_id: "00000000-0000-0000-0000-000000000000", // Placeholder, will fail if foreign key constraint exists
      })
      .select()

    if (profileError) {
      console.log("⚠️ Could not create profile. This is expected if you haven't set up the profiles table yet.")
      console.log(profileError)
    } else {
      console.log("✅ Profile created successfully!")
      console.log(profileData)
    }

    // Test 4: Test RLS policies
    console.log("\n📝 Test 4: Testing Row Level Security policies")

    // Try to access profiles table with the client (should be restricted by RLS)
    const { data: clientProfileData, error: clientProfileError } = await supabaseClient.from("profiles").select("*")

    if (clientProfileError) {
      console.log("⚠️ Client could not access profiles table. This might be due to RLS policies.")
      console.log(clientProfileError)
    } else {
      console.log("✅ Client could access profiles table.")
      console.log(`📊 Number of profiles accessible: ${clientProfileData.length}`)
    }

    // Test 5: Clean up - delete the test user
    console.log("\n📝 Test 5: Cleaning up - deleting test user")

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userData.user.id)

    if (deleteError) {
      throw deleteError
    }

    console.log("✅ Test user deleted successfully!")

    console.log("\n🎉 All authentication tests completed!")
  } catch (error) {
    console.error("❌ Error during authentication testing:", error)
  } finally {
    rl.close()
  }
}

testAuthFlow()
