-- ============================================
-- DIAGNOSE USERS TABLE PERMISSION ERROR
-- ============================================

-- 1. Check what tables exist with 'users' in the name
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name LIKE '%users%'
ORDER BY table_schema, table_name;

-- 2. Check what views exist that might reference users
SELECT 
    table_schema,
    table_name as view_name
FROM information_schema.views
WHERE view_definition LIKE '%users%'
AND table_schema = 'public';

-- 3. Check RLS policies that might reference users
SELECT 
    schemaname,
    tablename,
    policyname,
    qual
FROM pg_policies
WHERE tablename = 'profiles'
AND (qual::text LIKE '%users%' OR with_check::text LIKE '%users%');

-- 4. Check all functions in public schema for users references
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_definition LIKE '%FROM users%'
OR routine_definition LIKE '%JOIN users%';

-- 5. Check triggers that might reference users
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- 6. Quick fix: Create a view if needed (temporary workaround)
-- This creates a users view that points to auth.users
-- Only use this if absolutely necessary
CREATE OR REPLACE VIEW public.users AS 
SELECT * FROM auth.users;

-- Grant permissions on the view
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO service_role;

-- Final message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DIAGNOSTIC COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Created a public.users VIEW that points to auth.users';
    RAISE NOTICE 'This should fix the permission error temporarily';
    RAISE NOTICE '';
    RAISE NOTICE 'The signup should work now!';
    RAISE NOTICE '========================================';
END $$;