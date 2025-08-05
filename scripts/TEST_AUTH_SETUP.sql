-- ============================================
-- TEST AUTH AND PROFILE SETUP
-- ============================================
-- Run this to verify everything is working

-- 1. Check if trigger exists and is enabled
SELECT 
  t.tgname as trigger_name,
  t.tgenabled as is_enabled,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- 2. Check if RPC function exists
SELECT 
  proname as function_name,
  pronargs as num_arguments
FROM pg_proc 
WHERE proname = 'create_or_update_profile';

-- 3. Check RLS status on profiles
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status
FROM pg_tables 
WHERE tablename IN ('profiles', 'borrower_profiles')
AND schemaname = 'public';

-- 4. List all policies on profiles table
SELECT 
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
AND schemaname = 'public'
ORDER BY policyname;

-- 5. Test if the trigger function would work
DO $$
DECLARE
  test_result text;
BEGIN
  -- Simulate what the trigger does
  test_result := 'Testing trigger logic...';
  
  -- Check if we can query countries table
  IF EXISTS (SELECT 1 FROM public.countries LIMIT 1) THEN
    test_result := test_result || ' ✅ Countries table accessible';
  ELSE
    test_result := test_result || ' ⚠️ Countries table empty or not accessible';
  END IF;
  
  RAISE NOTICE '%', test_result;
END $$;

-- 6. Check for any recent errors in auth users without profiles
SELECT 
  'Orphaned Auth Users' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All auth users have profiles'
    ELSE '⚠️ ' || COUNT(*) || ' auth users without profiles - trigger may not be working'
  END as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.auth_user_id
WHERE p.id IS NULL
AND au.created_at > now() - interval '7 days';

-- 7. Check recent successful profile creations
SELECT 
  'Recent Profile Creations' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' profiles created in last 7 days'
    ELSE '⚠️ No recent profile creations'
  END as status
FROM public.profiles
WHERE created_at > now() - interval '7 days';

-- 8. Final summary
DO $$
DECLARE
  trigger_exists boolean;
  rpc_exists boolean;
  rls_enabled boolean;
  policies_count int;
  orphaned_users int;
BEGIN
  -- Check components
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) INTO trigger_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_or_update_profile'
  ) INTO rpc_exists;
  
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies 
  WHERE tablename = 'profiles' AND schemaname = 'public';
  
  SELECT COUNT(*) INTO orphaned_users
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.auth_user_id
  WHERE p.id IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 AUTH SETUP TEST RESULTS';
  RAISE NOTICE '========================================';
  
  IF trigger_exists THEN
    RAISE NOTICE '✅ Trigger is installed';
  ELSE
    RAISE NOTICE '❌ CRITICAL: Trigger is MISSING!';
  END IF;
  
  IF rpc_exists THEN
    RAISE NOTICE '✅ RPC function exists';
  ELSE
    RAISE NOTICE '⚠️ RPC function missing (app updates may fail)';
  END IF;
  
  IF policies_count > 0 THEN
    RAISE NOTICE '✅ % RLS policies configured', policies_count;
  ELSE
    RAISE NOTICE '❌ No RLS policies found!';
  END IF;
  
  IF orphaned_users = 0 THEN
    RAISE NOTICE '✅ No orphaned auth users';
  ELSE
    RAISE NOTICE '⚠️ % auth users without profiles', orphaned_users;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 NEXT STEPS:';
  RAISE NOTICE '1. Try creating a new test account';
  RAISE NOTICE '2. Check if profile is created automatically';
  RAISE NOTICE '3. If signup fails, check Supabase Auth logs';
  RAISE NOTICE '========================================';
END $$;