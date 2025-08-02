-- Fix for "Database error saving new user"
-- This adds the missing INSERT policy for the profiles table

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create INSERT policy for profiles table
-- This allows new users to create their profile during signup
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = auth_user_id);

-- Also ensure the profiles table allows inserting all necessary columns
-- Check if columns exist and add if missing
DO $$ 
BEGIN
  -- Add detected_country_code if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' 
                 AND column_name = 'detected_country_code') THEN
    ALTER TABLE profiles ADD COLUMN detected_country_code VARCHAR(3);
  END IF;
  
  -- Add signup_ip_address if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' 
                 AND column_name = 'signup_ip_address') THEN
    ALTER TABLE profiles ADD COLUMN signup_ip_address VARCHAR(45);
  END IF;
END $$;

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile';