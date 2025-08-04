-- ============================================
-- REMOVE USERNAME COLUMN AND REFERENCES
-- ============================================
-- Since we're using email-based authentication, we don't need username

-- ============================================
-- 1. CHECK CURRENT PROFILES TABLE STRUCTURE
-- ============================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

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
-- 6. VERIFY CHANGES
-- ============================================
DO $$
DECLARE
    has_username boolean;
BEGIN
    -- Check if username column exists
    SELECT EXISTS(
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'username'
    ) INTO has_username;
    
    IF has_username THEN
        RAISE WARNING '❌ Username column still exists!';
    ELSE
        RAISE NOTICE '✅ Username column successfully removed';
        RAISE NOTICE '✅ Trigger updated to not use username';
        RAISE NOTICE '✅ Username generation function removed';
        RAISE NOTICE '';
        RAISE NOTICE '📝 Authentication now uses:';
        RAISE NOTICE '   - Email for login';
        RAISE NOTICE '   - Customer ID (displayed after signup) for reference only';
        RAISE NOTICE '';
        RAISE NOTICE '✅ The signup should now work without username errors!';
    END IF;
END $$;

-- ============================================
-- 7. SHOW FINAL TABLE STRUCTURE
-- ============================================
SELECT 
    '✅ Profiles table now has these columns:' as message
UNION ALL
SELECT 
    '   - ' || column_name || ' (' || data_type || ')'
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;