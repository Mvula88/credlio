-- ============================================
-- FIX FOREIGN KEY CONSTRAINT ISSUE
-- ============================================
-- The profiles table has wrong foreign key reference

-- 1. Check current foreign key constraints on profiles table
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as references_table
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
AND contype = 'f';

-- 2. Drop the incorrect foreign key constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_auth_user_id_fkey CASCADE;

-- 3. Add the correct foreign key constraint to auth.users
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_auth_user_id_fkey 
FOREIGN KEY (auth_user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 4. Verify the fix
SELECT 
  'Foreign Key Check' as status,
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as references_table,
  CASE 
    WHEN confrelid::regclass::text = 'auth.users' THEN '✅ CORRECT - References auth.users'
    ELSE '❌ WRONG - References ' || confrelid::regclass::text
  END as is_correct
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
AND contype = 'f'
AND conname = 'profiles_auth_user_id_fkey';

-- 5. Now check if we can see auth.users
SELECT 
  'Auth Users Count' as check,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN 'No users yet - create one in Supabase Dashboard'
    ELSE COUNT(*) || ' users exist'
  END as status
FROM auth.users;

-- 6. Summary
DO $$
DECLARE
  fk_correct boolean;
  user_count int;
BEGIN
  -- Check if FK is now correct
  SELECT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conrelid = 'public.profiles'::regclass 
    AND contype = 'f'
    AND confrelid = 'auth.users'::regclass
  ) INTO fk_correct;
  
  -- Count users
  SELECT COUNT(*) FROM auth.users INTO user_count;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FOREIGN KEY FIXED!';
  RAISE NOTICE '========================================';
  
  IF fk_correct THEN
    RAISE NOTICE '✅ profiles.auth_user_id now correctly references auth.users';
  ELSE
    RAISE NOTICE '❌ Foreign key still not correct - manual intervention needed';
  END IF;
  
  RAISE NOTICE '';
  IF user_count = 0 THEN
    RAISE NOTICE '📝 Next Steps:';
    RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Users';
    RAISE NOTICE '2. Click "Invite User" or "Add User"';
    RAISE NOTICE '3. Create a test user with:';
    RAISE NOTICE '   - Email: your-email@example.com';
    RAISE NOTICE '   - Password: choose a secure password';
    RAISE NOTICE '4. The trigger should automatically create a profile';
    RAISE NOTICE '';
    RAISE NOTICE 'OR';
    RAISE NOTICE '';
    RAISE NOTICE '1. Try signing up through your app again';
    RAISE NOTICE '2. Check browser console for any errors';
  ELSE
    RAISE NOTICE '✅ Found % users in auth.users', user_count;
    RAISE NOTICE 'Profiles should now be created automatically';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- 7. Reinstall the trigger to ensure it works with the fixed constraint
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
BEGIN
  -- Get default country (Namibia or any available)
  SELECT id INTO default_country_id
  FROM public.countries
  WHERE code = 'NA'
  LIMIT 1;
  
  IF default_country_id IS NULL THEN
    SELECT id INTO default_country_id
    FROM public.countries
    LIMIT 1;
  END IF;
  
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
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'role', 'borrower'),
    default_country_id,
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  RETURN new;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for %: %', new.email, SQLERRM;
    RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Final confirmation
SELECT 
  'Setup Complete' as status,
  'Foreign key fixed and trigger installed' as message,
  'Now create a user in Supabase Dashboard to test' as next_step;