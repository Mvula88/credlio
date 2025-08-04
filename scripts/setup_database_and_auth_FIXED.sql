-- ============================================
-- COMPLETE DATABASE SETUP FOR CREDLIO (FIXED VERSION)
-- ============================================
-- Run this script in your Supabase SQL Editor
-- This fixes signup issues and ensures proper database structure

-- ============================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 2. FIX FOREIGN KEY CONSTRAINT FIRST
-- ============================================
-- Drop existing incorrect constraint if it exists
ALTER TABLE IF EXISTS profiles 
DROP CONSTRAINT IF EXISTS profiles_auth_user_id_fkey;

-- ============================================
-- 3. CREATE OR UPDATE PROFILES TABLE
-- ============================================
-- Ensure profiles table has all required columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS national_id_hash text,
ADD COLUMN IF NOT EXISTS id_type text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS id_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add the CORRECT foreign key constraint pointing to auth.users
ALTER TABLE profiles
ADD CONSTRAINT profiles_auth_user_id_fkey 
FOREIGN KEY (auth_user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- ============================================
-- 4. CREATE TRIGGER FOR AUTOMATIC PROFILE CREATION
-- ============================================
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Only create profile if it doesn't exist
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
    new.id,
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'username', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'borrower'),
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CREATE RLS POLICIES FOR PROFILES
-- ============================================
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON profiles;

-- Policy for users to view their own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Policy for users to insert their own profile (important for signup)
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Policy for public profiles view (optional - for marketplace features)
CREATE POLICY "Public profiles are viewable by authenticated users" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- 7. CREATE RLS POLICIES FOR COUNTRIES
-- ============================================
DROP POLICY IF EXISTS "Countries are viewable by everyone" ON countries;

CREATE POLICY "Countries are viewable by everyone" ON countries
  FOR SELECT USING (true);

-- ============================================
-- 8. CREATE RLS POLICIES FOR IDENTITY VERIFICATIONS
-- ============================================
DROP POLICY IF EXISTS "Users can insert their own identity verification" ON identity_verifications;
DROP POLICY IF EXISTS "Users can view their own identity verification" ON identity_verifications;

-- Create the identity_verifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS identity_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  national_id_hash text,
  full_name text,
  date_of_birth date,
  id_type text,
  country_code text,
  verified_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own identity verification" ON identity_verifications
  FOR INSERT WITH CHECK (auth.uid() = verified_profile_id);

CREATE POLICY "Users can view their own identity verification" ON identity_verifications
  FOR SELECT USING (auth.uid() = verified_profile_id);

-- ============================================
-- 9. INSERT DEFAULT COUNTRIES IF NOT EXISTS
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
-- 10. CREATE FUNCTION TO CHECK DUPLICATE IDENTITY
-- ============================================
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
    OR (full_name = p_full_name AND date_of_birth = p_date_of_birth)
  ) AS is_duplicate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. CREATE FUNCTION TO GENERATE UNIQUE USERNAME
-- ============================================
CREATE OR REPLACE FUNCTION generate_unique_username(country_code text)
RETURNS text AS $$
DECLARE
  new_username text;
  username_exists boolean;
BEGIN
  LOOP
    -- Generate username: COUNTRY-RANDOMNUMBER (e.g., NA-123456)
    new_username := country_code || '-' || LPAD((RANDOM() * 999999)::int::text, 6, '0');
    
    -- Check if username exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE username = new_username) INTO username_exists;
    
    -- If username doesn't exist, return it
    IF NOT username_exists THEN
      RETURN new_username;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 12. GRANT NECESSARY PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- 13. FIX FOR EXISTING ORPHANED AUTH USERS
-- ============================================
-- Create profiles for any auth users that don't have one
INSERT INTO profiles (
  id,
  auth_user_id,
  email,
  full_name,
  role,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  COALESCE(au.raw_user_meta_data->>'role', 'borrower'),
  au.created_at,
  now()
FROM auth.users au
LEFT JOIN profiles p ON p.auth_user_id = au.id
WHERE p.id IS NULL;

-- ============================================
-- 14. VERIFY FOREIGN KEY IS CORRECT
-- ============================================
DO $$
DECLARE
  fk_correct boolean;
BEGIN
  -- Check if foreign key points to auth.users
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'profiles_auth_user_id_fkey' 
    AND table_schema = 'auth' 
    AND table_name = 'users'
  ) INTO fk_correct;
  
  IF fk_correct THEN
    RAISE NOTICE '✅ Foreign key constraint is correctly pointing to auth.users';
  ELSE
    RAISE EXCEPTION '❌ Foreign key constraint is not pointing to auth.users - please run the fix_auth_foreign_key.sql script';
  END IF;
END $$;

-- ============================================
-- 15. FINAL VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ Database setup completed!';
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ Foreign key fixed (auth.users)';
  RAISE NOTICE '✅ Profiles table configured';
  RAISE NOTICE '✅ RLS policies created';
  RAISE NOTICE '✅ Triggers configured';
  RAISE NOTICE '✅ Countries populated';
  RAISE NOTICE '✅ Functions created';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '1. Configure Resend SMTP in Supabase Dashboard';
  RAISE NOTICE '2. Test signup flow with a new email';
  RAISE NOTICE '3. Check browser console for any errors';
  RAISE NOTICE '====================================';
END $$;

-- ============================================
-- TROUBLESHOOTING QUERIES
-- ============================================
-- Use these queries to debug issues:

-- Check if a user exists in auth.users:
-- SELECT * FROM auth.users WHERE email = 'your-email@example.com';

-- Check if profile exists:
-- SELECT * FROM profiles WHERE email = 'your-email@example.com';

-- Check countries:
-- SELECT * FROM countries;

-- Check RLS policies:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Check if trigger exists:
-- SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';

-- Verify foreign key is correct:
-- SELECT 
--     tc.constraint_name, 
--     tc.table_name, 
--     kcu.column_name, 
--     ccu.table_schema AS foreign_table_schema,
--     ccu.table_name AS foreign_table_name,
--     ccu.column_name AS foreign_column_name 
-- FROM 
--     information_schema.table_constraints AS tc 
--     JOIN information_schema.key_column_usage AS kcu
--       ON tc.constraint_name = kcu.constraint_name
--     JOIN information_schema.constraint_column_usage AS ccu
--       ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' 
--     AND tc.table_name='profiles';