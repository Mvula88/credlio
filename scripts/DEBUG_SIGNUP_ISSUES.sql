-- ============================================
-- DEBUG WHY SIGNUP IS NOT WORKING
-- ============================================

-- 1. Check if auth.users table is accessible
SELECT 
  'Auth Users Table' as check,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ Table accessible'
    ELSE '❌ Cannot access table'
  END as status
FROM auth.users;

-- 2. Check if email confirmation is required
SELECT 
  'Email Confirmation Setting' as check,
  'Go to Supabase Dashboard > Authentication > Providers > Email' as action,
  'Check if "Confirm email" is enabled - DISABLE it for testing' as recommendation;

-- 3. Check if the trigger exists and is enabled
SELECT 
  t.tgname as trigger_name,
  CASE 
    WHEN t.tgenabled = 'O' THEN '✅ Enabled'
    WHEN t.tgenabled = 'D' THEN '❌ DISABLED'
    ELSE '⚠️ Unknown state'
  END as trigger_status,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- 4. Check foreign key constraints
SELECT 
  conname as constraint_name,
  CASE 
    WHEN confrelid::regclass::text = 'auth.users' THEN '✅ Correct - points to auth.users'
    ELSE '❌ WRONG - points to ' || confrelid::regclass::text
  END as status
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
AND contype = 'f';

-- 5. Check if countries table has data
SELECT 
  'Countries Table' as check,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Has ' || COUNT(*) || ' countries'
    ELSE '❌ EMPTY - This will cause signup to fail!'
  END as status
FROM public.countries;

-- 6. Check RLS policies on profiles
SELECT 
  'Profiles RLS' as check,
  CASE 
    WHEN relrowsecurity THEN 'RLS is ENABLED'
    ELSE 'RLS is DISABLED'
  END as status,
  'If enabled, check policies below' as note
FROM pg_class 
WHERE relname = 'profiles';

-- 7. List all RLS policies on profiles
SELECT 
  polname as policy_name,
  polcmd as command,
  CASE 
    WHEN polroles::text LIKE '%authenticated%' THEN 'authenticated'
    WHEN polroles::text LIKE '%anon%' THEN 'anon'
    WHEN polroles::text LIKE '%service_role%' THEN 'service_role'
    ELSE 'other'
  END as for_role
FROM pg_policy
WHERE polrelid = 'profiles'::regclass
ORDER BY policy_name;

-- 8. Test if we can manually insert into profiles (simulating what trigger does)
DO $$
DECLARE
  test_user_id uuid := gen_random_uuid();
  test_country_id uuid;
  can_insert boolean := false;
BEGIN
  -- Get a country
  SELECT id INTO test_country_id FROM countries LIMIT 1;
  
  -- Try to insert
  BEGIN
    -- First, we need an auth user to reference
    -- Since we can't create one directly, we'll check if insert would work
    PERFORM 1 FROM auth.users LIMIT 1;
    RAISE NOTICE '✅ Can query auth.users table';
    
    -- Check if we could insert into profiles
    PERFORM 1 FROM profiles LIMIT 1;
    RAISE NOTICE '✅ Can query profiles table';
    
    IF test_country_id IS NOT NULL THEN
      RAISE NOTICE '✅ Countries table has data';
    ELSE
      RAISE NOTICE '❌ Countries table is empty!';
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Error: %', SQLERRM;
  END;
END $$;

-- 9. Common signup failure reasons
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 COMMON SIGNUP FAILURE REASONS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. EMAIL CONFIRMATION REQUIRED:';
  RAISE NOTICE '   - Go to Supabase Dashboard > Authentication > Providers > Email';
  RAISE NOTICE '   - DISABLE "Confirm email" for testing';
  RAISE NOTICE '   - Or configure SMTP for email sending';
  RAISE NOTICE '';
  RAISE NOTICE '2. SMTP NOT CONFIGURED:';
  RAISE NOTICE '   - If email confirmation is enabled, SMTP must be set up';
  RAISE NOTICE '   - Go to Project Settings > Auth > SMTP Settings';
  RAISE NOTICE '';
  RAISE NOTICE '3. CLIENT-SIDE ERRORS:';
  RAISE NOTICE '   - Open browser console (F12)';
  RAISE NOTICE '   - Try to sign up and check for red errors';
  RAISE NOTICE '   - Common: CORS issues, wrong Supabase URL/key';
  RAISE NOTICE '';
  RAISE NOTICE '4. SUPABASE AUTH SETTINGS:';
  RAISE NOTICE '   - Check if signups are enabled';
  RAISE NOTICE '   - Go to Authentication > Settings > User Signups';
  RAISE NOTICE '';
  RAISE NOTICE '5. CHECK AUTH LOGS:';
  RAISE NOTICE '   - Go to Supabase Dashboard > Logs > Auth Logs';
  RAISE NOTICE '   - Look for failed signup attempts';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📝 QUICK FIX - Try this first:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. Go to Authentication > Providers > Email';
  RAISE NOTICE '2. DISABLE "Confirm email"';
  RAISE NOTICE '3. Try signing up again';
  RAISE NOTICE '========================================';
END $$;