-- =====================================================
-- CLEAN AND FIX PERSISTENT TRACKING
-- =====================================================
-- This script cleans up existing functions and recreates them
-- =====================================================

-- First, drop all existing functions with all possible signatures
DO $$
BEGIN
    -- Drop all versions of create_or_update_persistent_identity
    DROP FUNCTION IF EXISTS create_or_update_persistent_identity(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, DATE, INET);
    DROP FUNCTION IF EXISTS create_or_update_persistent_identity(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, DATE, JSONB, INET);
    DROP FUNCTION IF EXISTS create_or_update_persistent_identity CASCADE;
    
    -- Drop all versions of check_persistent_identity
    DROP FUNCTION IF EXISTS check_persistent_identity(VARCHAR, VARCHAR, VARCHAR);
    DROP FUNCTION IF EXISTS check_persistent_identity CASCADE;
    
    -- Drop all versions of update functions
    DROP FUNCTION IF EXISTS update_borrower_ip(UUID, TEXT);
    DROP FUNCTION IF EXISTS update_borrower_ip CASCADE;
    DROP FUNCTION IF EXISTS update_device_fingerprint(UUID, JSONB, TEXT);
    DROP FUNCTION IF EXISTS update_device_fingerprint CASCADE;
    
    -- Drop all versions of match_borrower_identity
    DROP FUNCTION IF EXISTS match_borrower_identity(VARCHAR, VARCHAR, VARCHAR, VARCHAR);
    DROP FUNCTION IF EXISTS match_borrower_identity CASCADE;
    
    RAISE NOTICE 'All existing functions dropped successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some functions may not exist, continuing...';
END $$;

