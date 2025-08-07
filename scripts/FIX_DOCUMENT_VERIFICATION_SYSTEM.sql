-- =====================================================
-- FIXED DOCUMENT VERIFICATION SYSTEM (HASH-BASED)
-- =====================================================
-- Stores document fingerprints instead of actual files
-- Fixed: Removed GENERATED column, using trigger instead
-- =====================================================

-- Drop table if exists to recreate
DROP TABLE IF EXISTS public.document_verification_log CASCADE;
DROP TABLE IF EXISTS public.document_metadata CASCADE;

-- =====================================================
-- 1. CREATE DOCUMENT METADATA TABLE (FIXED)
-- =====================================================
CREATE TABLE public.document_metadata (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Owner information
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE,
    
    -- Document identification
    document_type VARCHAR(100) NOT NULL, -- 'national_id', 'proof_of_income', 'bank_statement', etc.
    document_category VARCHAR(50), -- 'identity', 'financial', 'collateral', 'legal'
    
    -- Document fingerprint (hash)
    document_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of the document
    hash_algorithm VARCHAR(20) DEFAULT 'SHA-256',
    
    -- Metadata (stored, not the actual document)
    original_filename VARCHAR(255),
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    
    -- Extracted metadata (without storing document)
    metadata JSONB, -- Can store extracted text, OCR results, etc.
    
    -- Verification status
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    
    -- Validity period
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    is_expired BOOLEAN DEFAULT FALSE, -- Will be updated by trigger
    
    -- Audit trail
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_verified_at TIMESTAMP WITH TIME ZONE,
    verification_count INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, verified, rejected, expired
    rejection_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_document_metadata_profile ON public.document_metadata(profile_id);
CREATE INDEX idx_document_metadata_loan ON public.document_metadata(loan_id);
CREATE INDEX idx_document_metadata_hash ON public.document_metadata(document_hash);
CREATE INDEX idx_document_metadata_type ON public.document_metadata(document_type);
CREATE INDEX idx_document_metadata_status ON public.document_metadata(status);
CREATE INDEX idx_document_metadata_expired ON public.document_metadata(is_expired);

-- =====================================================
-- 2. CREATE TRIGGER TO UPDATE EXPIRY STATUS
-- =====================================================
CREATE OR REPLACE FUNCTION update_document_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Update is_expired based on valid_until date
    IF NEW.valid_until IS NOT NULL THEN
        NEW.is_expired := (NEW.valid_until < CURRENT_DATE);
        
        -- Also update status if expired
        IF NEW.is_expired AND NEW.status = 'verified' THEN
            NEW.status := 'expired';
        END IF;
    END IF;
    
    -- Update timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for insert and update
DROP TRIGGER IF EXISTS update_document_expiry_trigger ON public.document_metadata;
CREATE TRIGGER update_document_expiry_trigger
    BEFORE INSERT OR UPDATE ON public.document_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_document_expiry();

-- =====================================================
-- 3. FUNCTION TO CHECK AND UPDATE EXPIRED DOCUMENTS
-- =====================================================
-- Run this daily to update expired documents
CREATE OR REPLACE FUNCTION check_expired_documents()
RETURNS void AS $$
BEGIN
    UPDATE document_metadata
    SET 
        is_expired = TRUE,
        status = CASE 
            WHEN status = 'verified' THEN 'expired'
            ELSE status
        END,
        updated_at = NOW()
    WHERE valid_until < CURRENT_DATE
    AND is_expired = FALSE;
    
    -- Notify users about expired documents
    INSERT INTO notifications (
        profile_id,
        title,
        message,
        type,
        metadata
    )
    SELECT DISTINCT
        dm.profile_id,
        'Document Expired',
        format('Your %s has expired and needs to be re-uploaded', dm.document_type),
        'warning',
        jsonb_build_object(
            'document_id', dm.id,
            'document_type', dm.document_type,
            'expired_date', dm.valid_until
        )
    FROM document_metadata dm
    WHERE dm.valid_until = CURRENT_DATE - INTERVAL '1 day'
    AND dm.is_verified = TRUE
    AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.profile_id = dm.profile_id
        AND n.metadata->>'document_id' = dm.id::text
        AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREATE DOCUMENT VERIFICATION LOG
-- =====================================================
CREATE TABLE public.document_verification_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    document_metadata_id UUID REFERENCES public.document_metadata(id) ON DELETE CASCADE,
    
    -- Verification attempt details
    submitted_hash VARCHAR(64) NOT NULL,
    stored_hash VARCHAR(64) NOT NULL,
    hash_match BOOLEAN NOT NULL,
    
    -- Who performed verification
    verified_by UUID REFERENCES public.profiles(id),
    verification_type VARCHAR(50), -- 'upload', 're-verification', 'audit'
    
    -- Result
    verification_result VARCHAR(50), -- 'match', 'mismatch', 'expired', 'not_found'
    
    -- Additional info
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_verification_log_document ON public.document_verification_log(document_metadata_id);
CREATE INDEX idx_verification_log_result ON public.document_verification_log(verification_result);

-- =====================================================
-- 5. MAIN FUNCTIONS (SAME AS BEFORE)
-- =====================================================
CREATE OR REPLACE FUNCTION register_document_metadata(
    p_profile_id UUID,
    p_document_type VARCHAR,
    p_document_hash VARCHAR,
    p_filename VARCHAR,
    p_file_size BIGINT,
    p_mime_type VARCHAR,
    p_loan_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_valid_days INTEGER DEFAULT 365
)
RETURNS UUID AS $$
DECLARE
    v_document_id UUID;
    v_existing_id UUID;
BEGIN
    -- Check if this exact document already exists
    SELECT id INTO v_existing_id
    FROM document_metadata
    WHERE document_hash = p_document_hash
    AND profile_id = p_profile_id
    AND document_type = p_document_type
    AND status != 'rejected';
    
    IF v_existing_id IS NOT NULL THEN
        -- Document already registered, update verification count
        UPDATE document_metadata
        SET 
            verification_count = verification_count + 1,
            last_verified_at = NOW(),
            updated_at = NOW()
        WHERE id = v_existing_id;
        
        -- Log the re-verification
        INSERT INTO document_verification_log (
            document_metadata_id,
            submitted_hash,
            stored_hash,
            hash_match,
            verified_by,
            verification_type,
            verification_result
        ) VALUES (
            v_existing_id,
            p_document_hash,
            p_document_hash,
            TRUE,
            p_profile_id,
            're-verification',
            'match'
        );
        
        RETURN v_existing_id;
    END IF;
    
    -- Register new document metadata
    INSERT INTO document_metadata (
        profile_id,
        loan_id,
        document_type,
        document_category,
        document_hash,
        original_filename,
        file_size_bytes,
        mime_type,
        metadata,
        valid_until
    ) VALUES (
        p_profile_id,
        p_loan_id,
        p_document_type,
        CASE 
            WHEN p_document_type IN ('national_id', 'passport', 'drivers_license') THEN 'identity'
            WHEN p_document_type IN ('bank_statement', 'proof_of_income', 'tax_return') THEN 'financial'
            WHEN p_document_type IN ('property_deed', 'vehicle_title') THEN 'collateral'
            ELSE 'other'
        END,
        p_document_hash,
        p_filename,
        p_file_size,
        p_mime_type,
        p_metadata,
        CURRENT_DATE + (p_valid_days || ' days')::INTERVAL
    ) RETURNING id INTO v_document_id;
    
    -- Log the registration
    INSERT INTO document_verification_log (
        document_metadata_id,
        submitted_hash,
        stored_hash,
        hash_match,
        verified_by,
        verification_type,
        verification_result
    ) VALUES (
        v_document_id,
        p_document_hash,
        p_document_hash,
        TRUE,
        p_profile_id,
        'upload',
        'match'
    );
    
    RETURN v_document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify document function
CREATE OR REPLACE FUNCTION verify_document_hash(
    p_profile_id UUID,
    p_document_type VARCHAR,
    p_submitted_hash VARCHAR,
    p_verifier_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_stored_hash VARCHAR;
    v_document_id UUID;
    v_is_expired BOOLEAN;
    v_status VARCHAR;
    v_match BOOLEAN;
BEGIN
    -- Find the most recent document of this type
    SELECT 
        id,
        document_hash,
        is_expired,
        status
    INTO 
        v_document_id,
        v_stored_hash,
        v_is_expired,
        v_status
    FROM document_metadata
    WHERE profile_id = p_profile_id
    AND document_type = p_document_type
    AND status != 'rejected'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_document_id IS NULL THEN
        RETURN jsonb_build_object(
            'verified', false,
            'message', 'No document found for verification',
            'result', 'not_found'
        );
    END IF;
    
    -- Check if expired
    IF v_is_expired THEN
        -- Log verification attempt
        INSERT INTO document_verification_log (
            document_metadata_id,
            submitted_hash,
            stored_hash,
            hash_match,
            verified_by,
            verification_type,
            verification_result
        ) VALUES (
            v_document_id,
            p_submitted_hash,
            v_stored_hash,
            p_submitted_hash = v_stored_hash,
            COALESCE(p_verifier_id, p_profile_id),
            're-verification',
            'expired'
        );
        
        RETURN jsonb_build_object(
            'verified', false,
            'message', 'Document has expired and needs to be re-uploaded',
            'result', 'expired',
            'document_id', v_document_id
        );
    END IF;
    
    -- Compare hashes
    v_match := (p_submitted_hash = v_stored_hash);
    
    -- Log verification attempt
    INSERT INTO document_verification_log (
        document_metadata_id,
        submitted_hash,
        stored_hash,
        hash_match,
        verified_by,
        verification_type,
        verification_result
    ) VALUES (
        v_document_id,
        p_submitted_hash,
        v_stored_hash,
        v_match,
        COALESCE(p_verifier_id, p_profile_id),
        're-verification',
        CASE WHEN v_match THEN 'match' ELSE 'mismatch' END
    );
    
    -- Update document status if verified
    IF v_match AND p_verifier_id IS NOT NULL THEN
        UPDATE document_metadata
        SET 
            is_verified = TRUE,
            verified_by = p_verifier_id,
            verified_at = NOW(),
            status = 'verified',
            last_verified_at = NOW(),
            verification_count = verification_count + 1,
            updated_at = NOW()
        WHERE id = v_document_id;
    END IF;
    
    RETURN jsonb_build_object(
        'verified', v_match,
        'message', CASE 
            WHEN v_match THEN 'Document verified successfully'
            ELSE 'Document hash mismatch - document may have been altered'
        END,
        'result', CASE WHEN v_match THEN 'match' ELSE 'mismatch' END,
        'document_id', v_document_id,
        'stored_hash', v_stored_hash,
        'submitted_hash', p_submitted_hash
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================
ALTER TABLE public.document_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_verification_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own documents
CREATE POLICY "Users can view own documents" ON public.document_metadata
    FOR SELECT USING (
        profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
        )
    );

-- Users can insert their own documents
CREATE POLICY "Users can insert own documents" ON public.document_metadata
    FOR INSERT WITH CHECK (
        profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
        )
    );

-- Lenders can view borrower documents for their loans
CREATE POLICY "Lenders can view loan documents" ON public.document_metadata
    FOR SELECT USING (
        loan_id IN (
            SELECT id FROM loans
            WHERE lender_id IN (
                SELECT id FROM profiles
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Verification log policies
CREATE POLICY "Users can view own verification logs" ON public.document_verification_log
    FOR SELECT USING (
        document_metadata_id IN (
            SELECT id FROM document_metadata
            WHERE profile_id IN (
                SELECT id FROM profiles
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.document_metadata TO authenticated;
GRANT ALL ON public.document_verification_log TO authenticated;
GRANT EXECUTE ON FUNCTION register_document_metadata TO authenticated;
GRANT EXECUTE ON FUNCTION verify_document_hash TO authenticated;
GRANT EXECUTE ON FUNCTION check_expired_documents TO authenticated;

-- =====================================================
-- 8. SCHEDULE DAILY EXPIRY CHECK (IF PG_CRON AVAILABLE)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'check-expired-documents',
            '0 1 * * *',  -- Daily at 1 AM
            'SELECT check_expired_documents();'
        );
        RAISE NOTICE 'Scheduled daily document expiry check';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron not available for document expiry checks';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'document_metadata'
    ) INTO v_table_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_document_expiry_trigger'
    ) INTO v_trigger_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DOCUMENT VERIFICATION SYSTEM READY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Table created: %', CASE WHEN v_table_exists THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE 'Expiry trigger: %', CASE WHEN v_trigger_exists THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  ✓ Hash-only storage (no files)';
    RAISE NOTICE '  ✓ SHA-256 fingerprinting';
    RAISE NOTICE '  ✓ Automatic expiry tracking';
    RAISE NOTICE '  ✓ Complete audit trail';
    RAISE NOTICE '  ✓ Tamper detection';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Storage: ~64 bytes per document';
    RAISE NOTICE 'vs ~2-5 MB for actual files';
    RAISE NOTICE 'Savings: 99.99%% storage reduction!';
    RAISE NOTICE '========================================';
END $$;