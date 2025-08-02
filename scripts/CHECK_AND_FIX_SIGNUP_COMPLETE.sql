-- =====================================================
-- COMPLETE CHECK AND FIX FOR SIGNUP ISSUES
-- =====================================================

-- 1. First, let's check what columns exist in profiles table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check if the trigger is interfering (disable it temporarily)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Make sure all necessary columns exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS detected_country_code VARCHAR(3),
ADD COLUMN IF NOT EXISTS signup_ip_address VARCHAR(45);

-- 4. Check and fix RLS policies for profiles table
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create comprehensive policies
CREATE POLICY "Enable insert for authenticated users" ON profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Enable read access for users to own profile" ON profiles
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Enable update for users to own profile" ON profiles
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- 5. Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON countries TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. Check if there's an existing user with your email
-- Replace 'your-email@example.com' with the actual email you're trying to use
SELECT 
    au.id as auth_id,
    au.email,
    p.id as profile_id,
    p.full_name,
    p.role
FROM auth.users au
LEFT JOIN profiles p ON p.auth_user_id = au.id
WHERE au.email = 'your-email@example.com';

-- 7. If you need to clean up a failed signup attempt, run this:
-- DELETE FROM auth.users WHERE email = 'your-email@example.com' AND id NOT IN (SELECT auth_user_id FROM profiles);

-- 8. Verify all policies are in place
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 9. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- If rowsecurity is false, enable it:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 10. Final check - make sure the countries table has data
SELECT COUNT(*) as country_count FROM countries;
SELECT * FROM countries WHERE code IN ('NA', 'NG', 'ZA', 'KE') LIMIT 5;