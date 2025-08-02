-- =====================================================
-- CREATE AUTOMATIC PROFILE TRIGGER
-- =====================================================
-- This trigger automatically creates a profile when a new user signs up
-- This bypasses RLS issues during signup

-- 1. Create a function that creates a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    auth_user_id,
    email,
    full_name,
    username,
    role,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'role',
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- 4. Update RLS policies to be simpler since profile now exists
DROP POLICY IF EXISTS "allow_insert_own_profile" ON profiles;

-- Allow users to update their already-created profile with additional data
CREATE POLICY "allow_insert_or_update_own_profile" ON profiles
    FOR ALL TO authenticated
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

-- 5. Verify the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name = 'on_auth_user_created';