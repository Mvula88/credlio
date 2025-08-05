import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables")
  console.log("Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local")
  process.exit(1)
}

// Create a Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupCountryDatabase() {
  console.log("🚀 Setting up country database support...")
  console.log("=====================================\n")

  try {
    // Step 1: Create exec_sql function first
    console.log("📝 Creating exec_sql function...")
    
    // First, we need to run this SQL directly via Supabase dashboard
    console.log("\n⚠️  IMPORTANT: First, run this SQL in your Supabase SQL Editor:")
    console.log("--------------------------------------------------------")
    console.log(`
CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `)
    console.log("--------------------------------------------------------")
    console.log("Press Enter after you've created the function in Supabase...")
    
    // Wait for user to press Enter
    await new Promise(resolve => {
      process.stdin.once('data', resolve)
    })

    // Step 2: Read and execute SQL files
    const sqlFiles = [
      'fix_country_support.sql',
      'migrate_country_data.sql',
      'country_based_rls.sql'
    ]

    for (const filename of sqlFiles) {
      console.log(`\n📄 Running ${filename}...`)
      
      const filePath = path.join(__dirname, filename)
      
      if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`)
        continue
      }

      const sqlContent = fs.readFileSync(filePath, 'utf8')
      
      // Split by semicolons but be careful with functions
      const statements = sqlContent
        .split(/;\s*$/gm)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('\\'))

      let successCount = 0
      let errorCount = 0

      for (const statement of statements) {
        try {
          // Skip empty statements and comments
          if (!statement || statement.match(/^\s*$/)) continue

          // Use RPC to execute SQL
          const { error } = await supabase.rpc('exec_sql', { 
            sql: statement + ';' 
          })

          if (error) {
            errorCount++
            console.error(`❌ Error:`, error.message)
            console.error(`   Statement: ${statement.substring(0, 50)}...`)
          } else {
            successCount++
          }
        } catch (err: any) {
          errorCount++
          console.error(`❌ Error executing statement:`, err.message)
        }
      }

      console.log(`✅ ${filename}: ${successCount} statements succeeded, ${errorCount} failed`)
    }

    // Step 3: Verify the setup
    console.log("\n🔍 Verifying country setup...")
    
    // Check countries
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('*')
      .order('name')

    if (countriesError) {
      console.error("❌ Error fetching countries:", countriesError)
    } else {
      console.log(`\n✅ Found ${countries?.length || 0} countries:`)
      countries?.forEach(country => {
        console.log(`   ${country.flag || '🏳️'} ${country.name} (${country.code})`)
      })
    }

    // Check if any profiles need country assignment
    const { count: profilesWithoutCountry } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .is('country_id', null)

    if (profilesWithoutCountry && profilesWithoutCountry > 0) {
      console.log(`\n⚠️  ${profilesWithoutCountry} profiles still need country assignment`)
    }

    console.log("\n✅ Country database setup complete!")
    console.log("   Users will now be restricted to their country's data")
    
  } catch (error: any) {
    console.error("\n❌ Setup failed:", error.message)
    process.exit(1)
  }
}

// Run the setup
setupCountryDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
  })