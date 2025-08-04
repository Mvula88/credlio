-- ============================================
-- FIX FOREIGN KEY CONSTRAINT ERROR
-- ============================================
-- This fixes the error: "Key (auth_user_id) is not present in table 'users'"
-- The foreign key should reference auth.users, not public.users

-- Step 1: Drop the incorrect foreign key constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_auth_user_id_fkey;

-- Step 2: Add the correct foreign key constraint pointing to auth.users
ALTER TABLE profiles
ADD CONSTRAINT profiles_auth_user_id_fkey 
FOREIGN KEY (auth_user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Step 3: Verify the constraint is correct
DO $$
BEGIN
  RAISE NOTICE '✅ Foreign key constraint fixed!';
  RAISE NOTICE '✅ profiles.auth_user_id now correctly references auth.users(id)';
END $$;

-- Step 4: Test that the constraint works
-- This should show the constraint details
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='profiles'
    AND kcu.column_name='auth_user_id';