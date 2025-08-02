-- =====================================================
-- FIX RLS INSERT POLICY FOR SIGNUP
-- =====================================================

-- First drop the problematic insert policy
DROP POLICY IF EXISTS "Allow authenticated users to insert their own profile" ON profiles;

-- Create a more permissive insert policy that checks auth_user_id matches
-- This allows users to insert ONLY their own profile (matching their auth.uid())
CREATE POLICY "Users can insert own profile during signup" ON profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- Alternative: If the above still doesn't work, use this VERY permissive version
-- (uncomment if needed)
-- CREATE POLICY "Allow any authenticated user to insert profile" ON profiles
--   FOR INSERT 
--   TO authenticated
--   WITH CHECK (true);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'INSERT'
ORDER BY policyname;