-- ============================================
-- ALTERNATIVE FIX: Remove Foreign Key Constraint
-- ============================================
-- If the foreign key keeps causing issues, this removes it entirely
-- This allows signup to work while we fix the underlying issue

-- STEP 1: Drop ALL foreign key constraints on profiles.auth_user_id
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_auth_user_id_fkey CASCADE;

-- Drop any other potential constraints with different names
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'profiles'::regclass 
        AND contype = 'f'
        AND EXISTS (
            SELECT 1 FROM pg_attribute 
            WHERE attrelid = conrelid 
            AND attname = 'auth_user_id' 
            AND attnum = ANY(conkey)
        )
    LOOP
        EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT IF EXISTS ' || constraint_record.conname || ' CASCADE';
        RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ All foreign key constraints on auth_user_id have been removed';
    RAISE NOTICE '✅ Signup should now work without foreign key errors';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Note: This is a temporary fix. The foreign key provides data integrity.';
    RAISE NOTICE '⚠️  You should add it back once the auth.users reference is fixed.';
END $$;

-- STEP 2: Verify no foreign keys remain
SELECT 
    'Foreign key constraints on profiles.auth_user_id' as check_item,
    COUNT(*) as count
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND contype = 'f'
AND EXISTS (
    SELECT 1 FROM pg_attribute 
    WHERE attrelid = conrelid 
    AND attname = 'auth_user_id' 
    AND attnum = ANY(conkey)
);

-- STEP 3: Create a SOFT relationship using a trigger instead
-- This will validate the auth_user_id exists but won't enforce it as strictly
CREATE OR REPLACE FUNCTION validate_auth_user_exists()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate on insert, not update
    IF TG_OP = 'INSERT' THEN
        -- Check if auth user exists
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.auth_user_id) THEN
            -- Log warning but don't fail the insert
            RAISE WARNING 'Auth user % does not exist in auth.users table', NEW.auth_user_id;
            -- Optionally, you could still reject the insert by uncommenting the next line:
            -- RAISE EXCEPTION 'Auth user % does not exist', NEW.auth_user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS validate_auth_user_trigger ON profiles;

-- Create the validation trigger
CREATE TRIGGER validate_auth_user_trigger
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION validate_auth_user_exists();

-- STEP 4: Add an index for performance (since we removed the foreign key)
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);

-- STEP 5: Final message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ ALTERNATIVE FIX APPLIED';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ Foreign key constraint removed';
    RAISE NOTICE '✅ Soft validation trigger added';
    RAISE NOTICE '✅ Performance index created';
    RAISE NOTICE '';
    RAISE NOTICE 'The signup should now work!';
    RAISE NOTICE '';
    RAISE NOTICE 'To re-add the foreign key later:';
    RAISE NOTICE 'ALTER TABLE profiles ADD CONSTRAINT profiles_auth_user_id_fkey';
    RAISE NOTICE 'FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;';
    RAISE NOTICE '====================================';
END $$;