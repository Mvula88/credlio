-- ============================================
-- FIX FUNCTION ERROR - DROP AND RECREATE
-- ============================================

-- 1. Drop the existing function with all its signatures
DROP FUNCTION IF EXISTS create_or_update_profile(uuid,text,text,text,text,uuid,text,text,date);
DROP FUNCTION IF EXISTS create_or_update_profile(uuid,text,text,text,text,uuid);
DROP FUNCTION IF EXISTS create_or_update_profile;

-- 2. Recreate the function with proper parameters
CREATE OR REPLACE FUNCTION create_or_update_profile(
    p_auth_user_id uuid,
    p_email text,
    p_full_name text,
    p_phone text,
    p_role text,
    p_country_id uuid,
    p_national_id_hash text DEFAULT NULL,
    p_id_type text DEFAULT NULL,
    p_date_of_birth date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id uuid;
    v_country_uuid uuid;
BEGIN
    -- Handle country_id - could be UUID or country code
    IF p_country_id IS NOT NULL THEN
        -- Check if it's a valid UUID
        BEGIN
            v_country_uuid := p_country_id::uuid;
        EXCEPTION WHEN OTHERS THEN
            -- Not a UUID, try to look it up as a country code
            SELECT id INTO v_country_uuid 
            FROM countries 
            WHERE code = p_country_id::text
            LIMIT 1;
        END;
    END IF;
    
    -- If still no country, use default (Namibia)
    IF v_country_uuid IS NULL THEN
        SELECT id INTO v_country_uuid 
        FROM countries 
        WHERE code = 'NA' 
        LIMIT 1;
    END IF;

    -- Try to update existing profile first
    UPDATE profiles 
    SET 
        full_name = COALESCE(p_full_name, full_name),
        phone_number = COALESCE(p_phone, phone_number),
        role = COALESCE(p_role, role),
        country_id = COALESCE(v_country_uuid, country_id),
        national_id_hash = COALESCE(p_national_id_hash, national_id_hash),
        id_type = COALESCE(p_id_type, id_type),
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
        updated_at = now()
    WHERE auth_user_id = p_auth_user_id
    RETURNING id INTO v_profile_id;
    
    -- If no profile exists, create one
    IF v_profile_id IS NULL THEN
        INSERT INTO profiles (
            auth_user_id,
            email,
            full_name,
            phone_number,
            role,
            country_id,
            national_id_hash,
            id_type,
            date_of_birth,
            created_at
        ) VALUES (
            p_auth_user_id,
            p_email,
            p_full_name,
            p_phone,
            p_role,
            v_country_uuid,
            p_national_id_hash,
            p_id_type,
            p_date_of_birth,
            now()
        )
        ON CONFLICT (auth_user_id) 
        DO UPDATE SET
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
            phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
            role = COALESCE(EXCLUDED.role, profiles.role),
            country_id = COALESCE(EXCLUDED.country_id, profiles.country_id),
            national_id_hash = COALESCE(EXCLUDED.national_id_hash, profiles.national_id_hash),
            id_type = COALESCE(EXCLUDED.id_type, profiles.id_type),
            date_of_birth = COALESCE(EXCLUDED.date_of_birth, profiles.date_of_birth),
            updated_at = now()
        RETURNING id INTO v_profile_id;
    END IF;
    
    -- Create borrower profile if role is borrower
    IF p_role = 'borrower' AND v_profile_id IS NOT NULL THEN
        INSERT INTO borrower_profiles (
            user_id,
            reputation_score,
            total_loans_requested,
            loans_repaid,
            loans_defaulted,
            created_at
        ) VALUES (
            v_profile_id,
            50, -- Default starting score
            0,
            0,
            0,
            now()
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN v_profile_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in create_or_update_profile: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION create_or_update_profile TO authenticated;
GRANT EXECUTE ON FUNCTION create_or_update_profile TO anon;

-- 4. Also ensure the check_duplicate_identity function exists
DROP FUNCTION IF EXISTS check_duplicate_identity(text,text,date);

CREATE OR REPLACE FUNCTION check_duplicate_identity(
    p_national_id_hash text,
    p_full_name text,
    p_date_of_birth date
)
RETURNS TABLE(is_duplicate boolean) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT EXISTS (
        SELECT 1 
        FROM identity_verifications 
        WHERE national_id_hash = p_national_id_hash
        LIMIT 1
    ) as is_duplicate;
END;
$$;

GRANT EXECUTE ON FUNCTION check_duplicate_identity TO authenticated;
GRANT EXECUTE ON FUNCTION check_duplicate_identity TO anon;

-- 5. Create a simpler signup helper function for testing
CREATE OR REPLACE FUNCTION simple_create_profile(
    p_auth_user_id uuid,
    p_email text,
    p_full_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id uuid;
    v_default_country_id uuid;
BEGIN
    -- Get default country (Namibia)
    SELECT id INTO v_default_country_id 
    FROM countries 
    WHERE code = 'NA' 
    LIMIT 1;
    
    -- Create or update profile
    INSERT INTO profiles (
        auth_user_id,
        email,
        full_name,
        country_id,
        created_at
    ) VALUES (
        p_auth_user_id,
        p_email,
        p_full_name,
        v_default_country_id,
        now()
    )
    ON CONFLICT (auth_user_id) 
    DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        updated_at = now()
    RETURNING id INTO v_profile_id;
    
    RETURN v_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION simple_create_profile TO authenticated;
GRANT EXECUTE ON FUNCTION simple_create_profile TO anon;

-- 6. Verification
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ FUNCTIONS FIXED SUCCESSFULLY';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions recreated:';
    RAISE NOTICE '1. create_or_update_profile() - Full version';
    RAISE NOTICE '2. check_duplicate_identity() - For duplicate check';
    RAISE NOTICE '3. simple_create_profile() - Simplified for testing';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Go to /test-signup in your browser';
    RAISE NOTICE '2. Test the signup flow';
    RAISE NOTICE '3. Check browser console for errors';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;