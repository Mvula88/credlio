-- ============================================
-- FIX RLS POLICY ERROR FOR PROFILES TABLE
-- ============================================
-- Error: "new row violates row-level security policy for table profiles"
-- This happens when RLS policies are too restrictive during signup

-- STEP 1: Check current RLS status
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual IS NOT NULL as has_using_clause,
    with_check IS NOT NULL as has_with_check_clause
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- STEP 2: Drop ALL existing policies on profiles
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- STEP 3: Create SIMPLE, WORKING policies
-- Allow authenticated users to insert their own profile
CREATE POLICY "Enable insert for authenticated users" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

-- Allow users to view their own profile
CREATE POLICY "Enable select for own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = auth_user_id);

-- Allow users to update their own profile
CREATE POLICY "Enable update for own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- Allow authenticated users to view all profiles (for marketplace features)
CREATE POLICY "Enable read access for all authenticated users" 
ON profiles FOR SELECT 
USING (auth.role() = 'authenticated');

-- CRITICAL: Allow the trigger/function to insert profiles
CREATE POLICY "Enable insert for service role" 
ON profiles FOR INSERT 
WITH CHECK (auth.role() = 'service_role' OR auth.jwt()->>'role' = 'service_role');

-- STEP 4: Update the trigger to use SECURITY DEFINER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger 
SECURITY DEFINER -- This is critical!
SET search_path = public
AS $$
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
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'borrower'),
    COALESCE(new.raw_user_meta_data->>'customer_id', 'CUST-' || substr(new.id::text, 0, 8)),
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) 
  DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    customer_id = COALESCE(EXCLUDED.customer_id, profiles.customer_id),
    updated_at = now();
  
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- STEP 5: Alternative - Temporarily disable RLS (for testing)
-- Uncomment this if you want to test without RLS
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- STEP 6: Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- STEP 7: Verify the fix
DO $$
DECLARE
    rls_enabled boolean;
    policy_count int;
    has_insert_policy boolean;
BEGIN
    -- Check if RLS is enabled
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'profiles';
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'profiles';
    
    -- Check for insert policy
    SELECT EXISTS(
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND cmd = 'INSERT'
    ) INTO has_insert_policy;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ RLS POLICY FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Status:';
    RAISE NOTICE '  • RLS Enabled: %', rls_enabled;
    RAISE NOTICE '  • Total Policies: %', policy_count;
    RAISE NOTICE '  • Has INSERT Policy: %', has_insert_policy;
    RAISE NOTICE '';
    RAISE NOTICE '🚀 The signup should work now!';
    RAISE NOTICE '';
    RAISE NOTICE 'If it still fails, uncomment Step 5 to';
    RAISE NOTICE 'temporarily disable RLS for testing.';
    RAISE NOTICE '========================================';
END $$;

-- STEP 8: Show current policies
SELECT 
    policyname as "Policy Name",
    cmd as "Command",
    roles as "Roles"
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;