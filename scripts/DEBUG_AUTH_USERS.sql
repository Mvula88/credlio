-- ============================================
-- DEBUG AUTH USERS AND PROFILES
-- ============================================

-- 1. Check if we can see auth.users at all
SELECT 
  'Auth Users Count' as check_type,
  COUNT(*) as count
FROM auth.users;

-- 2. Check profiles count
SELECT 
  'Profiles Count' as check_type,
  COUNT(*) as count
FROM public.profiles;

-- 3. List ALL auth users (with or without profiles)
SELECT 
  au.id as auth_user_id,
  au.email,
  au.created_at,
  au.email_confirmed_at,
  p.id as profile_id,
  p.full_name,
  p.role,
  CASE 
    WHEN p.id IS NOT NULL THEN 'Has Profile'
    ELSE 'MISSING PROFILE'
  END as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.auth_user_id
ORDER BY au.created_at DESC;

-- 4. Force create profiles for any missing ones using admin privileges
DO $$
DECLARE
  user_rec record;
  profile_created boolean;
  created_count int := 0;
  total_missing int := 0;
  default_country_id uuid;
BEGIN
  -- Get default country
  SELECT id INTO default_country_id
  FROM public.countries
  WHERE code = 'NA'
  LIMIT 1;
  
  IF default_country_id IS NULL THEN
    -- If no Namibia, get any country
    SELECT id INTO default_country_id
    FROM public.countries
    LIMIT 1;
  END IF;
  
  RAISE NOTICE 'Default country ID: %', default_country_id;
  
  -- Count missing profiles
  SELECT COUNT(*) INTO total_missing
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.auth_user_id = au.id
  );
  
  RAISE NOTICE 'Found % users without profiles', total_missing;
  
  -- Loop through users without profiles
  FOR user_rec IN 
    SELECT 
      au.id,
      au.email,
      au.raw_user_meta_data,
      au.created_at
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.auth_user_id = au.id
    )
  LOOP
    BEGIN
      -- Extract metadata
      RAISE NOTICE 'Processing user: % (ID: %)', user_rec.email, user_rec.id;
      
      -- Create profile
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
        user_rec.id,
        user_rec.email,
        COALESCE(
          user_rec.raw_user_meta_data->>'full_name',
          user_rec.raw_user_meta_data->>'fullName',
          split_part(user_rec.email, '@', 1)
        ),
        COALESCE(
          user_rec.raw_user_meta_data->>'role',
          'borrower'
        ),
        default_country_id,
        COALESCE(user_rec.created_at, now()),
        now()
      );
      
      created_count := created_count + 1;
      RAISE NOTICE '  ✅ Profile created successfully';
      
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE '  ⚠️ Profile already exists (race condition)';
      WHEN OTHERS THEN
        RAISE NOTICE '  ❌ Error: %', SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESULTS:';
  RAISE NOTICE '  Total missing: %', total_missing;
  RAISE NOTICE '  Created: %', created_count;
  RAISE NOTICE '========================================';
END $$;

-- 5. Verify current state after fix
SELECT 
  'Final Check' as status,
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM auth.users au WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.auth_user_id = au.id
  )) as still_missing;

-- 6. If you're using Supabase Dashboard, also check with this simpler query
SELECT 
  au.email,
  au.id as auth_id,
  p.id as profile_id
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.auth_user_id
WHERE p.id IS NULL;

-- 7. Install/Update the trigger for future signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_country_id uuid;
  new_profile_id uuid;
BEGIN
  -- Get default country
  SELECT id INTO default_country_id
  FROM public.countries
  WHERE code = 'NA'
  LIMIT 1;
  
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
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'fullName',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'role', 'borrower'),
    default_country_id,
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) DO NOTHING
  RETURNING id INTO new_profile_id;
  
  -- Log success
  IF new_profile_id IS NOT NULL THEN
    RAISE LOG 'Profile created for user %: profile_id=%', new.email, new_profile_id;
  END IF;
  
  RETURN new;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE LOG 'Failed to create profile for %: %', new.email, SQLERRM;
    RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Confirm trigger is installed
SELECT 
  'Trigger Status' as check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN '✅ Trigger installed successfully'
    ELSE '❌ Trigger installation failed'
  END as status;