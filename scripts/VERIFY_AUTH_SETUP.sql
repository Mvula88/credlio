-- ============================================
-- VERIFY CURRENT AUTH AND PROFILE SETUP
-- ============================================
-- Run this to check the current state of your database

-- Check if trigger exists
SELECT 
  'Trigger Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'on_auth_user_created'
    ) THEN '✅ Trigger EXISTS'
    ELSE '❌ Trigger MISSING - Run FIX_AUTH_TRIGGER_COMPLETE.sql'
  END as status;

-- Check if function exists
SELECT 
  'Function Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'handle_new_user'
    ) THEN '✅ Function EXISTS'
    ELSE '❌ Function MISSING - Run FIX_AUTH_TRIGGER_COMPLETE.sql'
  END as status;

-- Check RLS on profiles
SELECT 
  'Profiles RLS' as check_type,
  CASE 
    WHEN relrowsecurity 
    THEN '✅ RLS ENABLED'
    ELSE '⚠️ RLS DISABLED - May cause permission issues'
  END as status
FROM pg_class 
WHERE relname = 'profiles';

-- List all policies on profiles table
SELECT 
  'Profile Policy' as check_type,
  polname as policy_name
FROM pg_policy 
WHERE polrelid = 'profiles'::regclass
ORDER BY polname;

-- Check recent auth users
SELECT 
  'Recent Signups' as check_type,
  COUNT(*) || ' users in last 24 hours' as status
FROM auth.users
WHERE created_at > now() - interval '24 hours';

-- Check recent profiles
SELECT 
  'Recent Profiles' as check_type,
  COUNT(*) || ' profiles in last 24 hours' as status
FROM profiles
WHERE created_at > now() - interval '24 hours';

-- Check for orphaned auth users (users without profiles)
SELECT 
  'Orphaned Users' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No orphaned users'
    ELSE '⚠️ ' || COUNT(*) || ' users without profiles'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.auth_user_id
WHERE p.id IS NULL;

-- Check for duplicate profiles (multiple profiles for same auth user)
SELECT 
  'Duplicate Profiles' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No duplicate profiles'
    ELSE '❌ ' || COUNT(*) || ' auth users have multiple profiles'
  END as status
FROM (
  SELECT auth_user_id, COUNT(*) as profile_count
  FROM profiles
  GROUP BY auth_user_id
  HAVING COUNT(*) > 1
) duplicates;

-- Check if create_or_update_profile function exists
SELECT 
  'RPC Function' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'create_or_update_profile'
    ) THEN '✅ create_or_update_profile EXISTS'
    ELSE '⚠️ create_or_update_profile MISSING - App may not update profiles correctly'
  END as status;

-- Summary message
DO $$
DECLARE
  has_trigger boolean;
  has_function boolean;
  has_rls boolean;
  orphaned_count int;
BEGIN
  -- Check critical components
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) INTO has_trigger;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user'
  ) INTO has_function;
  
  SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles' INTO has_rls;
  
  SELECT COUNT(*) INTO orphaned_count
  FROM auth.users au
  LEFT JOIN profiles p ON au.id = p.auth_user_id
  WHERE p.id IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'AUTH SETUP VERIFICATION SUMMARY';
  RAISE NOTICE '========================================';
  
  IF has_trigger AND has_function THEN
    RAISE NOTICE '✅ Core setup looks good!';
  ELSE
    RAISE NOTICE '❌ CRITICAL: Missing trigger or function!';
    RAISE NOTICE '   Run FIX_AUTH_TRIGGER_COMPLETE.sql immediately';
  END IF;
  
  IF orphaned_count > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % users without profiles', orphaned_count;
    RAISE NOTICE '   These users may not be able to use the app';
  END IF;
  
  IF NOT has_rls THEN
    RAISE NOTICE '⚠️  WARNING: RLS is disabled on profiles';
    RAISE NOTICE '   This may cause permission errors';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. If anything is missing, run FIX_AUTH_TRIGGER_COMPLETE.sql';
  RAISE NOTICE '2. Test signup with a new user';
  RAISE NOTICE '3. Check Supabase Auth logs for any errors';
  RAISE NOTICE '========================================';
END $$;