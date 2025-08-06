-- ============================================
-- CREATE RPC FUNCTIONS FOR SIGNUP PROCESS
-- ============================================

-- 1. Function to check for duplicate identity
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

-- 2. Function to create or update profile
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

-- 3. Function to accept invitation (if needed)
CREATE OR REPLACE FUNCTION accept_invitation(
    p_invitation_code text,
    p_borrower_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation_id uuid;
    v_lender_id uuid;
BEGIN
    -- Find the invitation
    SELECT id, lender_id 
    INTO v_invitation_id, v_lender_id
    FROM invitations
    WHERE code = p_invitation_code
    AND status = 'pending'
    AND expires_at > now();
    
    IF v_invitation_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Update invitation status
    UPDATE invitations
    SET 
        status = 'accepted',
        borrower_id = p_borrower_id,
        accepted_at = now()
    WHERE id = v_invitation_id;
    
    -- Create relationship between lender and borrower
    INSERT INTO lender_borrower_relationships (
        lender_id,
        borrower_id,
        created_at
    ) VALUES (
        v_lender_id,
        p_borrower_id,
        now()
    )
    ON CONFLICT DO NOTHING;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- 4. Ensure profiles table has all necessary columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS national_id_hash text,
ADD COLUMN IF NOT EXISTS id_type text,
ADD COLUMN IF NOT EXISTS date_of_birth date;

-- 5. Create identity_verifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS identity_verifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    national_id_hash text NOT NULL,
    full_name text NOT NULL,
    date_of_birth date NOT NULL,
    id_type text NOT NULL,
    country_code text NOT NULL,
    verified_profile_id uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now(),
    UNIQUE(national_id_hash)
);

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION check_duplicate_identity TO authenticated;
GRANT EXECUTE ON FUNCTION create_or_update_profile TO authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation TO authenticated;
GRANT ALL ON identity_verifications TO authenticated;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_identity_verifications_hash 
ON identity_verifications(national_id_hash);

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id 
ON profiles(auth_user_id);

-- 8. Verification
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ RPC FUNCTIONS CREATED SUCCESSFULLY';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '1. check_duplicate_identity()';
    RAISE NOTICE '2. create_or_update_profile()';
    RAISE NOTICE '3. accept_invitation()';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables updated:';
    RAISE NOTICE '- profiles (added missing columns)';
    RAISE NOTICE '- identity_verifications (created if missing)';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;