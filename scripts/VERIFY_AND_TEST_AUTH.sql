-- ============================================
-- VERIFY AUTH SETUP AND CREATE TEST USER
-- ============================================

-- 1. Check if auth.users table is empty
SELECT 
  'Auth Users Table' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️ EMPTY - No users exist'
    ELSE '✅ Has ' || COUNT(*) || ' users'
  END as status
FROM auth.users;

-- 2. Check if profiles table is empty
SELECT 
  'Profiles Table' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️ EMPTY - No profiles exist'
    ELSE '✅ Has ' || COUNT(*) || ' profiles'
  END as status
FROM public.profiles;

-- 3. Check if countries table has data (needed for signup)
SELECT 
  'Countries Table' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ EMPTY - This will cause signup to fail!'
    ELSE '✅ Has ' || COUNT(*) || ' countries'
  END as status
FROM public.countries;

-- 4. List available countries
SELECT code, name 
FROM public.countries 
ORDER BY name
LIMIT 10;

-- 5. Check if trigger exists
SELECT 
  'Profile Creation Trigger' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN '✅ Trigger EXISTS'
    ELSE '❌ Trigger MISSING'
  END as status;

-- 6. Check Supabase Auth settings
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📋 DIAGNOSIS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'If auth.users is empty, the problem is that';
  RAISE NOTICE 'signup is failing at the Supabase Auth level.';
  RAISE NOTICE '';
  RAISE NOTICE 'Common causes:';
  RAISE NOTICE '1. Email confirmations are required but not set up';
  RAISE NOTICE '2. SMTP/Email service is not configured';
  RAISE NOTICE '3. Auth settings are blocking signups';
  RAISE NOTICE '4. Client-side signup code has errors';
  RAISE NOTICE '';
  RAISE NOTICE 'To fix this:';
  RAISE NOTICE '1. Check Supabase Dashboard > Authentication > Settings';
  RAISE NOTICE '2. Temporarily disable "Confirm email" if testing';
  RAISE NOTICE '3. Check browser console for errors during signup';
  RAISE NOTICE '4. Check Supabase Dashboard > Logs > Auth logs';
  RAISE NOTICE '========================================';
END $$;

-- 7. Create a test user manually (for testing the app)
-- This will help you test if the app works when users exist
DO $$
DECLARE
  test_user_id uuid;
  test_profile_id uuid;
  test_country_id uuid;
BEGIN
  -- Get a country ID
  SELECT id INTO test_country_id
  FROM public.countries
  WHERE code = 'NA'
  LIMIT 1;
  
  -- If no Namibia, get any country
  IF test_country_id IS NULL THEN
    SELECT id INTO test_country_id
    FROM public.countries
    LIMIT 1;
  END IF;
  
  -- Generate a test user ID
  test_user_id := gen_random_uuid();
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🧪 CREATING TEST DATA';
  RAISE NOTICE '========================================';
  
  -- Note: We CANNOT directly insert into auth.users from SQL
  -- That table is managed by Supabase Auth
  -- We can only create a profile for testing the app UI
  
  BEGIN
    -- Create a test profile (without auth user - just for UI testing)
    INSERT INTO public.profiles (
      id,
      auth_user_id,
      email,
      full_name,
      role,
      country_id,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      test_user_id, -- Fake auth ID for testing
      'test@example.com',
      'Test User',
      'borrower',
      test_country_id,
      now(),
      now()
    )
    RETURNING id INTO test_profile_id;
    
    RAISE NOTICE '✅ Created test profile with ID: %', test_profile_id;
    RAISE NOTICE '   Email: test@example.com';
    RAISE NOTICE '   (Note: This is just for UI testing, not a real user)';
    
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE '⚠️ Test profile already exists';
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Could not create test profile: %', SQLERRM;
  END;
  
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANT: To create real users that can log in,';
  RAISE NOTICE '   you must use the Supabase Auth signup flow';
  RAISE NOTICE '   either through:';
  RAISE NOTICE '   1. Your app signup form';
  RAISE NOTICE '   2. Supabase Dashboard > Authentication > Users > Invite';
  RAISE NOTICE '========================================';
END $$;

-- 8. Final check - are there any auth logs showing signup attempts?
-- This query might not work depending on your Supabase plan
SELECT 
  'Recent Auth Activity' as check_type,
  'Check Supabase Dashboard > Logs > Auth Logs' as instruction,
  'Look for any failed signup attempts or errors' as action;