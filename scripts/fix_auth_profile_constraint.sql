-- =====================================================
-- Fix Auth Profile Foreign Key Constraint
-- =====================================================

-- 1. First, drop the existing foreign key constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_auth_user_id_fkey;

-- 2. Add a new constraint that's DEFERRABLE
ALTER TABLE profiles
ADD CONSTRAINT profiles_auth_user_id_fkey 
FOREIGN KEY (auth_user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- 3. Create or replace the trigger function for auto-creating profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, email, role, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'borrower'),
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Also create a more robust profile creation function
CREATE OR REPLACE FUNCTION public.create_profile_for_user(
  user_id uuid,
  user_email text,
  user_role text DEFAULT 'borrower'
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, email, role, created_at, updated_at)
  VALUES (user_id, user_email, user_role, now(), now())
  ON CONFLICT (auth_user_id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.create_profile_for_user(uuid, text, text) TO postgres, service_role, authenticated;

-- 7. Ensure auth schema permissions
GRANT USAGE ON SCHEMA auth TO postgres, service_role;
GRANT ALL ON auth.users TO postgres, service_role;

DO $$
BEGIN
  RAISE NOTICE 'Auth profile constraint fix applied successfully';
  RAISE NOTICE 'The foreign key is now DEFERRABLE, which should prevent timing issues';
  RAISE NOTICE 'Profile creation trigger has been updated';
END $$;