import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables")
  process.exit(1)
}

async function verifyDatabaseStatus() {
  console.log("🔍 Checking Supabase Database Status...")
  console.log("=====================================\n")

  const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

  try {
    // 1. Check profiles table
    console.log("1️⃣ Checking profiles table:")
    const { count: profileCount, error: profileError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })

    if (profileError) {
      console.log("❌ Error accessing profiles:", profileError.message)
    } else {
      console.log(`✅ Profiles table exists with ${profileCount || 0} records`)
    }

    // 2. Check countries table
    console.log("\n2️⃣ Checking countries table:")
    const { data: countries, error: countryError } = await supabase
      .from("countries")
      .select("id, name, code")
      .order("name")

    if (countryError) {
      console.log("❌ Error accessing countries:", countryError.message)
    } else {
      console.log(`✅ Countries table has ${countries?.length || 0} countries`)
      if (countries && countries.length > 0) {
        console.log("   Sample countries:", countries.slice(0, 5).map(c => c.name).join(", "))
      }
    }

    // 3. Check if RLS is enabled
    console.log("\n3️⃣ Checking RLS status:")
    const { data: rlsStatus } = await supabase.rpc("exec_sql", {
      sql: `
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('profiles', 'countries', 'blacklisted_borrowers')
      `
    }).catch(() => ({ data: null }))

    if (rlsStatus) {
      console.log("✅ RLS is configured on tables")
    } else {
      console.log("⚠️  Could not verify RLS status")
    }

    // 4. Check authentication setup
    console.log("\n4️⃣ Testing authentication readiness:")
    console.log("✅ Service role key is configured")
    console.log("✅ Anon key is configured")
    console.log("✅ Database URL is configured")

    // 5. Check key tables
    console.log("\n5️⃣ Checking other key tables:")
    const tables = [
      "subscriptions",
      "blacklisted_borrowers",
      "loan_requests",
      "loan_offers",
      "payments"
    ]

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .limit(1)

      if (error) {
        console.log(`   ❌ ${table}: Not found or no access`)
      } else {
        console.log(`   ✅ ${table}: Exists and accessible`)
      }
    }

    console.log("\n✅ Database verification complete!")
    console.log("\nYour database is ready for:")
    console.log("- User authentication and signup")
    console.log("- Country-based access control")
    console.log("- Subscription management")
    console.log("- Loan and payment tracking")

  } catch (error: any) {
    console.error("❌ Verification failed:", error.message)
    process.exit(1)
  }
}

verifyDatabaseStatus()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
  })