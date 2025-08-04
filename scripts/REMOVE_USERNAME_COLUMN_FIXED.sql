-- ============================================
-- REMOVE USERNAME COLUMN AND REFERENCES (FIXED)
-- ============================================
-- Since we're using email-based authentication, we don't need username

-- ============================================
-- 1. CHECK CURRENT PROFILES TABLE STRUCTURE
-- ============================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY column_name;

-- ============================================
-- 2. DROP USERNAME COLUMN IF IT EXISTS
-- ============================================
ALTER TABLE profiles 
DROP COLUMN IF EXISTS username CASCADE;

-- ============================================
-- 3. UPDATE THE TRIGGER TO NOT USE USERNAME
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile for new auth user (NO USERNAME)
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
  ON CONFLICT (auth_user_id) 
  DO UPDATE SET
    updated_at = now();
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail auth signup
  RAISE WARNING 'Could not create profile for user %: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 4. DROP USERNAME GENERATION FUNCTION
-- ============================================
DROP FUNCTION IF EXISTS generate_unique_username(text);

-- ============================================
-- 5. DROP ANY INDEXES ON USERNAME
-- ============================================
DROP INDEX IF EXISTS idx_profiles_username;

-- ============================================
-- 6. ADD CUSTOMER_ID COLUMN IF NEEDED (for reference only)
-- ============================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS customer_id text;

-- Create index for customer_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_customer_id ON profiles(customer_id);

-- ============================================
-- 7. VERIFY CHANGES
-- ============================================
DO $$
DECLARE
    has_username boolean;
    has_customer_id boolean;
BEGIN
    -- Check if username column exists
    SELECT EXISTS(
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'username'
    ) INTO has_username;
    
    -- Check if customer_id column exists
    SELECT EXISTS(
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'customer_id'
    ) INTO has_customer_id;
    
    IF has_username THEN
        RAISE WARNING '❌ Username column still exists!';
    ELSE
        RAISE NOTICE '✅ Username column successfully removed';
    END IF;
    
    IF has_customer_id THEN
        RAISE NOTICE '✅ Customer ID column exists for reference';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📝 Authentication now uses:';
    RAISE NOTICE '   - Email for login';
    RAISE NOTICE '   - Password for authentication';
    RAISE NOTICE '   - Customer ID for reference only (not for login)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ The signup should now work without username errors!';
END $$;

-- ============================================
-- 8. SHOW FINAL TABLE STRUCTURE
-- ============================================
SELECT 
    column_name as "Column", 
    data_type as "Type",
    is_nullable as "Nullable"
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY column_name;

-- ============================================
-- 9. UPDATE TRIGGER TO HANDLE CUSTOMER_ID
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile for new auth user with customer_id
  INSERT INTO public.profiles (
    id,
    auth_user_id,
    email,
    full_name,
    role,
    customer_id,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'borrower'),
    COALESCE(new.raw_user_meta_data->>'customer_id', NULL),
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) 
  DO UPDATE SET
    customer_id = COALESCE(EXCLUDED.customer_id, profiles.customer_id),
    updated_at = now();
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail auth signup
  RAISE WARNING 'Could not create profile for user %: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 10. FINAL SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ USERNAME REMOVAL COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Username column removed';
    RAISE NOTICE '✅ Customer ID column added (for reference)';
    RAISE NOTICE '✅ Trigger updated';
    RAISE NOTICE '✅ Indexes updated';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Users now sign in with:';
    RAISE NOTICE '   • Email address';
    RAISE NOTICE '   • Password';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Customer ID is only for:';
    RAISE NOTICE '   • Display purposes';
    RAISE NOTICE '   • Customer reference';
    RAISE NOTICE '   • Support tickets';
    RAISE NOTICE '========================================';
END $$;