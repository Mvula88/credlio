-- =====================================================
-- IDENTITY CHECK FUNCTIONS FOR API
-- =====================================================
-- Helper functions for the identity checking API
-- =====================================================

-- Function to check persistent identity by multiple factors
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
       OR (phone_number = p_phone AND p_phone IS NOT NULL)
       OR (national_id = p_national_id AND p_national_id IS NOT NULL)
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

-- Function to update device fingerprint
CREATE OR REPLACE FUNCTION update_device_fingerprint(
    p_profile_id UUID,
    p_device_fingerprint JSONB,
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
    
    IF v_identity_id IS NOT NULL THEN
        -- Update device fingerprints (keep last 10)
        UPDATE persistent_borrower_identity
        SET 
            device_fingerprints = (
                SELECT jsonb_agg(fingerprint)
                FROM (
                    SELECT fingerprint
                    FROM (
                        SELECT jsonb_array_elements(device_fingerprints) as fingerprint
                        UNION ALL
                        SELECT p_device_fingerprint
                    ) t
                    ORDER BY fingerprint->>'timestamp' DESC
                    LIMIT 10
                ) recent
            ),
            ip_addresses = (
                SELECT jsonb_agg(DISTINCT ip)
                FROM (
                    SELECT jsonb_array_elements_text(ip_addresses) as ip
                    UNION
                    SELECT p_ip_address
                ) ips
                LIMIT 20
            ),
            last_seen_at = NOW()
        WHERE id = v_identity_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get risky borrower details for display
CREATE OR REPLACE FUNCTION get_risky_borrower_details(
    p_borrower_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'is_risky', COUNT(*) > 0,
        'total_entries', COUNT(*),
        'total_owed', COALESCE(SUM(amount_owed), 0),
        'reporting_lenders', COUNT(DISTINCT lender_profile_id),
        'entries', jsonb_agg(
            jsonb_build_object(
                'id', id,
                'amount_owed', amount_owed,
                'reason', reason,
                'lender_id', lender_profile_id,
                'created_at', created_at,
                'auto_generated', auto_generated,
                'auto_reattached', auto_reattached
            )
        )
    ) INTO v_result
    FROM blacklisted_borrowers
    WHERE borrower_profile_id = p_borrower_id
    AND deregistered = FALSE;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_persistent_identity TO authenticated;
GRANT EXECUTE ON FUNCTION update_device_fingerprint TO authenticated;
GRANT EXECUTE ON FUNCTION get_risky_borrower_details TO authenticated;