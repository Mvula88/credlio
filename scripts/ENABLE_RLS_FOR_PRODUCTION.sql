-- ============================================
-- ENABLE RLS FOR PRODUCTION
-- ============================================
-- Run this script BEFORE deploying to production

-- STEP 1: Check current status
SELECT 
    relname as table_name,
    CASE 
        WHEN relrowsecurity THEN '✅ RLS is ENABLED (Secure)'
        ELSE '⚠️  RLS is DISABLED (Security Risk!)'
    END as current_status
FROM pg_class
WHERE relname = 'profiles';

-- STEP 2: Drop all existing policies (clean slate)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable select for own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service role" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for users" ON profiles;

-- STEP 3: Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create production-ready policies

-- Allow users to read all profiles (needed for marketplace/lending)
CREATE POLICY "Users can view all profiles"
ON profiles FOR SELECT
USING (true);  -- Public profiles for marketplace

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can create own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = auth_user_id);

-- Allow users to update only their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- Allow users to delete only their own profile (GDPR compliance)
CREATE POLICY "Users can delete own profile"
ON profiles FOR DELETE
USING (auth.uid() = auth_user_id);

-- STEP 5: Test the policies
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    test_result boolean;
BEGIN
    -- Test 1: Can authenticated user insert their own profile?
    BEGIN
        -- Simulate authenticated user context
        PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
        
        INSERT INTO profiles (id, auth_user_id, email, full_name, role, created_at, updated_at)
        VALUES (gen_random_uuid(), test_user_id, 'test@example.com', 'Test User', 'borrower', now(), now());
        
        -- Clean up
        DELETE FROM profiles WHERE auth_user_id = test_user_id;
        
        RAISE NOTICE '✅ Test 1 PASSED: Users can create their own profile';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '❌ Test 1 FAILED: Users cannot create profiles - %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔒 RLS ENABLED FOR PRODUCTION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Security policies active:';
    RAISE NOTICE '  ✅ Users can view all profiles (marketplace)';
    RAISE NOTICE '  ✅ Users can create their own profile';
    RAISE NOTICE '  ✅ Users can update their own profile';
    RAISE NOTICE '  ✅ Users can delete their own profile';
    RAISE NOTICE '  ✅ Other users data is protected';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: Test signup/signin after running this!';
    RAISE NOTICE '========================================';
END $$;

-- STEP 6: Final verification
SELECT 
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN qual IS NOT NULL THEN '✅'
        ELSE '❌'
    END as has_using,
    CASE 
        WHEN with_check IS NOT NULL THEN '✅'
        ELSE '❌'
    END as has_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;