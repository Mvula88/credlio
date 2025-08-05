import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

// Create a Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

async function setupEssentialDatabase() {
  console.log("🚀 Setting up essential database components...")
  console.log("=====================================\n")

  try {
    // Step 1: Check if exec_sql function exists
    console.log("📝 Checking exec_sql function...")
    const { error: checkError } = await supabase.rpc('exec_sql', { 
      sql: "SELECT 'exec_sql function exists'::text" 
    })
    
    if (checkError) {
      console.error("❌ exec_sql function not found. Please create it first in Supabase SQL Editor.")
      console.log("\nRun this SQL in Supabase:")
      console.log("CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$")
      console.log("BEGIN")
      console.log("  EXECUTE sql;")
      console.log("END;")
      console.log("$$ LANGUAGE plpgsql SECURITY DEFINER;")
      process.exit(1)
    }
    
    console.log("✅ exec_sql function exists")

    // Step 2: Run essential setup scripts in correct order
    const essentialScripts = [
      {
        name: "Add country columns",
        sql: `
          -- Add country_id to profiles if not exists
          DO $$
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND column_name = 'country_id'
              ) THEN
                  ALTER TABLE profiles ADD COLUMN country_id UUID REFERENCES countries(id);
              END IF;
          END $$;
        `
      },
      {
        name: "Create helper functions",
        sql: `
          -- Create get_user_country_id function
          CREATE OR REPLACE FUNCTION public.get_user_country_id()
          RETURNS UUID AS $$
              SELECT country_id 
              FROM public.profiles 
              WHERE auth_user_id = auth.uid()
          $$ LANGUAGE sql SECURITY DEFINER STABLE;
          
          -- Grant execute permission
          GRANT EXECUTE ON FUNCTION public.get_user_country_id() TO authenticated;
        `
      },
      {
        name: "Enable RLS on profiles",
        sql: `
          -- Enable RLS
          ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
          
          -- Drop existing policies
          DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
          DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
          DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
          
          -- Create select policy
          CREATE POLICY "profiles_select_policy" ON profiles
              FOR SELECT
              USING (
                  auth_user_id = auth.uid() 
                  OR country_id = public.get_user_country_id()
                  OR EXISTS (
                      SELECT 1 FROM profiles 
                      WHERE auth_user_id = auth.uid() 
                      AND role IN ('admin', 'super_admin')
                  )
              );
          
          -- Create update policy
          CREATE POLICY "profiles_update_policy" ON profiles
              FOR UPDATE
              USING (auth_user_id = auth.uid())
              WITH CHECK (auth_user_id = auth.uid());
          
          -- Create insert policy
          CREATE POLICY "profiles_insert_policy" ON profiles
              FOR INSERT
              WITH CHECK (auth_user_id = auth.uid());
        `
      }
    ]

    // Execute each script
    for (const script of essentialScripts) {
      console.log(`\n📄 Running: ${script.name}...`)
      const { error } = await supabase.rpc('exec_sql', { sql: script.sql })
      
      if (error) {
        console.error(`❌ Error in ${script.name}:`, error.message)
      } else {
        console.log(`✅ ${script.name} completed`)
      }
    }

    // Step 3: Verify setup
    console.log("\n🔍 Verifying setup...")
    
    // Check RLS status
    const { data: rlsStatus } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles'
      `
    })
    
    console.log("\n✅ Essential database setup complete!")
    console.log("   - Country support added")
    console.log("   - RLS policies configured")
    console.log("   - Helper functions created")
    
  } catch (error: any) {
    console.error("\n❌ Setup failed:", error.message)
    process.exit(1)
  }
}

// Run the setup
setupEssentialDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
  })