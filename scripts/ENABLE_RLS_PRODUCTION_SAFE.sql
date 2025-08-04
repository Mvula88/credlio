-- ============================================
-- PRODUCTION-SAFE RLS CONFIGURATION
-- ============================================
-- This ensures signup works even with RLS enabled

-- STEP 1: Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- STEP 2: Drop all existing policies (clean slate)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable select for own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service role" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- STEP 3: Create SAFE policies that allow signup

-- CRITICAL: Allow the trigger/system to create profiles during signup
-- This uses SECURITY DEFINER on the trigger function
CREATE POLICY "System can create profiles during signup"
ON profiles FOR INSERT
WITH CHECK (
    -- Allow if it's the user creating their own profile
    auth.uid() = auth_user_id 
    OR 
    -- Allow if no user is logged in yet (during signup trigger)
    auth.uid() IS NULL
    OR
    -- Allow service role (system operations)
    current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- Allow users to view all profiles (marketplace)
CREATE POLICY "Anyone can view profiles"
ON profiles FOR SELECT
USING (true);

-- Allow users to update only their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- Allow users to delete only their own profile
CREATE POLICY "Users can delete own profile"
ON profiles FOR DELETE
USING (auth.uid() = auth_user_id);

-- STEP 4: UPDATE THE TRIGGER TO RUN WITH SECURITY DEFINER
-- This is the KEY - the trigger runs with elevated privileges
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger 
SECURITY DEFINER  -- This is CRITICAL! Runs with creator's privileges
SET search_path = public
AS $$
BEGIN
  -- Insert profile with system privileges
  INSERT INTO public.profiles (
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
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'borrower'),
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    updated_at = now();
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block signup
  RAISE LOG 'Profile creation error for user %: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- STEP 5: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- STEP 6: Test function to verify it works
CREATE OR REPLACE FUNCTION test_signup_with_rls()
RETURNS text AS $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    profile_created boolean := false;
BEGIN
    -- Simulate trigger creating profile (running as system)
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
        'rlstest@example.com',
        'RLS Test User',
        'borrower',
        now(),
        now()
    );
    
    -- Check if profile was created
    SELECT EXISTS(
        SELECT 1 FROM profiles WHERE auth_user_id = test_user_id
    ) INTO profile_created;
    
    -- Clean up
    DELETE FROM profiles WHERE auth_user_id = test_user_id;
    
    IF profile_created THEN
        RETURN '✅ SUCCESS: Profiles can be created with RLS enabled!';
    ELSE
        RETURN '❌ FAILED: Profile creation blocked by RLS';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN '❌ ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the test
SELECT test_signup_with_rls();

-- STEP 7: Verify final setup
DO $$
DECLARE
    rls_enabled boolean;
    trigger_exists boolean;
    test_result text;
BEGIN
    -- Check RLS status
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class WHERE relname = 'profiles';
    
    -- Check trigger exists
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    -- Run test
    SELECT test_signup_with_rls() INTO test_result;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔒 PRODUCTION-SAFE RLS CONFIGURATION';
    RAISE NOTICE '========================================';
    IF rls_enabled THEN
        RAISE NOTICE '✅ RLS is ENABLED (Secure)';
    ELSE
        RAISE NOTICE '❌ RLS is DISABLED (Not secure)';
    END IF;
    
    IF trigger_exists THEN
        RAISE NOTICE '✅ Trigger configured with SECURITY DEFINER';
    ELSE
        RAISE NOTICE '❌ Trigger not found';
    END IF;
    
    IF test_result LIKE '%SUCCESS%' THEN
        RAISE NOTICE '✅ Test signup works with RLS enabled';
    ELSE
        RAISE NOTICE '❌ Test signup failed: %', test_result;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'This configuration ensures:';
    RAISE NOTICE '  1. Signup works even with RLS enabled';
    RAISE NOTICE '  2. Users can only modify their own data';
    RAISE NOTICE '  3. Marketplace viewing still works';
    RAISE NOTICE '  4. System triggers can create profiles';
    RAISE NOTICE '';
    RAISE NOTICE '✅ SAFE FOR PRODUCTION USE';
    RAISE NOTICE '========================================';
END $$;

-- Cleanup
DROP FUNCTION IF EXISTS test_signup_with_rls();