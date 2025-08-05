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

async function populateCountries() {
  console.log("🚀 Starting to populate countries...")

  try {
    // First, check if countries table exists and has data
    const { data: existingCountries, error: fetchError } = await supabase
      .from('countries')
      .select('*')

    if (fetchError) {
      console.error("❌ Error fetching existing countries:", fetchError)
      console.log("Make sure the countries table exists in your database")
      return
    }

    console.log(`📊 Found ${existingCountries?.length || 0} existing countries`)
    if (existingCountries && existingCountries.length > 0) {
      console.log("Sample country structure:", JSON.stringify(existingCountries[0], null, 2))
    }

    // Insert or update each country
    for (const country of countries) {
      const { data, error } = await supabase
        .from('countries')
        .upsert(country, { 
          onConflict: 'code',
          ignoreDuplicates: false 
        })
        .select()

      if (error) {
        console.error(`❌ Error inserting ${country.name}:`, error)
      } else {
        console.log(`✅ Successfully upserted ${country.name}`)
      }
    }

    // Verify all countries were added
    const { data: allCountries, error: verifyError } = await supabase
      .from('countries')
      .select('*')
      .order('name')

    if (verifyError) {
      console.error("❌ Error verifying countries:", verifyError)
    } else {
      console.log(`\n🎉 Success! Total countries in database: ${allCountries?.length || 0}`)
      console.log("\nCountries available:")
      allCountries?.forEach(country => {
        console.log(`  ${country.flag} ${country.name} (${country.code})`)
      })
    }

  } catch (error) {
    console.error("❌ Unexpected error:", error)
  }
}

// Run the script
populateCountries()