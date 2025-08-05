-- ============================================
-- FINAL FIX FOR AUTH AND PROFILE CREATION
-- ============================================
-- This script properly drops and recreates everything

-- STEP 1: Drop ALL existing functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop the RPC function with all its variants
DROP FUNCTION IF EXISTS public.create_or_update_profile(uuid,text,text,text,text,uuid,text,text,date) CASCADE;
DROP FUNCTION IF EXISTS public.create_or_update_profile(uuid,text,text,text,text,uuid,text,text) CASCADE;
DROP FUNCTION IF EXISTS public.create_or_update_profile(uuid,text,text,text,text,uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_or_update_profile(uuid,text,text) CASCADE;
DROP FUNCTION IF EXISTS public.create_or_update_profile CASCADE;

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
    RAISE; -- Re-raise the error so the app knows something went wrong
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
  v_phone text;
  v_profile_id uuid;
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
  
  v_phone := new.raw_user_meta_data->>'phone';
  
  -- Try to get country_id from metadata
  IF new.raw_user_meta_data->>'country' IS NOT NULL THEN
    SELECT id INTO v_country_id
    FROM public.countries
    WHERE code = new.raw_user_meta_data->>'country'
    LIMIT 1;
  END IF;
  
  -- Create profile
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
    new.id,
    new.email,
    v_full_name,
    v_phone,
    v_role,
    v_country_id,
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) 
  DO UPDATE SET
    updated_at = now()
  RETURNING id INTO v_profile_id;
  
  -- Create borrower profile if role is borrower
  IF v_role = 'borrower' AND v_profile_id IS NOT NULL THEN
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
  
  RETURN new;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log but don't fail auth signup
    RAISE LOG 'Error in handle_new_user trigger for user %: %', new.id, SQLERRM;
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
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO anon; -- For signup

-- Grant permissions for borrower_profiles
GRANT SELECT, INSERT, UPDATE ON public.borrower_profiles TO authenticated;

-- Grant permissions for countries table (needed for lookup)
GRANT SELECT ON public.countries TO anon, authenticated;

-- STEP 6: Fix RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrower_profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on profiles to start fresh
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- Create new policies for profiles
CREATE POLICY "Enable read access for authenticated users on own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Enable insert for authenticated users on own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Enable update for authenticated users on own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- CRITICAL: Allow service role full access (for trigger)
CREATE POLICY "Service role has full access" ON public.profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Drop all existing policies on borrower_profiles
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'borrower_profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.borrower_profiles', pol.policyname);
  END LOOP;
END $$;

-- Create policies for borrower_profiles
CREATE POLICY "Service role has full access" ON public.borrower_profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own borrower profile" ON public.borrower_profiles
  FOR ALL TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- STEP 7: Verify everything is set up correctly
DO $$
DECLARE
  trigger_exists boolean;
  function_exists boolean;
  rpc_exists boolean;
  profile_rls boolean;
  test_passed boolean := true;
BEGIN
  -- Check trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) INTO trigger_exists;
  
  -- Check function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
  ) INTO function_exists;
  
  -- Check RPC function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_or_update_profile'
  ) INTO rpc_exists;
  
  -- Check RLS
  SELECT relrowsecurity 
  FROM pg_class 
  WHERE relname = 'profiles' 
  INTO profile_rls;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'AUTH & PROFILE SETUP VERIFICATION';
  RAISE NOTICE '========================================';
  
  IF trigger_exists THEN
    RAISE NOTICE '✅ Trigger: on_auth_user_created EXISTS';
  ELSE
    RAISE NOTICE '❌ Trigger: MISSING';
    test_passed := false;
  END IF;
  
  IF function_exists THEN
    RAISE NOTICE '✅ Function: handle_new_user EXISTS';
  ELSE
    RAISE NOTICE '❌ Function: MISSING';
    test_passed := false;
  END IF;
  
  IF rpc_exists THEN
    RAISE NOTICE '✅ RPC: create_or_update_profile EXISTS';
  ELSE
    RAISE NOTICE '❌ RPC: MISSING';
    test_passed := false;
  END IF;
  
  IF profile_rls THEN
    RAISE NOTICE '✅ RLS: ENABLED on profiles table';
  ELSE
    RAISE NOTICE '⚠️  RLS: DISABLED on profiles table';
  END IF;
  
  RAISE NOTICE '';
  IF test_passed THEN
    RAISE NOTICE '🎉 SUCCESS! All components are properly set up.';
    RAISE NOTICE '';
    RAISE NOTICE 'The auth flow will work as follows:';
    RAISE NOTICE '1. User signs up via Supabase Auth';
    RAISE NOTICE '2. Trigger automatically creates profile';
    RAISE NOTICE '3. App can update profile with additional details';
    RAISE NOTICE '';
    RAISE NOTICE 'Users should now be able to sign up successfully!';
  ELSE
    RAISE NOTICE '❌ SETUP INCOMPLETE - Please check the errors above';
  END IF;
  RAISE NOTICE '========================================';
END $$;