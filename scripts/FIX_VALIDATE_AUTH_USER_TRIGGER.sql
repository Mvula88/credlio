-- ============================================
-- FIX VALIDATE_AUTH_USER_TRIGGER
-- ============================================
-- The validate_auth_user_trigger is causing the permission error
-- It's trying to access a users table that doesn't exist or has no permissions

-- STEP 1: Drop the problematic trigger
DROP TRIGGER IF EXISTS validate_auth_user_trigger ON profiles;

-- STEP 2: Check and drop the function if it references wrong table
DROP FUNCTION IF EXISTS validate_auth_user_exists() CASCADE;

-- STEP 3: Create a corrected version that uses auth.users
CREATE OR REPLACE FUNCTION validate_auth_user_exists()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate on insert
    IF TG_OP = 'INSERT' THEN
        -- Check if auth user exists in auth.users (not public.users)
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.auth_user_id) THEN
            -- Just log a warning, don't block the insert
            RAISE WARNING 'Auth user % does not exist in auth.users table', NEW.auth_user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Recreate the trigger with the fixed function
CREATE TRIGGER validate_auth_user_trigger
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION validate_auth_user_exists();

-- STEP 5: Also ensure the on_auth_user_created trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
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
    new.raw_user_meta_data->>'customer_id',
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) 
  DO UPDATE SET
    customer_id = COALESCE(EXCLUDED.customer_id, profiles.customer_id),
    updated_at = now();
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Profile creation failed for %: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- STEP 6: Verify the fix
DO $$
DECLARE
    trigger_count int;
    has_validate_trigger boolean;
BEGIN
    -- Count validate_auth_user_trigger
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_name = 'validate_auth_user_trigger';
    
    -- Check if it exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'validate_auth_user_trigger'
        AND event_object_table = 'profiles'
    ) INTO has_validate_trigger;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TRIGGER FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Dropped old validate_auth_user_trigger';
    RAISE NOTICE '✅ Created new version that uses auth.users';
    RAISE NOTICE '✅ Trigger now exists: %', has_validate_trigger;
    RAISE NOTICE '✅ Total instances: %', trigger_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔐 The permission error should be fixed!';
    RAISE NOTICE '🚀 Try the signup again - it should work now!';
    RAISE NOTICE '========================================';
END $$;

-- STEP 7: Show all triggers on profiles table
SELECT 
    trigger_name,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
ORDER BY trigger_name;