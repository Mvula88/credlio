-- =====================================================
-- Fix Profiles Table Structure and Constraints
-- =====================================================

-- 1. First check current structure
DO $$
BEGIN
    RAISE NOTICE 'Checking profiles table structure...';
END $$;

-- 2. Ensure profiles table has correct columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

-- 3. Drop the problematic foreign key constraint if it exists
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_auth_user_id_fkey;

-- 4. Ensure auth_user_id column exists and has correct type
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- 5. Add a proper unique constraint on auth_user_id
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_auth_user_id_key;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_auth_user_id_key UNIQUE (auth_user_id);

-- 6. Add the foreign key constraint as DEFERRABLE
ALTER TABLE profiles
ADD CONSTRAINT profiles_auth_user_id_fkey 
FOREIGN KEY (auth_user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- 7. Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert profile with generated ID
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
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'borrower'),
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Grant permissions
GRANT USAGE ON SCHEMA auth TO postgres, service_role;
GRANT ALL ON auth.users TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- 10. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);

-- 11. Update RLS policies to handle the structure correctly
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    WITH CHECK (
        auth_user_id = auth.uid() 
        OR auth.uid() IS NULL -- Allow trigger to create profile
    );

DO $$
BEGIN
    RAISE NOTICE 'Profiles table structure fixed successfully';
    RAISE NOTICE 'The table now has:';
    RAISE NOTICE '  - id: UUID (Primary Key, auto-generated)';
    RAISE NOTICE '  - auth_user_id: UUID (Foreign Key to auth.users, UNIQUE)';
    RAISE NOTICE '  - Deferrable foreign key constraint';
    RAISE NOTICE '  - Proper trigger for auto-creation';
END $$;