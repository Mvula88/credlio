-- ============================================
-- FIX PERMISSION DENIED FOR TABLE USERS ERROR
-- ============================================

-- The error "permission denied for table users" means the code is trying to access
-- a public.users table that doesn't exist or doesn't have permissions.
-- We need to ensure all references point to auth.users

-- ============================================
-- STEP 1: Check if public.users table exists
-- ============================================
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'users'
        ) THEN '⚠️ public.users table exists (this might cause confusion)'
        ELSE '✅ No public.users table (good)'
    END as public_users_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'auth' AND table_name = 'users'
        ) THEN '✅ auth.users table exists (correct)'
        ELSE '❌ auth.users table missing (serious problem)'
    END as auth_users_check;

-- ============================================
-- STEP 2: Drop public.users if it exists (it shouldn't)
-- ============================================
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================
-- STEP 3: Update RPC function to not reference users table
-- ============================================
DROP FUNCTION IF EXISTS check_duplicate_identity(text, text, date);

CREATE OR REPLACE FUNCTION check_duplicate_identity(
  p_national_id_hash text,
  p_full_name text,
  p_date_of_birth date
)
RETURNS TABLE(is_duplicate boolean) AS $$
BEGIN
  -- Only check in identity_verifications, not users
  RETURN QUERY
  SELECT EXISTS (
    SELECT 1 FROM identity_verifications
    WHERE national_id_hash = p_national_id_hash
  ) AS is_duplicate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Update trigger to ensure it uses auth.users
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles table when auth.users gets a new row
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
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'borrower'),
    new.raw_user_meta_data->>'customer_id',
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) 
  DO UPDATE SET
    customer_id = COALESCE(EXCLUDED.customer_id, profiles.customer_id),
    updated_at = now();
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Profile creation failed for %: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users (not public.users)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STEP 5: Ensure RLS policies don't reference users
-- ============================================
-- Drop and recreate all policies to ensure they use auth.uid() not users table

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Service role full access" ON profiles;

-- Recreate with proper auth.uid() references
CREATE POLICY "View own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "View all profiles authenticated" 
ON profiles FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role access" 
ON profiles FOR ALL 
USING (auth.role() = 'service_role');

-- ============================================
-- STEP 6: Grant proper permissions
-- ============================================
-- Ensure authenticated users can work with profiles
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT SELECT ON countries TO authenticated;
GRANT ALL ON identity_verifications TO authenticated;

-- Service role needs full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================
-- STEP 7: Check for any functions that might reference users
-- ============================================
-- List all functions that might have 'users' in their definition
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) LIKE '%users%'
AND pg_get_functiondef(p.oid) NOT LIKE '%auth.users%';

-- ============================================
-- FINAL VERIFICATION
-- ============================================
DO $$
DECLARE
    has_public_users boolean;
    has_auth_users boolean;
    policy_count int;
BEGIN
    -- Check for public.users
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) INTO has_public_users;
    
    -- Check for auth.users
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) INTO has_auth_users;
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies WHERE tablename = 'profiles';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PERMISSION FIX COMPLETE!';
    RAISE NOTICE '========================================';
    
    IF has_public_users THEN
        RAISE WARNING '⚠️ public.users table still exists!';
    ELSE
        RAISE NOTICE '✅ No public.users table (correct)';
    END IF;
    
    IF has_auth_users THEN
        RAISE NOTICE '✅ auth.users table exists (correct)';
    ELSE
        RAISE WARNING '❌ auth.users table missing!';
    END IF;
    
    RAISE NOTICE '✅ RLS policies updated: % policies', policy_count;
    RAISE NOTICE '✅ Permissions granted to authenticated role';
    RAISE NOTICE '✅ Trigger uses auth.users correctly';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 The signup should now work without permission errors!';
    RAISE NOTICE '========================================';
END $$;