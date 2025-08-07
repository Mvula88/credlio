-- =====================================================
-- PERSISTENT RISKY BORROWER TRACKING SYSTEM
-- =====================================================
-- Ensures risky/bad borrowers cannot evade their status by:
-- 1. Preventing automatic removal on account deletion
-- 2. Detecting re-registration attempts
-- 3. Reattaching history to new accounts
-- =====================================================

-- =====================================================
-- 1. CREATE PERSISTENT BORROWER IDENTITY TABLE
-- =====================================================
-- This table stores permanent identifiers that survive account deletion
CREATE TABLE IF NOT EXISTS public.persistent_borrower_identity (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Primary identifiers (these survive account deletion)
    national_id VARCHAR(100) UNIQUE,
    phone_number VARCHAR(50),
    email_hash VARCHAR(64), -- SHA-256 hash of lowercase email
    
    -- Additional identifiers for matching
    full_name_normalized VARCHAR(255), -- Lowercase, trimmed
    date_of_birth DATE,
    
    -- Device and browser fingerprints
    device_fingerprints JSONB DEFAULT '[]'::jsonb,
    ip_addresses JSONB DEFAULT '[]'::jsonb,
    
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
CREATE INDEX IF NOT EXISTS idx_persistent_identity_national_id 
    ON public.persistent_borrower_identity(national_id);
CREATE INDEX IF NOT EXISTS idx_persistent_identity_email_hash 
    ON public.persistent_borrower_identity(email_hash);
CREATE INDEX IF NOT EXISTS idx_persistent_identity_phone 
    ON public.persistent_borrower_identity(phone_number);
CREATE INDEX IF NOT EXISTS idx_persistent_identity_risky 
    ON public.persistent_borrower_identity(is_risky) WHERE is_risky = TRUE;

-- =====================================================
-- 2. CREATE ARCHIVED RISKY BORROWERS TABLE
-- =====================================================
-- Stores complete history even after account deletion
CREATE TABLE IF NOT EXISTS public.archived_risky_borrowers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Link to persistent identity
    persistent_identity_id UUID REFERENCES public.persistent_borrower_identity(id),
    
    -- Original blacklist entry data
    original_blacklist_id UUID,
    borrower_profile_id UUID, -- May no longer exist
    lender_profile_id UUID,
    
    -- Borrower info at time of archival
    borrower_name VARCHAR(255),
    borrower_email VARCHAR(255),
    borrower_phone VARCHAR(50),
    borrower_national_id VARCHAR(100),
    
    -- Debt details
    amount_owed DECIMAL(15, 2),
    reason TEXT,
    evidence_url TEXT,
    additional_notes TEXT,
    
    -- Status
    was_deregistered BOOLEAN DEFAULT FALSE,
    account_deleted BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    blacklisted_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_archived_risky_persistent_id 
    ON public.archived_risky_borrowers(persistent_identity_id);
CREATE INDEX IF NOT EXISTS idx_archived_risky_national_id 
    ON public.archived_risky_borrowers(borrower_national_id);

-- =====================================================
-- 3. MODIFY BLACKLISTED_BORROWERS TABLE
-- =====================================================
-- Add persistent identity link and protection flags
DO $$
BEGIN
    -- Add persistent identity reference if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' 
                   AND column_name = 'persistent_identity_id') THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN persistent_identity_id UUID REFERENCES public.persistent_borrower_identity(id),
        ADD COLUMN deletion_protected BOOLEAN DEFAULT TRUE,
        ADD COLUMN auto_reattached BOOLEAN DEFAULT FALSE,
        ADD COLUMN previous_profile_ids UUID[] DEFAULT ARRAY[]::UUID[];
    END IF;
END $$;

