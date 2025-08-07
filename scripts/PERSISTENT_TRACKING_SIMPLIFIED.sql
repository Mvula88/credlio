-- =====================================================
-- SIMPLIFIED PERSISTENT RISKY BORROWER TRACKING SYSTEM
-- =====================================================
-- Uses reliable identifiers only:
-- 1. National ID number
-- 2. Email address (hashed)
-- 3. Phone number
-- 4. IP address tracking
-- No device fingerprinting required
-- =====================================================

-- =====================================================
-- 1. CREATE SIMPLIFIED PERSISTENT IDENTITY TABLE
-- =====================================================
DROP TABLE IF EXISTS public.persistent_borrower_identity CASCADE;

CREATE TABLE public.persistent_borrower_identity (
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

-- Create indexes for fast lookups
CREATE INDEX idx_persistent_identity_national_id 
    ON public.persistent_borrower_identity(national_id);
CREATE INDEX idx_persistent_identity_email_hash 
    ON public.persistent_borrower_identity(email_hash);
CREATE INDEX idx_persistent_identity_phone 
    ON public.persistent_borrower_identity(phone_number);
CREATE INDEX idx_persistent_identity_risky 
    ON public.persistent_borrower_identity(is_risky) WHERE is_risky = TRUE;

-- =====================================================
-- 2. SIMPLIFIED IDENTITY CREATION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION create_or_update_persistent_identity(
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
BEGIN
    -- Generate email hash for privacy
    v_email_hash := encode(digest(lower(trim(p_email)), 'sha256'), 'hex');
    
    -- Normalize name
    v_name_normalized := lower(trim(COALESCE(p_full_name, '')));
    
    -- Try to find existing identity by multiple methods
    -- Priority: National ID > Email > Phone
    SELECT id INTO v_identity_id
    FROM persistent_borrower_identity
    WHERE (national_id = p_national_id AND national_id IS NOT NULL AND national_id != '')
       OR (email_hash = v_email_hash AND v_email_hash IS NOT NULL)
       OR (phone_number = p_phone AND phone_number IS NOT NULL AND phone_number != '')
    ORDER BY 
        CASE 
            WHEN national_id = p_national_id THEN 1
            WHEN email_hash = v_email_hash THEN 2
            WHEN phone_number = p_phone THEN 3
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
            NULLIF(p_national_id, ''),
            NULLIF(p_phone, ''),
            v_email_hash,
            v_name_normalized,
            p_date_of_birth,
            CASE WHEN p_ip_address IS NOT NULL 
                 THEN ARRAY[p_ip_address::text] 
                 ELSE ARRAY[]::text[] END
        ) RETURNING id INTO v_identity_id;
    ELSE
        -- Update existing identity with any new information
        UPDATE persistent_borrower_identity
        SET 
            national_id = COALESCE(NULLIF(p_national_id, ''), national_id),
            phone_number = COALESCE(NULLIF(p_phone, ''), phone_number),
            full_name_normalized = COALESCE(NULLIF(v_name_normalized, ''), full_name_normalized),
            date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
            last_known_ips = CASE 
                WHEN p_ip_address IS NOT NULL 
                    AND NOT (p_ip_address::text = ANY(COALESCE(last_known_ips, ARRAY[]::text[])))
                THEN (
                    SELECT array_agg(ip) 
                    FROM (
                        SELECT unnest(array_append(
                            COALESCE(last_known_ips, ARRAY[]::text[]), 
                            p_ip_address::text
                        )) as ip
                        LIMIT 20
                    ) t
                )
                ELSE last_known_ips 
            END,
            last_seen_at = NOW(),
            updated_at = NOW()
        WHERE id = v_identity_id;
    END IF;
    
    RETURN v_identity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. SIMPLIFIED CHECK FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION check_persistent_identity(
    p_email_hash VARCHAR,
    p_phone VARCHAR DEFAULT NULL,
    p_national_id VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_identity RECORD;
BEGIN
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
    WHERE (email_hash = p_email_hash)
       OR (phone_number = p_phone AND p_phone IS NOT NULL AND p_phone != '')
       OR (national_id = p_national_id AND p_national_id IS NOT NULL AND p_national_id != '')
    ORDER BY is_risky DESC, risk_score DESC
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
-- 4. UPDATE IP ADDRESS TRACKING (SIMPLIFIED)
-- =====================================================
CREATE OR REPLACE FUNCTION update_borrower_ip(
    p_profile_id UUID,
    p_ip_address TEXT
)
RETURNS VOID AS $$
DECLARE
    v_identity_id UUID;
BEGIN
    -- Get persistent identity for this profile
    SELECT persistent_identity_id INTO v_identity_id
    FROM profiles
    WHERE id = p_profile_id;
    
    IF v_identity_id IS NULL THEN
        -- Get from blacklisted_borrowers
        SELECT persistent_identity_id INTO v_identity_id
        FROM blacklisted_borrowers
        WHERE borrower_profile_id = p_profile_id
        LIMIT 1;
    END IF;
    
    IF v_identity_id IS NOT NULL AND p_ip_address IS NOT NULL THEN
        -- Update IP addresses (keep last 20 unique IPs)
        UPDATE persistent_borrower_identity
        SET 
            last_known_ips = (
                SELECT array_agg(DISTINCT ip)
                FROM (
                    SELECT unnest(
                        array_append(
                            COALESCE(last_known_ips, ARRAY[]::text[]), 
                            p_ip_address
                        )
                    ) as ip
                    ORDER BY ip DESC
                    LIMIT 20
                ) t
            ),
            last_seen_at = NOW()
        WHERE id = v_identity_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. MATCHING ALGORITHM (PRIORITY-BASED)
-- =====================================================
CREATE OR REPLACE FUNCTION match_borrower_identity(
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
    v_email_hash := CASE 
        WHEN p_email IS NOT NULL 
        THEN encode(digest(lower(trim(p_email)), 'sha256'), 'hex')
        ELSE NULL 
    END;
    v_name_normalized := lower(trim(COALESCE(p_full_name, '')));
    
    RETURN QUERY
    SELECT 
        pbi.id,
        CASE 
            -- Highest confidence: National ID match
            WHEN pbi.national_id = p_national_id AND p_national_id IS NOT NULL THEN 'HIGH'
            -- High confidence: Email + Phone match
            WHEN pbi.email_hash = v_email_hash AND pbi.phone_number = p_phone THEN 'HIGH'
            -- Medium confidence: Email match
            WHEN pbi.email_hash = v_email_hash THEN 'MEDIUM'
            -- Medium confidence: Phone + Name match
            WHEN pbi.phone_number = p_phone AND pbi.full_name_normalized = v_name_normalized THEN 'MEDIUM'
            -- Low confidence: Phone only
            WHEN pbi.phone_number = p_phone THEN 'LOW'
            ELSE 'NONE'
        END as match_confidence,
        CASE 
            WHEN pbi.national_id = p_national_id AND p_national_id IS NOT NULL 
                THEN 'Matched by National ID'
            WHEN pbi.email_hash = v_email_hash AND pbi.phone_number = p_phone 
                THEN 'Matched by Email and Phone'
            WHEN pbi.email_hash = v_email_hash 
                THEN 'Matched by Email'
            WHEN pbi.phone_number = p_phone AND pbi.full_name_normalized = v_name_normalized 
                THEN 'Matched by Phone and Name'
            WHEN pbi.phone_number = p_phone 
                THEN 'Matched by Phone'
            ELSE 'No match'
        END as match_reason
    FROM persistent_borrower_identity pbi
    WHERE 
        (pbi.national_id = p_national_id AND p_national_id IS NOT NULL AND p_national_id != '')
        OR (pbi.email_hash = v_email_hash AND v_email_hash IS NOT NULL)
        OR (pbi.phone_number = p_phone AND p_phone IS NOT NULL AND p_phone != '')
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
-- 6. GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON public.persistent_borrower_identity TO authenticated;
GRANT EXECUTE ON FUNCTION create_or_update_persistent_identity TO authenticated;
GRANT EXECUTE ON FUNCTION check_persistent_identity TO authenticated;
GRANT EXECUTE ON FUNCTION update_borrower_ip TO authenticated;
GRANT EXECUTE ON FUNCTION match_borrower_identity TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SIMPLIFIED PERSISTENT TRACKING COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Identity Matching Methods:';
    RAISE NOTICE '1. National ID (Highest Priority)';
    RAISE NOTICE '2. Email Address (Hashed for Privacy)';
    RAISE NOTICE '3. Phone Number';
    RAISE NOTICE '4. IP Address Tracking (For Security)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'No device fingerprinting required!';
    RAISE NOTICE 'System uses reliable, universal identifiers';
    RAISE NOTICE '========================================';
END $$;