-- ============================================
-- QUICK AUTH STATUS CHECK
-- ============================================

-- 1. Is the trigger there?
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN '✅ YES - Trigger exists'
    ELSE '❌ NO - Trigger missing!'
  END as "Trigger Status";

-- 2. Check recent auth users vs profiles
WITH recent_users AS (
  SELECT 
    au.id,
    au.email,
    au.created_at as user_created,
    p.id as profile_id,
    p.created_at as profile_created
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.auth_user_id
  WHERE au.created_at > now() - interval '7 days'
  ORDER BY au.created_at DESC
  LIMIT 10
)
SELECT 
  email,
  user_created::timestamp(0) as "User Created",
  CASE 
    WHEN profile_id IS NOT NULL THEN '✅ Has Profile'
    ELSE '❌ NO PROFILE!'
  END as "Profile Status",
  profile_created::timestamp(0) as "Profile Created"
FROM recent_users;

-- 3. Count summary
SELECT 
  (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '7 days') as "Recent Users",
  (SELECT COUNT(*) FROM public.profiles WHERE created_at > now() - interval '7 days') as "Recent Profiles",
  (SELECT COUNT(*) 
   FROM auth.users au 
   LEFT JOIN public.profiles p ON au.id = p.auth_user_id 
   WHERE p.id IS NULL 
   AND au.created_at > now() - interval '7 days') as "Users Without Profiles";

-- 4. Check if we can manually create a profile (test permissions)
DO $$
DECLARE
  test_user_id uuid := gen_random_uuid();
  test_profile_id uuid;
  can_insert boolean := false;
BEGIN
  -- Try to insert a test profile
  BEGIN
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
      test_user_id,
      'test@test.com',
      'Test User',
      'borrower',
      now(),
      now()
    )
    RETURNING id INTO test_profile_id;
    
    -- If we got here, insert worked
    can_insert := true;
    
    -- Clean up
    DELETE FROM public.profiles WHERE id = test_profile_id;
    
    RAISE NOTICE '✅ Manual profile creation WORKS';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Manual profile creation FAILED: %', SQLERRM;
  END;
END $$;

-- 5. Final diagnosis
DO $$
DECLARE
  trigger_exists boolean;
  users_without_profiles int;
  recent_users int;
  recent_profiles int;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) INTO trigger_exists;
  
  SELECT COUNT(*) INTO users_without_profiles
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.auth_user_id
  WHERE p.id IS NULL
  AND au.created_at > now() - interval '7 days';
  
  SELECT COUNT(*) INTO recent_users
  FROM auth.users 
  WHERE created_at > now() - interval '7 days';
  
  SELECT COUNT(*) INTO recent_profiles
  FROM public.profiles 
  WHERE created_at > now() - interval '7 days';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 DIAGNOSIS SUMMARY';
  RAISE NOTICE '========================================';
  
  IF trigger_exists AND users_without_profiles = 0 THEN
    RAISE NOTICE '✅ EVERYTHING LOOKS GOOD!';
    RAISE NOTICE '   Trigger is working correctly';
    RAISE NOTICE '   All recent users have profiles';
  ELSIF trigger_exists AND users_without_profiles > 0 THEN
    RAISE NOTICE '⚠️  TRIGGER EXISTS BUT NOT WORKING!';
    RAISE NOTICE '   %s users without profiles', users_without_profiles;
    RAISE NOTICE '   The trigger may be failing silently';
    RAISE NOTICE '';
    RAISE NOTICE '   Try running FIX_AUTH_FINAL_CLEAN.sql again';
  ELSIF NOT trigger_exists THEN
    RAISE NOTICE '❌ TRIGGER IS MISSING!';
    RAISE NOTICE '   Run FIX_AUTH_FINAL_CLEAN.sql immediately';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 Stats:';
  RAISE NOTICE '   Recent users: %s', recent_users;
  RAISE NOTICE '   Recent profiles: %s', recent_profiles;
  RAISE NOTICE '   Missing profiles: %s', users_without_profiles;
  RAISE NOTICE '========================================';
END $$;