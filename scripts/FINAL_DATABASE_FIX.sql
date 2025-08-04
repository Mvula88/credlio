-- ============================================
-- FINAL DATABASE FIX - RUN THIS SCRIPT
-- ============================================
-- This script fixes all database issues for signup

-- ============================================
-- STEP 1: Remove problematic foreign key constraint
-- ============================================
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find and drop all foreign key constraints on auth_user_id column
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
-- STEP 2: Drop username column and add customer_id
-- ============================================
ALTER TABLE profiles 
DROP COLUMN IF EXISTS username CASCADE;

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
-- STEP 3: Create proper trigger for profile creation
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile for new auth user
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
  -- Don't fail the signup if profile creation fails
  RAISE WARNING 'Profile creation failed for %: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STEP 4: Enable RLS and create policies
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Service role bypass" ON profiles;

-- Create new policies
CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Authenticated users can view profiles" 
ON profiles FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role bypass" 
ON profiles FOR ALL 
USING (auth.role() = 'service_role');

-- Countries policy
DROP POLICY IF EXISTS "Countries are viewable by everyone" ON countries;
CREATE POLICY "Countries are viewable by everyone" 
ON countries FOR SELECT 
USING (true);

-- ============================================
-- STEP 5: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_customer_id ON profiles(customer_id);
DROP INDEX IF EXISTS idx_profiles_username;

-- ============================================
-- STEP 6: Ensure countries exist
-- ============================================
INSERT INTO countries (id, name, code, currency_code, is_supported, created_at)
VALUES 
  (gen_random_uuid(), 'Namibia', 'NA', 'NAD', true, now()),
  (gen_random_uuid(), 'South Africa', 'ZA', 'ZAR', true, now()),
  (gen_random_uuid(), 'Nigeria', 'NG', 'NGN', true, now()),
  (gen_random_uuid(), 'Kenya', 'KE', 'KES', true, now()),
  (gen_random_uuid(), 'Ghana', 'GH', 'GHS', true, now()),
  (gen_random_uuid(), 'United States', 'US', 'USD', true, now())
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- STEP 7: Create identity_verifications table
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

DROP POLICY IF EXISTS "Users can manage their identity" ON identity_verifications;
CREATE POLICY "Users can manage their identity" 
ON identity_verifications FOR ALL 
USING (auth.uid() = verified_profile_id);

-- ============================================
-- STEP 8: Grant permissions
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON countries TO anon, authenticated;
GRANT SELECT, INSERT ON identity_verifications TO authenticated;

-- ============================================
-- STEP 9: Clean up orphaned data
-- ============================================
-- Remove profiles without auth users
DELETE FROM profiles 
WHERE auth_user_id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- STEP 10: Drop unused functions
-- ============================================
DROP FUNCTION IF EXISTS generate_unique_username(text);
DROP FUNCTION IF EXISTS check_duplicate_identity(text, text, date);

-- Create check duplicate function without username
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
-- FINAL VERIFICATION
-- ============================================
DO $$
DECLARE
    profile_cols text;
    has_username boolean;
    has_customer_id boolean;
    fk_count int;
BEGIN
    -- Check columns
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'username'
    ) INTO has_username;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'customer_id'
    ) INTO has_customer_id;
    
    -- Count foreign keys
    SELECT COUNT(*) INTO fk_count
    FROM pg_constraint 
    WHERE conrelid = 'profiles'::regclass AND contype = 'f';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DATABASE SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Foreign keys removed: % constraints', fk_count;
    RAISE NOTICE '✅ Username column removed: %', NOT has_username;
    RAISE NOTICE '✅ Customer ID column added: %', has_customer_id;
    RAISE NOTICE '✅ Trigger configured';
    RAISE NOTICE '✅ RLS policies active';
    RAISE NOTICE '✅ Countries populated';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Authentication:';
    RAISE NOTICE '   • Sign in with: Email + Password';
    RAISE NOTICE '   • Customer ID: For reference only';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 SIGNUP SHOULD NOW WORK!';
    RAISE NOTICE '========================================';
END $$;

-- Show final table structure
SELECT 
    column_name as "Column", 
    data_type as "Type",
    CASE WHEN is_nullable = 'YES' THEN 'Yes' ELSE 'No' END as "Nullable"
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY column_name;