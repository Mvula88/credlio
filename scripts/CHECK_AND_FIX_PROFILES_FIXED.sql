-- ============================================
-- CHECK AND FIX MISSING PROFILES
-- ============================================

-- 1. First, let's see all auth users without profiles
SELECT 
  au.id as auth_id,
  au.email,
  au.created_at::date as signup_date,
  au.raw_user_meta_data->>'role' as intended_role,
  au.raw_user_meta_data->>'full_name' as full_name,
  'NO PROFILE' as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.auth_user_id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- 2. Count the problem
SELECT 
  COUNT(*) as total_users,
  COUNT(p.id) as users_with_profiles,
  COUNT(*) - COUNT(p.id) as users_without_profiles
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.auth_user_id;

-- 3. Create missing profiles for ALL auth users who don't have them
DO $$
DECLARE
  user_record record;
  created_count int := 0;
  v_country_id uuid;
  v_profile_id uuid;
BEGIN
  RAISE NOTICE 'Starting profile creation for users without profiles...';
  
  -- Get default country (Namibia)
  SELECT id INTO v_country_id 
  FROM public.countries 
  WHERE code = 'NA' 
  LIMIT 1;
  
  FOR user_record IN 
    SELECT 
      au.id,
      au.email,
      au.raw_user_meta_data->>'full_name' as full_name,
      au.raw_user_meta_data->>'fullName' as full_name_alt,
      au.raw_user_meta_data->>'role' as role,
      au.raw_user_meta_data->>'phone' as phone,
      au.raw_user_meta_data->>'phoneNumber' as phone_alt,
      au.raw_user_meta_data->>'country' as country_code
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.auth_user_id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      -- Try to get country if specified
      IF user_record.country_code IS NOT NULL THEN
        SELECT id INTO v_country_id 
        FROM public.countries 
        WHERE code = user_record.country_code 
        LIMIT 1;
      END IF;
      
      -- Create the profile
      INSERT INTO public.profiles (
        id,
        auth_user_id,
        email,
        full_name,
        phone_number,
        role,
        country_id,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        user_record.id,
        user_record.email,
        COALESCE(
          user_record.full_name, 
          user_record.full_name_alt, 
          split_part(user_record.email, '@', 1)
        ),
        COALESCE(user_record.phone, user_record.phone_alt),
        COALESCE(user_record.role, 'borrower'),
        v_country_id,
        now(),
        now()
      )
      RETURNING id INTO v_profile_id;
      
      created_count := created_count + 1;
      RAISE NOTICE 'Created profile for: % (ID: %)', user_record.email, v_profile_id;
      
      -- If borrower, create borrower profile too
      IF COALESCE(user_record.role, 'borrower') = 'borrower' THEN
        INSERT INTO public.borrower_profiles (
          user_id,
          reputation_score,
          total_loans_requested,
          loans_repaid,
          loans_defaulted,
          created_at
        )
        VALUES (
          v_profile_id,
          50,
          0,
          0,
          0,
          now()
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE '  - Also created borrower profile';
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create profile for %: %', user_record.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PROFILE CREATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Created % new profiles', created_count;
  RAISE NOTICE '========================================';
END $$;

-- 4. Verify the fix worked
SELECT 
  'AFTER FIX' as status,
  COUNT(*) as total_users,
  COUNT(p.id) as users_with_profiles,
  COUNT(*) - COUNT(p.id) as users_without_profiles
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.auth_user_id;

-- 5. Show all users and their profile status now
SELECT 
  au.email,
  au.created_at::date as signup_date,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ Has Profile'
    ELSE '❌ Still Missing!'
  END as profile_status,
  p.role,
  c.name as country
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.auth_user_id
LEFT JOIN public.countries c ON p.country_id = c.id
ORDER BY au.created_at DESC
LIMIT 20;

-- 6. Finally, ensure the trigger is properly installed for future signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country_id uuid;
  v_profile_id uuid;
BEGIN
  -- Get default country (Namibia) if not specified
  SELECT id INTO v_country_id 
  FROM public.countries 
  WHERE code = COALESCE(new.raw_user_meta_data->>'country', 'NA')
  LIMIT 1;
  
  -- Create profile
  INSERT INTO public.profiles (
    id,
    auth_user_id,
    email,
    full_name,
    phone_number,
    role,
    country_id,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'fullName',
      split_part(new.email, '@', 1)
    ),
    COALESCE(
      new.raw_user_meta_data->>'phoneNumber',
      new.raw_user_meta_data->>'phone'
    ),
    COALESCE(new.raw_user_meta_data->>'role', 'borrower'),
    v_country_id,
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) DO NOTHING
  RETURNING id INTO v_profile_id;
  
  -- Create borrower profile if needed
  IF COALESCE(new.raw_user_meta_data->>'role', 'borrower') = 'borrower' AND v_profile_id IS NOT NULL THEN
    INSERT INTO public.borrower_profiles (
      user_id,
      reputation_score,
      total_loans_requested,
      loans_repaid,
      loans_defaulted,
      created_at
    )
    VALUES (
      v_profile_id,
      50,
      0,
      0,
      0,
      now()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN new;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: %', new.email, SQLERRM;
    RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Final confirmation
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TRIGGER REINSTALLED FOR FUTURE SIGNUPS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'The system will now automatically create';
  RAISE NOTICE 'profiles for all new user signups.';
  RAISE NOTICE '========================================';
END $$;