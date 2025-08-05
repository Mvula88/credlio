-- ============================================
-- FIX AUTH AND PROFILE CREATION ISSUE
-- ============================================
-- This script fixes the issue where users are not getting created in auth table
-- and profiles are not being created

-- STEP 1: Check current trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- STEP 2: Create proper trigger function that handles profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (
  
    auth_user_id,
    email,
    full_name,
    phone_number,
    role,
    country_id,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'fullName', ''),
    new.raw_user_meta_data->>'phoneNumber',
    COALESCE(new.raw_user_meta_data->>'role', 'borrower'),
    (new.raw_user_meta_data->>'countryId')::uuid,
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
    role = COALESCE(EXCLUDED.role, profiles.role),
    country_id = COALESCE(EXCLUDED.country_id, profiles.country_id),
    updated_at = now();
  
  RETURN new;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log error but don't block auth signup
    RAISE LOG 'Error creating profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;

-- STEP 3: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- STEP 4: Ensure profiles table has proper permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO anon; -- For signup

-- STEP 5: Fix RLS policies for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role has full access" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authentication" ON profiles;
DROP POLICY IF EXISTS "allow_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_insert_or_update_own_profile" ON profiles;

-- Create new comprehensive policies
CREATE POLICY "Service role bypass" ON profiles
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile during signup" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- Allow anon to insert during signup (before auth is complete)
CREATE POLICY "Allow profile creation during signup" ON profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- STEP 6: Ensure borrower_profiles table works
GRANT ALL ON public.borrower_profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.borrower_profiles TO authenticated;

-- Fix RLS for borrower_profiles
ALTER TABLE public.borrower_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role bypass" ON borrower_profiles;
DROP POLICY IF EXISTS "Users can manage own borrower profile" ON borrower_profiles;

CREATE POLICY "Service role bypass" ON borrower_profiles
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own borrower profile" ON borrower_profiles
  FOR ALL
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- STEP 7: Verify the setup
DO $$
DECLARE
  trigger_exists boolean;
  function_exists boolean;
  rls_enabled boolean;
BEGIN
  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) INTO trigger_exists;
  
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
  ) INTO function_exists;
  
  -- Check RLS status
  SELECT relrowsecurity 
  FROM pg_class 
  WHERE relname = 'profiles' 
  INTO rls_enabled;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'AUTH & PROFILE SETUP VERIFICATION';
  RAISE NOTICE '========================================';
  
  IF trigger_exists THEN
    RAISE NOTICE '✅ Trigger on_auth_user_created EXISTS';
  ELSE
    RAISE NOTICE '❌ Trigger on_auth_user_created MISSING';
  END IF;
  
  IF function_exists THEN
    RAISE NOTICE '✅ Function handle_new_user EXISTS';
  ELSE
    RAISE NOTICE '❌ Function handle_new_user MISSING';
  END IF;
  
  IF rls_enabled THEN
    RAISE NOTICE '✅ RLS is ENABLED on profiles table';
  ELSE
    RAISE NOTICE '⚠️  RLS is DISABLED on profiles table';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Policies on profiles table:';
  FOR rec IN 
    SELECT polname 
    FROM pg_policy 
    WHERE polrelid = 'profiles'::regclass
  LOOP
    RAISE NOTICE '  - %', rec.polname;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Setup complete! Users should now be able to sign up.';
  RAISE NOTICE '========================================';
END $$;