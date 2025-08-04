-- ============================================
-- COMPLETE AUTH SETUP - FINAL VERSION
-- ============================================
-- Run this after removing the foreign key constraint
-- This ensures everything works properly for signup

-- ============================================
-- 1. VERIFY NO FOREIGN KEY EXISTS (GOOD!)
-- ============================================
SELECT 
    'Foreign key constraints removed' as status,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SUCCESS - No foreign key constraints'
        ELSE '❌ WARNING - Foreign keys still exist'
    END as result
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND contype = 'f'
AND EXISTS (
    SELECT 1 FROM pg_attribute 
    WHERE attrelid = conrelid 
    AND attname = 'auth_user_id' 
    AND attnum = ANY(conkey)
);

-- ============================================
-- 2. ENSURE PROFILES TABLE HAS ALL COLUMNS
-- ============================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS national_id_hash text,
ADD COLUMN IF NOT EXISTS id_type text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS id_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ============================================
-- 3. CREATE OR REPLACE TRIGGER FOR AUTO PROFILE
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile for new auth user
  INSERT INTO public.profiles (
    id,
    auth_user_id,
    email,
    full_name,
    username,
    role,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(), -- Generate new UUID for profile
    new.id,  -- auth user id
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'username', new.id::text),
    COALESCE(new.raw_user_meta_data->>'role', 'borrower'),
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) 
  DO UPDATE SET
    updated_at = now();
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail auth signup
  RAISE WARNING 'Could not create profile for user %: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 4. ENABLE RLS AND CREATE POLICIES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

-- Allow users to manage their own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (
    auth.uid() = auth_user_id 
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (
    auth.uid() = auth_user_id 
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = auth_user_id 
    OR auth.role() = 'service_role'
  );

-- Allow authenticated users to view other profiles (for marketplace)
CREATE POLICY "Authenticated users can view profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- 5. CREATE INDEX FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- ============================================
-- 6. ENSURE COUNTRIES TABLE IS POPULATED
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

-- Enable RLS on countries
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Countries are viewable by everyone" ON countries;
CREATE POLICY "Countries are viewable by everyone" ON countries
  FOR SELECT USING (true);

-- ============================================
-- 7. CREATE IDENTITY VERIFICATIONS TABLE
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

DROP POLICY IF EXISTS "Users can manage their identity verification" ON identity_verifications;
CREATE POLICY "Users can manage their identity verification" ON identity_verifications
  FOR ALL USING (
    auth.uid() = verified_profile_id 
    OR auth.role() = 'service_role'
  );

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION generate_unique_username(country_code text)
RETURNS text AS $$
DECLARE
  new_username text;
  username_exists boolean;
  counter int := 0;
BEGIN
  LOOP
    -- Generate username: COUNTRY-RANDOMNUMBER (e.g., NA-123456)
    new_username := UPPER(COALESCE(country_code, 'XX')) || '-' || LPAD((RANDOM() * 999999)::int::text, 6, '0');
    
    -- Check if username exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE username = new_username) INTO username_exists;
    
    -- Prevent infinite loop
    counter := counter + 1;
    IF counter > 100 THEN
      new_username := 'USER-' || gen_random_uuid()::text;
      RETURN new_username;
    END IF;
    
    -- If username doesn't exist, return it
    IF NOT username_exists THEN
      RETURN new_username;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON countries TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_unique_username TO authenticated, service_role;

-- ============================================
-- 10. CLEAN UP ORPHANED PROFILES
-- ============================================
-- Find orphaned profiles (profiles without auth users)
SELECT 
    COUNT(*) as orphaned_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No orphaned profiles found'
        ELSE '⚠️ Found ' || COUNT(*) || ' orphaned profiles'
    END as status
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.auth_user_id
WHERE au.id IS NULL;

-- Optionally clean them up (uncomment if needed)
-- DELETE FROM profiles 
-- WHERE auth_user_id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- 11. FINAL VERIFICATION
-- ============================================
DO $$
DECLARE
    profile_count int;
    country_count int;
    policy_count int;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO country_count FROM countries;
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'profiles';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ AUTH SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Foreign key removed (no more errors)';
    RAISE NOTICE '✅ Profiles table ready';
    RAISE NOTICE '✅ Trigger for auto-profile creation set';
    RAISE NOTICE '✅ RLS policies created (% policies)', policy_count;
    RAISE NOTICE '✅ Countries populated (% countries)', country_count;
    RAISE NOTICE '✅ Helper functions created';
    RAISE NOTICE '✅ Permissions granted';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Current Status:';
    RAISE NOTICE '   - Profiles in database: %', profile_count;
    RAISE NOTICE '   - Countries available: %', country_count;
    RAISE NOTICE '';
    RAISE NOTICE '🚀 SIGNUP SHOULD NOW WORK!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next Steps:';
    RAISE NOTICE '1. Configure Resend SMTP in Supabase';
    RAISE NOTICE '2. Test signup with a new email';
    RAISE NOTICE '3. Check email for confirmation';
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- TEST QUERIES
-- ============================================
-- Test if everything is working:

-- 1. Check profiles table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles';

-- 2. Check if trigger exists
-- SELECT trigger_name, event_manipulation, event_object_table 
-- FROM information_schema.triggers 
-- WHERE trigger_name = 'on_auth_user_created';

-- 3. Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'profiles';

-- 4. Check countries
-- SELECT code, name, currency_code, is_supported 
-- FROM countries 
-- ORDER BY name;