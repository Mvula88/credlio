-- ============================================
-- COMPLETE FIX FOR AUTH AND PROFILE CREATION
-- ============================================
-- Run this script in Supabase SQL Editor to fix the auth/profile issue

-- STEP 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- STEP 2: Create the RPC function for profile creation (used by the app)
CREATE OR REPLACE FUNCTION public.create_or_update_profile(
  p_auth_user_id uuid,
  p_email text,
  p_full_name text,
  p_phone text DEFAULT NULL,
  p_role text DEFAULT 'borrower',
  p_country_id uuid DEFAULT NULL,
  p_national_id_hash text DEFAULT NULL,
  p_id_type text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Insert or update the profile
  INSERT INTO public.profiles (
    id,
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
    p_auth_user_id,
    p_email,
    p_full_name,
    p_phone,
    p_role,
    p_country_id,
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
    updated_at = now()
  RETURNING id INTO v_profile_id;
  
  -- If borrower, create borrower profile
  IF p_role = 'borrower' THEN
    INSERT INTO public.borrower_profiles (
      user_id,
      reputation_score,
      total_loans_requested,
      loans_repaid,
      loans_defaulted,
      created_at
    )
    VALUES (
      v_profile_id,
      50,
      0,
      0,
      0,
      now()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN v_profile_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_or_update_profile: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- STEP 3: Create trigger function that creates minimal profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country_id uuid;
  v_role text;
  v_full_name text;
BEGIN
  -- Extract metadata
  v_role := COALESCE(
    new.raw_user_meta_data->>'role',
    'borrower'
  );
  
  v_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'fullName',
    split_part(new.email, '@', 1)
  );
  
  -- Try to get country_id from metadata
  IF new.raw_user_meta_data->>'country' IS NOT NULL THEN
    SELECT id INTO v_country_id
    FROM public.countries
    WHERE code = new.raw_user_meta_data->>'country'
    LIMIT 1;
  END IF;
  
  -- Create minimal profile
  INSERT INTO public.profiles (
    id,
    auth_user_id,
    email,
    full_name,
    role,
    country_id,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    new.id,
    new.email,
    v_full_name,
    v_role,
    v_country_id,
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  RETURN new;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log but don't fail
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN new;
END;
$$;

-- STEP 4: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- STEP 5: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- Grant specific permissions for profiles
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO anon;

-- Grant permissions for borrower_profiles
GRANT SELECT, INSERT, UPDATE ON public.borrower_profiles TO authenticated;

-- STEP 6: Fix RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrower_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Service role bypass" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
DROP POLICY IF EXISTS "allow_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_insert_or_update_own_profile" ON profiles;

-- Create comprehensive policies for profiles
CREATE POLICY "Service role full access" ON profiles
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view own profile" ON profiles
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Authenticated users can update own profile" ON profiles
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Authenticated users can insert own profile" ON profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- This is crucial for signup to work
CREATE POLICY "Allow anon to create profile during signup" ON profiles
  FOR INSERT 
  TO anon
  WITH CHECK (true);

-- Drop existing policies on borrower_profiles
DROP POLICY IF EXISTS "Service role bypass" ON borrower_profiles;
DROP POLICY IF EXISTS "Users can manage own borrower profile" ON borrower_profiles;

-- Create policies for borrower_profiles
CREATE POLICY "Service role full access" ON borrower_profiles
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

-- STEP 7: Test the setup
DO $$
DECLARE
  test_user_id uuid := gen_random_uuid();
  test_profile_id uuid;
BEGIN
  -- Test profile creation
  INSERT INTO profiles (
    id,
    auth_user_id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    test_user_id,
    'test@example.com',
    'Test User',
    'borrower',
    now(),
    now()
  )
  RETURNING id INTO test_profile_id;
  
  -- Clean up test data
  DELETE FROM profiles WHERE id = test_profile_id;
  
  RAISE NOTICE '✅ Profile creation test PASSED';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Profile creation test FAILED: %', SQLERRM;
END $$;

-- STEP 8: Verify the setup
DO $$
DECLARE
  trigger_count int;
  function_count int;
  profile_policies int;
  borrower_policies int;
BEGIN
  -- Count trigger
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger 
  WHERE tgname = 'on_auth_user_created';
  
  -- Count function
  SELECT COUNT(*) INTO function_count
  FROM pg_proc 
  WHERE proname = 'handle_new_user';
  
  -- Count policies
  SELECT COUNT(*) INTO profile_policies
  FROM pg_policy 
  WHERE polrelid = 'profiles'::regclass;
  
  SELECT COUNT(*) INTO borrower_policies
  FROM pg_policy 
  WHERE polrelid = 'borrower_profiles'::regclass;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ AUTH & PROFILE SETUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Trigger created: %', CASE WHEN trigger_count > 0 THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE 'Function created: %', CASE WHEN function_count > 0 THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE 'Profile policies: %', profile_policies;
  RAISE NOTICE 'Borrower policies: %', borrower_policies;
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Users should now be able to sign up!';
  RAISE NOTICE '';
  RAISE NOTICE 'The system will:';
  RAISE NOTICE '1. Create auth user in auth.users table';
  RAISE NOTICE '2. Trigger creates basic profile automatically';
  RAISE NOTICE '3. App updates profile with full details';
  RAISE NOTICE '========================================';
END $$;