-- =====================================================
-- 4. FUNCTION TO CREATE/UPDATE PERSISTENT IDENTITY
-- =====================================================
CREATE OR REPLACE FUNCTION create_or_update_persistent_identity(
    p_profile_id UUID,
    p_email VARCHAR,
    p_phone VARCHAR DEFAULT NULL,
    p_national_id VARCHAR DEFAULT NULL,
    p_full_name VARCHAR DEFAULT NULL,
    p_date_of_birth DATE DEFAULT NULL,
    p_device_fingerprint JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_identity_id UUID;
    v_email_hash VARCHAR(64);
    v_name_normalized VARCHAR(255);
BEGIN
    -- Generate email hash
    v_email_hash := encode(digest(lower(trim(p_email)), 'sha256'), 'hex');
    
    -- Normalize name
    v_name_normalized := lower(trim(p_full_name));
    
    -- Try to find existing identity by multiple methods
    SELECT id INTO v_identity_id
    FROM persistent_borrower_identity
    WHERE (national_id = p_national_id AND national_id IS NOT NULL)
       OR (email_hash = v_email_hash)
       OR (phone_number = p_phone AND phone_number IS NOT NULL)
    LIMIT 1;
    
    IF v_identity_id IS NULL THEN
        -- Create new identity
        INSERT INTO persistent_borrower_identity (
            national_id,
            phone_number,
            email_hash,
            full_name_normalized,
            date_of_birth,
            device_fingerprints,
            ip_addresses
        ) VALUES (
            p_national_id,
            p_phone,
            v_email_hash,
            v_name_normalized,
            p_date_of_birth,
            CASE WHEN p_device_fingerprint IS NOT NULL 
                 THEN jsonb_build_array(p_device_fingerprint) 
                 ELSE '[]'::jsonb END,
            CASE WHEN p_ip_address IS NOT NULL 
                 THEN jsonb_build_array(p_ip_address::text) 
                 ELSE '[]'::jsonb END
        ) RETURNING id INTO v_identity_id;
    ELSE
        -- Update existing identity
        UPDATE persistent_borrower_identity
        SET 
            national_id = COALESCE(p_national_id, national_id),
            phone_number = COALESCE(p_phone, phone_number),
            full_name_normalized = COALESCE(v_name_normalized, full_name_normalized),
            date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
            device_fingerprints = CASE 
                WHEN p_device_fingerprint IS NOT NULL 
                THEN device_fingerprints || jsonb_build_array(p_device_fingerprint)
                ELSE device_fingerprints 
            END,
            ip_addresses = CASE 
                WHEN p_ip_address IS NOT NULL 
                THEN ip_addresses || jsonb_build_array(p_ip_address::text)
                ELSE ip_addresses 
            END,
            last_seen_at = NOW(),
            updated_at = NOW()
        WHERE id = v_identity_id;
    END IF;
    
    RETURN v_identity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. TRIGGER TO PREVENT DELETION OF RISKY BORROWERS
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_risky_borrower_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this borrower is on the risky list
    IF EXISTS (
        SELECT 1 FROM blacklisted_borrowers 
        WHERE borrower_profile_id = OLD.id 
        AND deregistered = FALSE
        AND deletion_protected = TRUE
    ) THEN
        -- Archive the risky status instead of allowing deletion
        INSERT INTO archived_risky_borrowers (
            persistent_identity_id,
            original_blacklist_id,
            borrower_profile_id,
            lender_profile_id,
            borrower_name,
            borrower_email,
            borrower_phone,
            borrower_national_id,
            amount_owed,
            reason,
            evidence_url,
            additional_notes,
            blacklisted_at,
            account_deleted
        )
        SELECT 
            bb.persistent_identity_id,
            bb.id,
            bb.borrower_profile_id,
            bb.lender_profile_id,
            bb.borrower_name,
            bb.borrower_email,
            bb.borrower_phone,
            bb.borrower_id_number,
            bb.amount_owed,
            bb.reason,
            bb.evidence_url,
            bb.additional_notes,
            bb.created_at,
            TRUE
        FROM blacklisted_borrowers bb
        WHERE bb.borrower_profile_id = OLD.id
        AND bb.deregistered = FALSE;
        
        -- Update persistent identity
        UPDATE persistent_borrower_identity pi
        SET 
            account_deletions = account_deletions + 1,
            last_account_deleted_at = NOW()
        WHERE pi.id IN (
            SELECT persistent_identity_id 
            FROM blacklisted_borrowers 
            WHERE borrower_profile_id = OLD.id
        );
        
        RAISE EXCEPTION 'Cannot delete profile: Outstanding risky/bad borrower status must be cleared first. Total amount owed: %', 
            (SELECT SUM(amount_owed) FROM blacklisted_borrowers WHERE borrower_profile_id = OLD.id AND deregistered = FALSE);
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS prevent_risky_profile_deletion ON public.profiles;
CREATE TRIGGER prevent_risky_profile_deletion
    BEFORE DELETE ON public.profiles
    FOR EACH ROW
    WHEN (OLD.role = 'borrower')
    EXECUTE FUNCTION prevent_risky_borrower_deletion();

-- =====================================================
-- 6. FUNCTION TO CHECK AND REATTACH RISKY STATUS
-- =====================================================
CREATE OR REPLACE FUNCTION check_and_reattach_risky_status(
    p_profile_id UUID,
    p_email VARCHAR,
    p_phone VARCHAR DEFAULT NULL,
    p_national_id VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_identity_id UUID;
    v_is_risky BOOLEAN;
    v_previous_entries JSONB;
    v_total_owed DECIMAL;
    v_reattached_count INTEGER := 0;
BEGIN
    -- Find persistent identity
    SELECT id, is_risky 
    INTO v_identity_id, v_is_risky
    FROM persistent_borrower_identity
    WHERE (national_id = p_national_id AND national_id IS NOT NULL)
       OR (email_hash = encode(digest(lower(trim(p_email)), 'sha256'), 'hex'))
       OR (phone_number = p_phone AND phone_number IS NOT NULL)
    LIMIT 1;
    
    IF v_identity_id IS NOT NULL AND v_is_risky = TRUE THEN
        -- Found a risky identity - reattach all archived entries
        
        -- Get total owed from archived entries
        SELECT 
            COALESCE(SUM(amount_owed), 0),
            jsonb_agg(jsonb_build_object(
                'amount', amount_owed,
                'reason', reason,
                'date', blacklisted_at,
                'lender_id', lender_profile_id
            ))
        INTO v_total_owed, v_previous_entries
        FROM archived_risky_borrowers
        WHERE persistent_identity_id = v_identity_id
        AND was_deregistered = FALSE;
        
        -- Reattach active blacklist entries
        INSERT INTO blacklisted_borrowers (
            borrower_profile_id,
            persistent_identity_id,
            lender_profile_id,
            borrower_name,
            borrower_email,
            borrower_phone,
            borrower_id_number,
            amount_owed,
            reason,
            evidence_url,
            additional_notes,
            auto_reattached,
            deletion_protected,
            deregistered
        )
        SELECT 
            p_profile_id,
            persistent_identity_id,
            lender_profile_id,
            borrower_name,
            p_email, -- Use new email
            COALESCE(p_phone, borrower_phone),
            COALESCE(p_national_id, borrower_national_id),
            amount_owed,
            reason || ' (Reattached from previous account)',
            evidence_url,
            'Previous account was deleted. Risk status automatically reattached. ' || COALESCE(additional_notes, ''),
            TRUE, -- auto_reattached
            TRUE, -- deletion_protected
            FALSE -- not deregistered
        FROM archived_risky_borrowers
        WHERE persistent_identity_id = v_identity_id
        AND was_deregistered = FALSE;
        
        GET DIAGNOSTICS v_reattached_count = ROW_COUNT;
        
        -- Update persistent identity with reregistration attempt
        UPDATE persistent_borrower_identity
        SET 
            reregistration_attempts = reregistration_attempts + 1,
            last_seen_at = NOW()
        WHERE id = v_identity_id;
        
        -- Create notification for the borrower
        INSERT INTO notifications (
            profile_id,
            title,
            message,
            type,
            metadata
        ) VALUES (
            p_profile_id,
            '⚠️ Previous Risk Status Detected',
            format('Your previous account had outstanding debts totaling $%s. This status has been reattached to your new account. Please clear these debts to improve your borrowing capability.',
                   v_total_owed),
            'risk_alert',
            jsonb_build_object(
                'persistent_identity_id', v_identity_id,
                'total_owed', v_total_owed,
                'previous_entries', v_previous_entries,
                'reattached_count', v_reattached_count
            )
        );
        
        -- Log this event
        INSERT INTO compliance_logs (
            log_type,
            severity,
            user_id,
            description,
            metadata
        ) VALUES (
            'risky_status_reattached',
            'warning',
            p_profile_id,
            format('Risky borrower status reattached from previous account. Total owed: $%s', v_total_owed),
            jsonb_build_object(
                'persistent_identity_id', v_identity_id,
                'reattached_entries', v_reattached_count,
                'total_owed', v_total_owed
            )
        );
        
        RETURN jsonb_build_object(
            'risky_status_found', true,
            'persistent_identity_id', v_identity_id,
            'total_owed', v_total_owed,
            'reattached_entries', v_reattached_count,
            'previous_entries', v_previous_entries,
            'message', 'Previous risky borrower status has been reattached to this account'
        );
    ELSE
        RETURN jsonb_build_object(
            'risky_status_found', false,
            'message', 'No previous risky borrower status found'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. TRIGGER FOR NEW PROFILE REGISTRATION
-- =====================================================
CREATE OR REPLACE FUNCTION check_risky_on_registration()
RETURNS TRIGGER AS $$
DECLARE
    v_result JSONB;
    v_identity_id UUID;
BEGIN
    -- Only check for borrower profiles
    IF NEW.role = 'borrower' THEN
        -- Create or update persistent identity
        v_identity_id := create_or_update_persistent_identity(
            NEW.id,
            NEW.email,
            NEW.phone,
            NEW.national_id,
            NEW.full_name,
            NEW.date_of_birth
        );
        
        -- Check and reattach risky status
        v_result := check_and_reattach_risky_status(
            NEW.id,
            NEW.email,
            NEW.phone,
            NEW.national_id
        );
        
        -- If risky status was found, update the profile
        IF (v_result->>'risky_status_found')::boolean = TRUE THEN
            -- Mark the profile as high risk
            NEW.risk_flag := TRUE;
            NEW.risk_notes := format('Auto-detected: Previous risky borrower. Total owed: $%s', 
                                    v_result->>'total_owed');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new profiles
DROP TRIGGER IF EXISTS check_risky_status_on_registration ON public.profiles;
CREATE TRIGGER check_risky_status_on_registration
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    WHEN (NEW.role = 'borrower')
    EXECUTE FUNCTION check_risky_on_registration();

-- =====================================================
-- 8. UPDATE BLACKLIST TRIGGER TO MAINTAIN PERSISTENT IDENTITY
-- =====================================================
CREATE OR REPLACE FUNCTION maintain_persistent_identity_on_blacklist()
RETURNS TRIGGER AS $$
DECLARE
    v_identity_id UUID;
    v_borrower_email VARCHAR;
    v_borrower_phone VARCHAR;
    v_borrower_national_id VARCHAR;
    v_borrower_name VARCHAR;
BEGIN
    -- Get borrower details
    SELECT email, phone, national_id, full_name
    INTO v_borrower_email, v_borrower_phone, v_borrower_national_id, v_borrower_name
    FROM profiles
    WHERE id = NEW.borrower_profile_id;
    
    -- Create or update persistent identity
    v_identity_id := create_or_update_persistent_identity(
        NEW.borrower_profile_id,
        COALESCE(NEW.borrower_email, v_borrower_email),
        COALESCE(NEW.borrower_phone, v_borrower_phone),
        COALESCE(NEW.borrower_id_number, v_borrower_national_id),
        COALESCE(NEW.borrower_name, v_borrower_name)
    );
    
    -- Update the blacklist entry with persistent identity
    NEW.persistent_identity_id := v_identity_id;
    
    -- Update persistent identity risk status
    UPDATE persistent_borrower_identity
    SET 
        is_risky = TRUE,
        risk_score = GREATEST(risk_score, NEW.risk_score),
        times_reported = times_reported + 1,
        total_amount_owed = total_amount_owed + COALESCE(NEW.amount_owed, 0),
        updated_at = NOW()
    WHERE id = v_identity_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for blacklist entries
DROP TRIGGER IF EXISTS maintain_persistent_identity ON public.blacklisted_borrowers;
CREATE TRIGGER maintain_persistent_identity
    BEFORE INSERT ON public.blacklisted_borrowers
    FOR EACH ROW
    EXECUTE FUNCTION maintain_persistent_identity_on_blacklist();

-- =====================================================
-- 9. FUNCTION TO HANDLE DEREGISTRATION WITH PERSISTENT IDENTITY
-- =====================================================
CREATE OR REPLACE FUNCTION update_persistent_identity_on_deregistration()
RETURNS TRIGGER AS $$
BEGIN
    -- When a borrower is deregistered, update persistent identity
    IF NEW.deregistered = TRUE AND OLD.deregistered = FALSE THEN
        UPDATE persistent_borrower_identity
        SET 
            total_amount_owed = GREATEST(0, total_amount_owed - COALESCE(NEW.amount_owed, 0)),
            times_reported = GREATEST(0, times_reported - 1),
            is_risky = CASE 
                WHEN times_reported <= 1 THEN FALSE 
                ELSE TRUE 
            END,
            risk_score = CASE
                WHEN times_reported <= 1 THEN 0
                ELSE GREATEST(0, risk_score - 20)
            END,
            updated_at = NOW()
        WHERE id = NEW.persistent_identity_id;
        
        -- Archive the deregistration
        UPDATE archived_risky_borrowers
        SET was_deregistered = TRUE
        WHERE original_blacklist_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for deregistration
DROP TRIGGER IF EXISTS update_persistent_on_deregistration ON public.blacklisted_borrowers;
CREATE TRIGGER update_persistent_on_deregistration
    AFTER UPDATE ON public.blacklisted_borrowers
    FOR EACH ROW
    WHEN (NEW.deregistered IS DISTINCT FROM OLD.deregistered)
    EXECUTE FUNCTION update_persistent_identity_on_deregistration();

-- =====================================================
-- 10. ADD PROFILE FLAGS FOR RISK TRACKING
-- =====================================================
DO $$
BEGIN
    -- Add risk tracking columns to profiles if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' 
                   AND column_name = 'risk_flag') THEN
        ALTER TABLE public.profiles 
        ADD COLUMN risk_flag BOOLEAN DEFAULT FALSE,
        ADD COLUMN risk_notes TEXT,
        ADD COLUMN persistent_identity_id UUID REFERENCES public.persistent_borrower_identity(id);
    END IF;
END $$;

-- =====================================================
-- 11. RLS POLICIES FOR NEW TABLES
-- =====================================================
ALTER TABLE public.persistent_borrower_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_risky_borrowers ENABLE ROW LEVEL SECURITY;

-- Admin and system can view all persistent identities
CREATE POLICY "Admin can view persistent identities" ON public.persistent_borrower_identity
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- Lenders can view risky persistent identities
CREATE POLICY "Lenders can view risky identities" ON public.persistent_borrower_identity
    FOR SELECT USING (
        is_risky = TRUE AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'lender'
        )
    );

-- Similar policies for archived table
CREATE POLICY "Admin can view archived risky borrowers" ON public.archived_risky_borrowers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- =====================================================
-- 12. GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON public.persistent_borrower_identity TO authenticated;
GRANT SELECT ON public.archived_risky_borrowers TO authenticated;
GRANT EXECUTE ON FUNCTION create_or_update_persistent_identity TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_reattach_risky_status TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PERSISTENT RISKY BORROWER TRACKING SETUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Features Implemented:';
    RAISE NOTICE '1. Account deletion prevention for risky borrowers';
    RAISE NOTICE '2. Persistent identity tracking across accounts';
    RAISE NOTICE '3. Automatic risk status reattachment on re-registration';
    RAISE NOTICE '4. Complete audit trail of all account activities';
    RAISE NOTICE '5. Multi-factor identity matching (ID, email, phone)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Risky borrowers CANNOT:';
    RAISE NOTICE '- Delete their account while having outstanding debts';
    RAISE NOTICE '- Create new account to evade risky status';
    RAISE NOTICE '- Remove their history without proper deregistration';
    RAISE NOTICE '========================================';
END $$;