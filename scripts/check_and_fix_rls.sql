-- =====================================================
-- CHECK AND FIX RLS COMPLETELY
-- =====================================================

-- 1. Check if RLS is enabled on profiles table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 2. If RLS is not enabled, enable it
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies to start completely fresh
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
    END LOOP;
END $$;

-- 4. Create simple, working policies
-- Allow authenticated users to insert their own profile
CREATE POLICY "allow_insert_own_profile" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = auth_user_id);

-- Allow users to view their own profile  
CREATE POLICY "allow_select_own_profile" ON profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = auth_user_id);

-- Allow users to update their own profile
CREATE POLICY "allow_update_own_profile" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

-- 5. TEMPORARY: If signup still fails, create a service role bypass
-- This allows the backend to insert profiles during signup
CREATE POLICY "service_role_bypass" ON profiles
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 6. Verify final state
SELECT 'RLS Status:' as info;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

SELECT 'Active Policies:' as info;
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;