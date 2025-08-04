-- =====================================================
-- FIX FOR "Database error saving new user" 
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. First, ensure the trigger function exists correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    auth_user_id,
    email,
    full_name,
    username,
    role,
    country
  ) VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_user_meta_data->>'role', 'borrower'),
    NEW.raw_user_meta_data->>'country'
  );
  RETURN NEW;
EXCEPTION
  WHEN duplicate_key_value_violates_unique_constraint THEN
    -- If profile already exists, just return (don't error)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Ensure RLS policies allow profile operations
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "allow_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_select_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_insert_or_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "service_role_bypass" ON profiles;

-- Create comprehensive policies
CREATE POLICY "Enable all operations for own profile" ON profiles
    FOR ALL TO authenticated
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

-- Service role can do anything (for trigger operations)
CREATE POLICY "Service role full access" ON profiles
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 4. Ensure identity_verifications table has proper policies
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON identity_verifications;
DROP POLICY IF EXISTS "Service role full access" ON identity_verifications;

CREATE POLICY "Enable insert for authenticated users" ON identity_verifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Service role full access" ON identity_verifications
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 5. Ensure the RPC functions exist
CREATE OR REPLACE FUNCTION check_duplicate_identity(
  p_national_id_hash TEXT,
  p_full_name TEXT,
  p_date_of_birth DATE
)
RETURNS TABLE(is_duplicate BOOLEAN, existing_user_id UUID, reason TEXT) AS $$
BEGIN
  -- Check exact ID match
  IF EXISTS(SELECT 1 FROM profiles WHERE national_id_hash = p_national_id_hash) THEN
    RETURN QUERY
    SELECT 
      TRUE,
      id,
      'Exact ID match found'::TEXT
    FROM profiles 
    WHERE national_id_hash = p_national_id_hash
    LIMIT 1;
    RETURN;
  END IF;
  
  -- No duplicate found
  RETURN QUERY SELECT FALSE, NULL::UUID, 'No duplicate found'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_unique_username(country_code TEXT)
RETURNS TEXT AS $$
DECLARE
  new_username TEXT;
  username_exists BOOLEAN;
  counter INT := 0;
BEGIN
  LOOP
    -- Generate username: CRD-COUNTRY-YEAR-RANDOM
    new_username := 'CRD-' || UPPER(COALESCE(country_code, 'XX')) || '-' || 
                    EXTRACT(YEAR FROM NOW())::TEXT || '-' || 
                    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
    
    -- Check if username exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE username = new_username) INTO username_exists;
    
    -- If unique, return it
    IF NOT username_exists THEN
      RETURN new_username;
    END IF;
    
    -- Safety counter to prevent infinite loop
    counter := counter + 1;
    IF counter > 100 THEN
      -- Just return a UUID-based username as fallback
      RETURN 'CRD-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- Grant specific permissions for authenticated users
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT ON identity_verifications TO authenticated;
GRANT EXECUTE ON FUNCTION check_duplicate_identity TO authenticated;
GRANT EXECUTE ON FUNCTION generate_unique_username TO authenticated;

-- 7. Verify the setup
SELECT 
  'Trigger exists' as check_type,
  EXISTS(
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created'
  ) as result;

SELECT 
  'RLS enabled on profiles' as check_type,
  relrowsecurity as result
FROM pg_class 
WHERE relname = 'profiles';

-- 8. Make sure country_id can accept both UUID and country code
ALTER TABLE profiles 
ALTER COLUMN country_id TYPE TEXT USING country_id::TEXT;

-- Rename country_id to country for clarity (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'profiles' AND column_name = 'country_id') THEN
    ALTER TABLE profiles RENAME COLUMN country_id TO country;
  END IF;
END $$;

-- Add country column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS country TEXT;

-- 9. Ensure all required columns exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS national_id_hash TEXT,
ADD COLUMN IF NOT EXISTS id_type TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT FALSE;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Success message
SELECT 'Database setup completed successfully! Try signing up again.' as message;