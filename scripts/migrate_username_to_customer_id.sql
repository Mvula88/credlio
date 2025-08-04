-- =====================================================
-- MIGRATION: Rename username to customer_id
-- =====================================================
-- This migration renames the username column to customer_id
-- since we're now using email for authentication

-- 1. Rename the column in profiles table
ALTER TABLE profiles 
RENAME COLUMN username TO customer_id;

-- 2. Update the trigger function to use customer_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    auth_user_id,
    email,
    full_name,
    customer_id,  -- Changed from username
    role,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'customer_id',  -- Changed from username
    new.raw_user_meta_data->>'role',
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create or replace the function for generating unique customer IDs
CREATE OR REPLACE FUNCTION public.generate_unique_customer_id(country_code TEXT)
RETURNS TEXT AS $$
DECLARE
  new_customer_id TEXT;
  exists_count INT;
BEGIN
  LOOP
    -- Generate a new customer ID
    new_customer_id := 'CRD-' || UPPER(country_code) || '-' || 
                       EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
                       UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
    
    -- Check if it already exists
    SELECT COUNT(*) INTO exists_count 
    FROM profiles 
    WHERE customer_id = new_customer_id;
    
    -- If unique, return it
    IF exists_count = 0 THEN
      RETURN new_customer_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Update login_attempts table if it references username
ALTER TABLE login_attempts 
RENAME COLUMN username TO email;

-- 5. Add comment to clarify the purpose
COMMENT ON COLUMN profiles.customer_id IS 'Unique customer identifier for reference purposes only. Not used for authentication.';

-- 6. Drop the old generate_unique_username function if it exists
DROP FUNCTION IF EXISTS public.generate_unique_username(TEXT);