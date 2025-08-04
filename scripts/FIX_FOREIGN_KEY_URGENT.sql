-- ============================================
-- URGENT FIX: Foreign Key Constraint Error
-- ============================================
-- The error "Key (auth_user_id) is not present in table 'users'" 
-- happens because the constraint is looking in the wrong schema

-- STEP 1: Check current foreign key constraints
-- This will show you what the constraint is currently pointing to
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    a.attname AS column_name,
    confrelid::regclass AS foreign_table,
    af.attname AS foreign_column
FROM 
    pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE 
    conrelid::regclass::text = 'profiles'
    AND contype = 'f';

-- STEP 2: Drop ALL foreign key constraints on profiles.auth_user_id
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find and drop all foreign key constraints on auth_user_id column
    FOR constraint_record IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'profiles'::regclass 
        AND contype = 'f'
        AND EXISTS (
            SELECT 1 FROM pg_attribute 
            WHERE attrelid = conrelid 
            AND attname = 'auth_user_id' 
            AND attnum = ANY(conkey)
        )
    LOOP
        EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT IF EXISTS ' || constraint_record.conname;
        RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- STEP 3: Create the CORRECT foreign key constraint
-- This explicitly references auth.users (not public.users)
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_auth_user_id_fkey 
FOREIGN KEY (auth_user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- STEP 4: Verify the fix
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    a.attname AS column_name,
    confrelid::regclass AS foreign_table,
    af.attname AS foreign_column
FROM 
    pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE 
    conrelid::regclass::text = 'profiles'
    AND contype = 'f'
    AND a.attname = 'auth_user_id';

-- STEP 5: Test that auth.users exists and has the ID
SELECT 
    'auth.users table exists' as check_item,
    EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'auth' 
        AND table_name = 'users'
    ) as result
UNION ALL
SELECT 
    'Test ID exists in auth.users' as check_item,
    EXISTS(
        SELECT 1 
        FROM auth.users 
        WHERE id = '8b9365e3-f907-4855-9cc7-51e09c0f534c'
    ) as result;

-- STEP 6: If the user doesn't exist in auth.users, check if it's orphaned
-- This will show any profiles that don't have corresponding auth users
SELECT 
    p.auth_user_id,
    p.email,
    p.created_at,
    'Profile exists but no auth user' as issue
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.auth_user_id
WHERE au.id IS NULL;

-- STEP 7: Clean up orphaned profiles (optional - uncomment if needed)
-- DELETE FROM profiles 
-- WHERE auth_user_id NOT IN (SELECT id FROM auth.users);

-- STEP 8: Final verification message
DO $$
DECLARE
    constraint_correct boolean;
    auth_table_exists boolean;
BEGIN
    -- Check if auth.users table exists
    SELECT EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'auth' 
        AND table_name = 'users'
    ) INTO auth_table_exists;
    
    -- Check if foreign key points to auth.users
    SELECT EXISTS(
        SELECT 1 
        FROM pg_constraint c
        WHERE conname = 'profiles_auth_user_id_fkey'
        AND conrelid = 'public.profiles'::regclass
        AND confrelid = 'auth.users'::regclass
    ) INTO constraint_correct;
    
    IF NOT auth_table_exists THEN
        RAISE WARNING '⚠️ auth.users table does not exist! This is a serious problem.';
        RAISE WARNING 'You may need to enable Supabase Auth or recreate the auth schema.';
    ELSIF constraint_correct THEN
        RAISE NOTICE '✅ SUCCESS! Foreign key now correctly points to auth.users';
        RAISE NOTICE '✅ The constraint profiles_auth_user_id_fkey is fixed';
        RAISE NOTICE '';
        RAISE NOTICE 'If you still get errors, it means:';
        RAISE NOTICE '1. The user ID does not exist in auth.users';
        RAISE NOTICE '2. Run the query in STEP 6 to find orphaned profiles';
    ELSE
        RAISE WARNING '❌ Foreign key still not pointing to auth.users';
        RAISE WARNING 'Please check the output of STEP 4 above';
    END IF;
END $$;