-- =====================================================
-- RECREATE TABLE (IF NEEDED)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.persistent_borrower_identity (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Primary identifiers (these survive account deletion)
    national_id VARCHAR(100) UNIQUE,
    phone_number VARCHAR(50),
    email_hash VARCHAR(64), -- SHA-256 hash of lowercase email
    
    -- Additional identifiers for matching
    full_name_normalized VARCHAR(255), -- Lowercase, trimmed
    date_of_birth DATE,
    
    -- IP tracking for security (simplified)
    last_known_ips TEXT[], -- Array of IP addresses
    
    -- Risk status (persists even if account deleted)
    is_risky BOOLEAN DEFAULT FALSE,
    risk_score INTEGER DEFAULT 0,
    times_reported INTEGER DEFAULT 0,
    total_amount_owed DECIMAL(15, 2) DEFAULT 0,
    
    -- Account history
    account_deletions INTEGER DEFAULT 0,
    last_account_deleted_at TIMESTAMP WITH TIME ZONE,
    reregistration_attempts INTEGER DEFAULT 0,
    
    -- Tracking
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_persistent_identity_national_id 
    ON public.persistent_borrower_identity(national_id) WHERE national_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_persistent_identity_email_hash 
    ON public.persistent_borrower_identity(email_hash) WHERE email_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_persistent_identity_phone 
    ON public.persistent_borrower_identity(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_persistent_identity_risky 
    ON public.persistent_borrower_identity(is_risky) WHERE is_risky = TRUE;

-- =====================================================
-- CREATE IDENTITY MANAGEMENT FUNCTION
-- =====================================================
CREATE FUNCTION create_or_update_persistent_identity(
    p_profile_id UUID,
    p_email VARCHAR,
    p_phone VARCHAR DEFAULT NULL,
    p_national_id VARCHAR DEFAULT NULL,
    p_full_name VARCHAR DEFAULT NULL,
    p_date_of_birth DATE DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_identity_id UUID;
    v_email_hash VARCHAR(64);
    v_name_normalized VARCHAR(255);
    v_current_ips TEXT[];
BEGIN
    -- Generate email hash for privacy
    IF p_email IS NOT NULL AND p_email != '' THEN
        v_email_hash := encode(digest(lower(trim(p_email)), 'sha256'), 'hex');
    END IF;
    
    -- Normalize name
    IF p_full_name IS NOT NULL AND p_full_name != '' THEN
        v_name_normalized := lower(trim(p_full_name));
    END IF;
    
    -- Try to find existing identity
    SELECT id INTO v_identity_id
    FROM persistent_borrower_identity
    WHERE (national_id IS NOT NULL AND national_id = p_national_id AND p_national_id IS NOT NULL AND p_national_id != '')
       OR (email_hash IS NOT NULL AND email_hash = v_email_hash AND v_email_hash IS NOT NULL)
       OR (phone_number IS NOT NULL AND phone_number = p_phone AND p_phone IS NOT NULL AND p_phone != '')
    ORDER BY 
        CASE 
            WHEN national_id = p_national_id THEN 1
            WHEN email_hash = v_email_hash THEN 2
            WHEN phone_number = p_phone THEN 3
            ELSE 4
        END
    LIMIT 1;
    
    IF v_identity_id IS NULL THEN
        -- Create new identity
        INSERT INTO persistent_borrower_identity (
            national_id,
            phone_number,
            email_hash,
            full_name_normalized,
            date_of_birth,
            last_known_ips
        ) VALUES (
            NULLIF(trim(p_national_id), ''),
            NULLIF(trim(p_phone), ''),
            v_email_hash,
            v_name_normalized,
            p_date_of_birth,
            CASE 
                WHEN p_ip_address IS NOT NULL 
                THEN ARRAY[p_ip_address::text]::TEXT[]
                ELSE ARRAY[]::TEXT[]
            END
        ) RETURNING id INTO v_identity_id;
        
        RAISE NOTICE 'Created new persistent identity: %', v_identity_id;
    ELSE
        -- Get current IPs
        SELECT last_known_ips INTO v_current_ips
        FROM persistent_borrower_identity
        WHERE id = v_identity_id;
        
        -- Update existing identity
        UPDATE persistent_borrower_identity
        SET 
            national_id = COALESCE(NULLIF(trim(p_national_id), ''), national_id),
            phone_number = COALESCE(NULLIF(trim(p_phone), ''), phone_number),
            full_name_normalized = COALESCE(v_name_normalized, full_name_normalized),
            date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
            last_known_ips = CASE 
                WHEN p_ip_address IS NOT NULL AND p_ip_address::text != '' THEN
                    CASE 
                        WHEN p_ip_address::text = ANY(COALESCE(v_current_ips, ARRAY[]::TEXT[]))
                        THEN v_current_ips
                        ELSE 
                            -- Add new IP, keep max 20
                            (SELECT array_agg(DISTINCT ip) FROM (
                                SELECT unnest(array_append(COALESCE(v_current_ips, ARRAY[]::TEXT[]), p_ip_address::text)) as ip
                                LIMIT 20
                            ) t)
                    END
                ELSE last_known_ips
            END,
            last_seen_at = NOW(),
            updated_at = NOW()
        WHERE id = v_identity_id;
        
        RAISE NOTICE 'Updated existing persistent identity: %', v_identity_id;
    END IF;
    
    RETURN v_identity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREATE IP UPDATE FUNCTION
-- =====================================================
CREATE FUNCTION update_borrower_ip(
    p_profile_id UUID,
    p_ip_address TEXT
)
RETURNS VOID AS $$
DECLARE
    v_identity_id UUID;
    v_current_ips TEXT[];
    v_email VARCHAR;
BEGIN
    -- Get email from profile
    SELECT email INTO v_email
    FROM profiles
    WHERE id = p_profile_id;
    
    IF v_email IS NOT NULL THEN
        -- Find persistent identity by email hash
        SELECT id, last_known_ips 
        INTO v_identity_id, v_current_ips
        FROM persistent_borrower_identity
        WHERE email_hash = encode(digest(lower(trim(v_email)), 'sha256'), 'hex')
        LIMIT 1;
    END IF;
    
    -- If not found by email, try blacklisted_borrowers
    IF v_identity_id IS NULL THEN
        SELECT persistent_identity_id INTO v_identity_id
        FROM blacklisted_borrowers
        WHERE borrower_profile_id = p_profile_id
        AND persistent_identity_id IS NOT NULL
        LIMIT 1;
        
        IF v_identity_id IS NOT NULL THEN
            SELECT last_known_ips INTO v_current_ips
            FROM persistent_borrower_identity
            WHERE id = v_identity_id;
        END IF;
    END IF;
    
    IF v_identity_id IS NOT NULL AND p_ip_address IS NOT NULL AND p_ip_address != '' THEN
        -- Update IP addresses if new IP not already present
        IF NOT (p_ip_address = ANY(COALESCE(v_current_ips, ARRAY[]::TEXT[]))) THEN
            UPDATE persistent_borrower_identity
            SET 
                last_known_ips = (
                    SELECT array_agg(DISTINCT ip) FROM (
                        SELECT unnest(array_append(COALESCE(v_current_ips, ARRAY[]::TEXT[]), p_ip_address)) as ip
                        LIMIT 20
                    ) t
                ),
                last_seen_at = NOW()
            WHERE id = v_identity_id;
        ELSE
            -- Just update last seen time
            UPDATE persistent_borrower_identity
            SET last_seen_at = NOW()
            WHERE id = v_identity_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREATE CHECK IDENTITY FUNCTION
-- =====================================================
CREATE FUNCTION check_persistent_identity(
    p_email_hash VARCHAR,
    p_phone VARCHAR DEFAULT NULL,
    p_national_id VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_identity RECORD;
BEGIN
    -- Clean input parameters
    p_phone := NULLIF(trim(p_phone), '');
    p_national_id := NULLIF(trim(p_national_id), '');
    
    -- Find persistent identity using any available identifier
    SELECT 
        id,
        is_risky,
        risk_score,
        times_reported,
        total_amount_owed,
        account_deletions,
        last_account_deleted_at,
        reregistration_attempts
    INTO v_identity
    FROM persistent_borrower_identity
    WHERE (email_hash = p_email_hash AND p_email_hash IS NOT NULL)
       OR (phone_number = p_phone AND p_phone IS NOT NULL)
       OR (national_id = p_national_id AND p_national_id IS NOT NULL)
    ORDER BY 
        is_risky DESC, 
        risk_score DESC,
        times_reported DESC
    LIMIT 1;
    
    IF v_identity.id IS NULL THEN
        RETURN jsonb_build_object(
            'found', false,
            'is_risky', false
        );
    END IF;
    
    RETURN jsonb_build_object(
        'found', true,
        'identity_id', v_identity.id,
        'is_risky', v_identity.is_risky,
        'risk_score', v_identity.risk_score,
        'times_reported', v_identity.times_reported,
        'total_amount_owed', v_identity.total_amount_owed,
        'account_deletions', v_identity.account_deletions,
        'last_account_deleted_at', v_identity.last_account_deleted_at,
        'reregistration_attempts', v_identity.reregistration_attempts
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREATE MATCH IDENTITY FUNCTION
-- =====================================================
CREATE FUNCTION match_borrower_identity(
    p_email VARCHAR DEFAULT NULL,
    p_phone VARCHAR DEFAULT NULL,
    p_national_id VARCHAR DEFAULT NULL,
    p_full_name VARCHAR DEFAULT NULL
)
RETURNS TABLE(
    identity_id UUID,
    match_confidence VARCHAR,
    match_reason TEXT
) AS $$
DECLARE
    v_email_hash VARCHAR(64);
    v_name_normalized VARCHAR(255);
BEGIN
    -- Prepare search values
    IF p_email IS NOT NULL AND p_email != '' THEN
        v_email_hash := encode(digest(lower(trim(p_email)), 'sha256'), 'hex');
    END IF;
    
    IF p_full_name IS NOT NULL AND p_full_name != '' THEN
        v_name_normalized := lower(trim(p_full_name));
    END IF;
    
    -- Clean other parameters
    p_phone := NULLIF(trim(p_phone), '');
    p_national_id := NULLIF(trim(p_national_id), '');
    
    RETURN QUERY
    SELECT 
        pbi.id,
        CASE 
            WHEN pbi.national_id = p_national_id AND p_national_id IS NOT NULL THEN 'HIGH'::VARCHAR
            WHEN pbi.email_hash = v_email_hash AND pbi.phone_number = p_phone 
                 AND v_email_hash IS NOT NULL AND p_phone IS NOT NULL THEN 'HIGH'::VARCHAR
            WHEN pbi.email_hash = v_email_hash AND v_email_hash IS NOT NULL THEN 'MEDIUM'::VARCHAR
            WHEN pbi.phone_number = p_phone AND pbi.full_name_normalized = v_name_normalized 
                 AND p_phone IS NOT NULL AND v_name_normalized IS NOT NULL THEN 'MEDIUM'::VARCHAR
            WHEN pbi.phone_number = p_phone AND p_phone IS NOT NULL THEN 'LOW'::VARCHAR
            ELSE 'NONE'::VARCHAR
        END as match_confidence,
        CASE 
            WHEN pbi.national_id = p_national_id AND p_national_id IS NOT NULL 
                THEN 'Matched by National ID'::TEXT
            WHEN pbi.email_hash = v_email_hash AND pbi.phone_number = p_phone 
                 AND v_email_hash IS NOT NULL AND p_phone IS NOT NULL
                THEN 'Matched by Email and Phone'::TEXT
            WHEN pbi.email_hash = v_email_hash AND v_email_hash IS NOT NULL
                THEN 'Matched by Email'::TEXT
            WHEN pbi.phone_number = p_phone AND pbi.full_name_normalized = v_name_normalized 
                 AND p_phone IS NOT NULL AND v_name_normalized IS NOT NULL
                THEN 'Matched by Phone and Name'::TEXT
            WHEN pbi.phone_number = p_phone AND p_phone IS NOT NULL
                THEN 'Matched by Phone'::TEXT
            ELSE 'No match'::TEXT
        END as match_reason
    FROM persistent_borrower_identity pbi
    WHERE 
        (pbi.national_id = p_national_id AND p_national_id IS NOT NULL)
        OR (pbi.email_hash = v_email_hash AND v_email_hash IS NOT NULL)
        OR (pbi.phone_number = p_phone AND p_phone IS NOT NULL)
    ORDER BY 
        CASE 
            WHEN pbi.national_id = p_national_id THEN 1
            WHEN pbi.email_hash = v_email_hash AND pbi.phone_number = p_phone THEN 2
            WHEN pbi.email_hash = v_email_hash THEN 3
            WHEN pbi.phone_number = p_phone AND pbi.full_name_normalized = v_name_normalized THEN 4
            WHEN pbi.phone_number = p_phone THEN 5
            ELSE 6
        END
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SET UP RLS POLICIES
-- =====================================================
ALTER TABLE public.persistent_borrower_identity ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can view persistent identities" ON public.persistent_borrower_identity;
DROP POLICY IF EXISTS "Lenders can view risky identities" ON public.persistent_borrower_identity;

-- Create policies
CREATE POLICY "Admin can view persistent identities" ON public.persistent_borrower_identity
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Lenders can view risky identities" ON public.persistent_borrower_identity
    FOR SELECT USING (
        is_risky = TRUE AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'lender'
        )
    );

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON public.persistent_borrower_identity TO authenticated;
GRANT EXECUTE ON FUNCTION create_or_update_persistent_identity TO authenticated;
GRANT EXECUTE ON FUNCTION check_persistent_identity TO authenticated;
GRANT EXECUTE ON FUNCTION update_borrower_ip TO authenticated;
GRANT EXECUTE ON FUNCTION match_borrower_identity TO authenticated;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================
DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_functions_created INTEGER;
BEGIN
    -- Check table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'persistent_borrower_identity'
    ) INTO v_table_exists;
    
    -- Count functions
    SELECT COUNT(DISTINCT routine_name) INTO v_functions_created
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name IN (
        'create_or_update_persistent_identity',
        'check_persistent_identity',
        'update_borrower_ip',
        'match_borrower_identity'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PERSISTENT TRACKING SETUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Table exists: %', v_table_exists;
    RAISE NOTICE 'Functions created: %/4', v_functions_created;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'System now tracks borrowers by:';
    RAISE NOTICE '  1. National ID (Primary)';
    RAISE NOTICE '  2. Email Address (Hashed)';
    RAISE NOTICE '  3. Phone Number';
    RAISE NOTICE '  4. IP Address History';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Risky borrowers CANNOT:';
    RAISE NOTICE '  - Delete accounts with debts';
    RAISE NOTICE '  - Create new accounts to evade';
    RAISE NOTICE '  - Remove their debt history';
    RAISE NOTICE '========================================';
END $$;