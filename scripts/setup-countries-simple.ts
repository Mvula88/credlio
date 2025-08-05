import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

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

async function setupCountries() {
  console.log("🚀 Setting up countries in database...")
  console.log("=====================================\n")

  const countries = [
    { name: 'Nigeria', code: 'NG', currency_code: 'NGN', flag: '🇳🇬' },
    { name: 'Kenya', code: 'KE', currency_code: 'KES', flag: '🇰🇪' },
    { name: 'Uganda', code: 'UG', currency_code: 'UGX', flag: '🇺🇬' },
    { name: 'South Africa', code: 'ZA', currency_code: 'ZAR', flag: '🇿🇦' },
    { name: 'Ghana', code: 'GH', currency_code: 'GHS', flag: '🇬🇭' },
    { name: 'Tanzania', code: 'TZ', currency_code: 'TZS', flag: '🇹🇿' },
    { name: 'Rwanda', code: 'RW', currency_code: 'RWF', flag: '🇷🇼' },
    { name: 'Zambia', code: 'ZM', currency_code: 'ZMW', flag: '🇿🇲' },
    { name: 'Namibia', code: 'NA', currency_code: 'NAD', flag: '🇳🇦' },
    { name: 'Botswana', code: 'BW', currency_code: 'BWP', flag: '🇧🇼' },
    { name: 'Malawi', code: 'MW', currency_code: 'MWK', flag: '🇲🇼' },
    { name: 'Senegal', code: 'SN', currency_code: 'XOF', flag: '🇸🇳' },
    { name: 'Ethiopia', code: 'ET', currency_code: 'ETB', flag: '🇪🇹' },
    { name: 'Cameroon', code: 'CM', currency_code: 'XAF', flag: '🇨🇲' },
    { name: 'Sierra Leone', code: 'SL', currency_code: 'SLL', flag: '🇸🇱' },
    { name: 'Zimbabwe', code: 'ZW', currency_code: 'ZWL', flag: '🇿🇼' }
  ]

  try {
    // Step 1: Check current countries
    console.log("📊 Checking existing countries...")
    const { data: existingCountries, error: fetchError } = await supabase
      .from('countries')
      .select('*')

    if (fetchError) {
      console.error("❌ Error fetching countries:", fetchError)
      console.log("\nℹ️  This might mean the countries table doesn't exist.")
      console.log("   Please run the SQL scripts manually in Supabase SQL Editor.")
      return
    }

    console.log(`Found ${existingCountries?.length || 0} existing countries\n`)

    // Step 2: Insert/Update countries
    console.log("📝 Setting up 16 African countries...")
    for (const country of countries) {
      const { error } = await supabase
        .from('countries')
        .upsert(country, { 
          onConflict: 'code',
          ignoreDuplicates: false 
        })
        .select()

      if (error) {
        console.error(`❌ Error with ${country.name}:`, error.message)
      } else {
        console.log(`✅ ${country.flag} ${country.name} (${country.code})`)
      }
    }

    // Step 3: Remove non-African countries
    console.log("\n🗑️  Removing non-African countries...")
    const validCodes = countries.map(c => c.code)
    const { error: deleteError } = await supabase
      .from('countries')
      .delete()
      .not('code', 'in', `(${validCodes.join(',')})`)

    if (deleteError) {
      console.error("❌ Error removing countries:", deleteError)
    }

    // Step 4: Verify final setup
    console.log("\n🔍 Verifying final setup...")
    const { data: finalCountries, error: verifyError } = await supabase
      .from('countries')
      .select('*')
      .order('name')

    if (verifyError) {
      console.error("❌ Error verifying:", verifyError)
    } else {
      console.log(`\n✅ Successfully set up ${finalCountries?.length || 0} countries:`)
      finalCountries?.forEach(country => {
        console.log(`   ${country.flag || '🏳️'} ${country.name} (${country.code}) - ${country.currency_code}`)
      })
    }

    // Step 5: Check for profiles without countries
    console.log("\n📊 Checking user profiles...")
    const { data: profileStats } = await supabase
      .rpc('get_profile_country_stats', {})
      .single()

    if (profileStats) {
      console.log(`   Total profiles: ${profileStats.total_profiles || 0}`)
      console.log(`   With country: ${profileStats.with_country || 0}`)
      console.log(`   Without country: ${profileStats.without_country || 0}`)
    }

    console.log("\n✅ Country setup complete!")
    console.log("\nNOTE: For full country-based data isolation, you still need to:")
    console.log("1. Run the RLS (Row Level Security) SQL scripts in Supabase")
    console.log("2. Ensure all new users select a country during signup")
    console.log("3. Assign countries to existing users without one")

  } catch (error: any) {
    console.error("\n❌ Setup failed:", error.message)
    process.exit(1)
  }
}

// Create the stats function if it doesn't exist
async function createStatsFunction() {
  console.log("Creating helper function...")
  
  console.log(`
To get profile statistics, create this function in Supabase SQL Editor:

CREATE OR REPLACE FUNCTION get_profile_country_stats()
RETURNS TABLE (
  total_profiles BIGINT,
  with_country BIGINT,
  without_country BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_profiles,
    COUNT(country_id)::BIGINT as with_country,
    COUNT(*) FILTER (WHERE country_id IS NULL)::BIGINT as without_country
  FROM profiles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `)
}

// Run the setup
setupCountries()
  .then(() => {
    console.log("\n📋 Next steps:")
    console.log("1. Copy the SQL scripts to Supabase SQL Editor")
    console.log("2. Run them in this order:")
    console.log("   - fix_country_support.sql")
    console.log("   - migrate_country_data.sql")
    console.log("   - country_based_rls.sql")
    process.exit(0)
  })
  .catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
  })