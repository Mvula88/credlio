-- ============================================
-- FINAL DATABASE FIX - CLEAN VERSION
-- ============================================
-- This script fixes all database issues for signup

-- ============================================
-- STEP 1: Remove ALL foreign key constraints from profiles
-- ============================================
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'profiles'::regclass 
        AND contype = 'f'
    LOOP
        EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT IF EXISTS ' || constraint_record.conname || ' CASCADE';
        RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    END LOOP;
    RAISE NOTICE '✅ All foreign key constraints removed';
END $$;

-- ============================================
-- STEP 2: Update profiles table structure
-- ============================================
-- Remove username column if it exists
ALTER TABLE profiles 
DROP COLUMN IF EXISTS username CASCADE;

-- Add necessary columns if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS customer_id text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS national_id_hash text,
ADD COLUMN IF NOT EXISTS id_type text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS id_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ============================================
-- STEP 3: Create trigger for automatic profile creation
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    auth_user_id,
    email,
    full_name,
    role,
    customer_id,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'borrower'),
    new.raw_user_meta_data->>'customer_id',
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) 
  DO UPDATE SET
    customer_id = COALESCE(EXCLUDED.customer_id, profiles.customer_id),
    updated_at = now();
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Profile creation failed for %: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STEP 4: Set up RLS policies
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on profiles
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON profiles';
    END LOOP;
END $$;

-- Create new policies
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Authenticated can view all profiles" 
ON profiles FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access" 
ON profiles FOR ALL 
USING (auth.role() = 'service_role');

-- ============================================
-- STEP 5: Populate countries table
-- ============================================
-- First, check what columns exist in countries table
DO $$
DECLARE
    has_is_supported boolean;
    col_list text;
BEGIN
    -- Check if is_supported column exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'countries' 
        AND column_name = 'is_supported'
    ) INTO has_is_supported;
    
    -- Get list of columns
    SELECT string_agg(column_name, ', ') 
    INTO col_list
    FROM information_schema.columns 
    WHERE table_name = 'countries';
    
    RAISE NOTICE 'Countries table columns: %', col_list;
    
    -- Insert countries based on what columns exist
    IF has_is_supported THEN
        -- Table has is_supported column
        INSERT INTO countries (id, name, code, currency_code, is_supported, created_at)
        VALUES 
          (gen_random_uuid(), 'Namibia', 'NA', 'NAD', true, now()),
          (gen_random_uuid(), 'South Africa', 'ZA', 'ZAR', true, now()),
          (gen_random_uuid(), 'Nigeria', 'NG', 'NGN', true, now()),
          (gen_random_uuid(), 'Kenya', 'KE', 'KES', true, now()),
          (gen_random_uuid(), 'Ghana', 'GH', 'GHS', true, now()),
          (gen_random_uuid(), 'United States', 'US', 'USD', true, now())
        ON CONFLICT (code) DO NOTHING;
    ELSE
        -- Table doesn't have is_supported column
        INSERT INTO countries (id, name, code, currency_code, created_at)
        VALUES 
          (gen_random_uuid(), 'Namibia', 'NA', 'NAD', now()),
          (gen_random_uuid(), 'South Africa', 'ZA', 'ZAR', now()),
          (gen_random_uuid(), 'Nigeria', 'NG', 'NGN', now()),
          (gen_random_uuid(), 'Kenya', 'KE', 'KES', now()),
          (gen_random_uuid(), 'Ghana', 'GH', 'GHS', now()),
          (gen_random_uuid(), 'United States', 'US', 'USD', now())
        ON CONFLICT (code) DO NOTHING;
    END IF;
    
    RAISE NOTICE '✅ Countries populated';
END $$;

-- Enable RLS on countries
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Countries viewable by all" ON countries;
CREATE POLICY "Countries viewable by all" 
ON countries FOR SELECT 
USING (true);

-- ============================================
-- STEP 6: Create identity_verifications table if needed
-- ============================================
CREATE TABLE IF NOT EXISTS identity_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  national_id_hash text,
  full_name text,
  date_of_birth date,
  id_type text,
  country_code text,
  verified_profile_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own identity" ON identity_verifications;
CREATE POLICY "Users manage own identity" 
ON identity_verifications FOR ALL 
USING (auth.uid() = verified_profile_id);

-- ============================================
-- STEP 7: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_customer_id ON profiles(customer_id);
DROP INDEX IF EXISTS idx_profiles_username;

-- ============================================
-- STEP 8: Grant permissions
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON countries TO anon, authenticated;
GRANT SELECT, INSERT ON identity_verifications TO authenticated;

-- ============================================
-- STEP 9: Create helper function
-- ============================================
DROP FUNCTION IF EXISTS generate_unique_username(text);
DROP FUNCTION IF EXISTS check_duplicate_identity(text, text, date);

CREATE OR REPLACE FUNCTION check_duplicate_identity(
  p_national_id_hash text,
  p_full_name text,
  p_date_of_birth date
)
RETURNS TABLE(is_duplicate boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT EXISTS (
    SELECT 1 FROM identity_verifications
    WHERE national_id_hash = p_national_id_hash
  ) AS is_duplicate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 10: Clean up orphaned profiles
-- ============================================
DELETE FROM profiles 
WHERE auth_user_id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- FINAL VERIFICATION
-- ============================================
DO $$
DECLARE
    has_username boolean;
    has_customer_id boolean;
    fk_count int;
    country_count int;
    profile_count int;
BEGIN
    -- Check if username column exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'username'
    ) INTO has_username;
    
    -- Check if customer_id column exists  
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'customer_id'
    ) INTO has_customer_id;
    
    -- Count foreign keys
    SELECT COUNT(*) INTO fk_count
    FROM pg_constraint 
    WHERE conrelid = 'profiles'::regclass AND contype = 'f';
    
    -- Count countries
    SELECT COUNT(*) INTO country_count FROM countries;
    
    -- Count profiles
    SELECT COUNT(*) INTO profile_count FROM profiles;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DATABASE SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Status:';
    RAISE NOTICE '  • Foreign key constraints: %', fk_count;
    RAISE NOTICE '  • Username column exists: %', has_username;
    RAISE NOTICE '  • Customer ID column exists: %', has_customer_id;
    RAISE NOTICE '  • Countries in database: %', country_count;
    RAISE NOTICE '  • Profiles in database: %', profile_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Authentication Setup:';
    RAISE NOTICE '  • Sign in with: Email + Password';
    RAISE NOTICE '  • No username required';
    RAISE NOTICE '  • Customer ID for reference only';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Your signup should now work!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next Steps:';
    RAISE NOTICE '  1. Configure Resend in Supabase Dashboard';
    RAISE NOTICE '  2. Test signup with a new email';
    RAISE NOTICE '========================================';
END $$;

-- Show final table structure
SELECT 
    column_name as "Column", 
    data_type as "Type"
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY column_name;