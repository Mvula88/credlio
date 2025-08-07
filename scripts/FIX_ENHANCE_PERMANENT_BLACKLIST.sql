-- =====================================================
-- FIX ENHANCED PERMANENT BLACKLIST SYSTEM
-- =====================================================
-- Fixed version with proper parameter ordering
-- =====================================================

-- =====================================================
-- 1. UPDATE BLACKLISTED_BORROWERS TABLE
-- =====================================================
-- Add fields for external debts and permanent tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' 
                   AND column_name = 'external_debt') THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN external_debt BOOLEAN DEFAULT FALSE,
        ADD COLUMN platform_user BOOLEAN DEFAULT FALSE,
        ADD COLUMN permanent_entry BOOLEAN DEFAULT TRUE,
        ADD COLUMN notification_sent_on_registration BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add comments to clarify the purpose
COMMENT ON COLUMN public.blacklisted_borrowers.external_debt IS 'TRUE if this debt was incurred outside the platform';
COMMENT ON COLUMN public.blacklisted_borrowers.platform_user IS 'TRUE if borrower has/had an account on platform';
COMMENT ON COLUMN public.blacklisted_borrowers.permanent_entry IS 'Entry cannot be deleted, only deregistered';

-- =====================================================
-- 2. REMOVE ANY DELETE PERMISSIONS
-- =====================================================
-- Revoke all delete permissions on blacklisted_borrowers
REVOKE DELETE ON public.blacklisted_borrowers FROM PUBLIC;
REVOKE DELETE ON public.blacklisted_borrowers FROM authenticated;
REVOKE DELETE ON public.blacklisted_borrowers FROM anon;

-- =====================================================
-- 3. CREATE TRIGGER TO PREVENT DELETION
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_blacklist_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- NEVER allow deletion of blacklist entries
    RAISE EXCEPTION 'Blacklist entries cannot be deleted. They can only be deregistered by the lender who reported them or an admin. Total owed: $%', 
        COALESCE(OLD.amount_owed, 0);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS no_delete_blacklist ON public.blacklisted_borrowers;

-- Create trigger to prevent ALL deletions
CREATE TRIGGER no_delete_blacklist
    BEFORE DELETE ON public.blacklisted_borrowers
    FOR EACH ROW
    EXECUTE FUNCTION prevent_blacklist_deletion();

-- =====================================================
-- 4. FUNCTION TO CHECK IF NEWLY REGISTERED USER IS BLACKLISTED
-- =====================================================
CREATE OR REPLACE FUNCTION check_new_user_blacklist_status()
RETURNS TRIGGER AS $$
DECLARE
    v_blacklist_entries JSONB;
    v_total_owed DECIMAL;
    v_reporting_lenders INTEGER;
    v_external_debts INTEGER;
BEGIN
    -- Only check for borrower profiles
    IF NEW.role = 'borrower' THEN
        -- Check if this borrower is already on the blacklist
        -- Match by email, phone, or national ID
        SELECT 
            jsonb_agg(jsonb_build_object(
                'id', bb.id,
                'lender_id', bb.lender_profile_id,
                'amount_owed', bb.amount_owed,
                'reason', bb.reason,
                'external_debt', COALESCE(bb.external_debt, FALSE),
                'created_at', bb.created_at
            )),
            COALESCE(SUM(bb.amount_owed), 0),
            COUNT(DISTINCT bb.lender_profile_id),
            COUNT(*) FILTER (WHERE COALESCE(bb.external_debt, FALSE) = TRUE)
        INTO v_blacklist_entries, v_total_owed, v_reporting_lenders, v_external_debts
        FROM blacklisted_borrowers bb
        WHERE COALESCE(bb.deregistered, FALSE) = FALSE
        AND (
            bb.borrower_email = NEW.email
            OR bb.borrower_phone = NEW.phone
            OR bb.borrower_id_number = NEW.national_id
            OR (bb.borrower_name ILIKE NEW.full_name AND NEW.full_name IS NOT NULL)
        );
        
        IF v_blacklist_entries IS NOT NULL AND jsonb_array_length(v_blacklist_entries) > 0 THEN
            -- Update blacklist entries to link with this profile
            UPDATE blacklisted_borrowers
            SET 
                borrower_profile_id = NEW.id,
                platform_user = TRUE,
                notification_sent_on_registration = FALSE,
                updated_at = NOW()
            WHERE COALESCE(deregistered, FALSE) = FALSE
            AND (
                borrower_email = NEW.email
                OR borrower_phone = NEW.phone
                OR borrower_id_number = NEW.national_id
                OR (borrower_name ILIKE NEW.full_name AND NEW.full_name IS NOT NULL)
            );
            
            -- Create notification for the borrower (if notifications table exists)
            IF EXISTS (SELECT 1 FROM information_schema.tables 
                      WHERE table_schema = 'public' AND table_name = 'notifications') THEN
                INSERT INTO notifications (
                    profile_id,
                    title,
                    message,
                    type,
                    metadata,
                    created_at
                ) VALUES (
                    NEW.id,
                    '⚠️ IMPORTANT: You are listed as a Risky/Bad Borrower',
                    format('You have been reported by %s lender(s) with total outstanding debts of $%s. %s of these debts are from outside this platform. You must contact the lender(s) who reported you to clear your debts and request deregistration.',
                        v_reporting_lenders,
                        v_total_owed,
                        CASE WHEN v_external_debts > 0 THEN v_external_debts::text ELSE 'None' END
                    ),
                    'critical_alert',
                    jsonb_build_object(
                        'blacklist_entries', v_blacklist_entries,
                        'total_owed', v_total_owed,
                        'reporting_lenders', v_reporting_lenders,
                        'external_debts', v_external_debts,
                        'action_required', 'contact_lenders_for_deregistration'
                    ),
                    NOW()
                );
            END IF;
            
            -- Mark notifications as sent
            UPDATE blacklisted_borrowers
            SET notification_sent_on_registration = TRUE
            WHERE borrower_profile_id = NEW.id;
            
            -- Log this event (if compliance_logs table exists)
            IF EXISTS (SELECT 1 FROM information_schema.tables 
                      WHERE table_schema = 'public' AND table_name = 'compliance_logs') THEN
                INSERT INTO compliance_logs (
                    log_type,
                    severity,
                    user_id,
                    description,
                    metadata
                ) VALUES (
                    'blacklisted_user_registered',
                    'critical',
                    NEW.id,
                    format('Pre-blacklisted borrower registered. Total owed: $%s from %s lender(s)',
                        v_total_owed,
                        v_reporting_lenders
                    ),
                    jsonb_build_object(
                        'profile_id', NEW.id,
                        'email', NEW.email,
                        'total_owed', v_total_owed,
                        'reporting_lenders', v_reporting_lenders,
                        'external_debts', v_external_debts
                    )
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS check_blacklist_on_user_registration ON public.profiles;
CREATE TRIGGER check_blacklist_on_user_registration
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION check_new_user_blacklist_status();

-- =====================================================
-- 5. FUNCTION TO ADD EXTERNAL BORROWER TO BLACKLIST (FIXED)
-- =====================================================
-- Drop existing function first
DROP FUNCTION IF EXISTS add_external_borrower_to_blacklist CASCADE;

CREATE FUNCTION add_external_borrower_to_blacklist(
    p_lender_id UUID,
    p_borrower_name VARCHAR,
    p_amount_owed DECIMAL,
    p_reason VARCHAR,
    p_borrower_email VARCHAR DEFAULT NULL,
    p_borrower_phone VARCHAR DEFAULT NULL,
    p_borrower_id_number VARCHAR DEFAULT NULL,
    p_loan_date DATE DEFAULT NULL,
    p_due_date DATE DEFAULT NULL,
    p_evidence_url TEXT DEFAULT NULL,
    p_additional_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_blacklist_id UUID;
    v_existing_profile_id UUID;
BEGIN
    -- Check if borrower already has a profile
    IF p_borrower_email IS NOT NULL OR p_borrower_phone IS NOT NULL OR p_borrower_id_number IS NOT NULL THEN
        SELECT id INTO v_existing_profile_id
        FROM profiles
        WHERE role = 'borrower'
        AND (
            (email = p_borrower_email AND p_borrower_email IS NOT NULL)
            OR (phone = p_borrower_phone AND p_borrower_phone IS NOT NULL)
            OR (national_id = p_borrower_id_number AND p_borrower_id_number IS NOT NULL)
        )
        LIMIT 1;
    END IF;
    
    -- Insert blacklist entry
    INSERT INTO blacklisted_borrowers (
        borrower_profile_id,
        lender_profile_id,
        borrower_name,
        borrower_email,
        borrower_phone,
        borrower_id_number,
        amount_owed,
        reason,
        loan_date,
        due_date,
        evidence_url,
        additional_notes,
        external_debt,
        platform_user,
        permanent_entry,
        deregistered,
        auto_generated
    ) VALUES (
        v_existing_profile_id, -- May be NULL if borrower not on platform
        p_lender_id,
        p_borrower_name,
        p_borrower_email,
        p_borrower_phone,
        p_borrower_id_number,
        p_amount_owed,
        p_reason,
        p_loan_date,
        p_due_date,
        p_evidence_url,
        COALESCE(p_additional_notes, '') || ' [External debt - borrower not on platform when reported]',
        TRUE, -- external_debt
        v_existing_profile_id IS NOT NULL, -- platform_user
        TRUE, -- permanent_entry
        FALSE, -- not deregistered
        FALSE -- not auto_generated
    ) RETURNING id INTO v_blacklist_id;
    
    -- If borrower has a profile, notify them
    IF v_existing_profile_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'notifications'
    ) THEN
        INSERT INTO notifications (
            profile_id,
            title,
            message,
            type,
            metadata
        ) VALUES (
            v_existing_profile_id,
            '⚠️ You have been reported as a Risky/Bad Borrower',
            format('A lender has reported you for an outstanding debt of $%s. Reason: %s. This is an external debt from outside the platform. Contact the lender to resolve this.',
                p_amount_owed,
                p_reason
            ),
            'critical_alert',
            jsonb_build_object(
                'blacklist_id', v_blacklist_id,
                'lender_id', p_lender_id,
                'amount_owed', p_amount_owed,
                'external_debt', true
            )
        );
    END IF;
    
    RETURN v_blacklist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. VIEW FOR BORROWER RISK STATUS DISPLAY
-- =====================================================
CREATE OR REPLACE VIEW public.borrower_risk_status AS
SELECT 
    p.id as profile_id,
    p.full_name,
    p.email,
    COUNT(DISTINCT bb.id) as total_reports,
    COUNT(DISTINCT bb.lender_profile_id) as reporting_lenders,
    COALESCE(SUM(bb.amount_owed), 0) as total_owed,
    COUNT(*) FILTER (WHERE COALESCE(bb.external_debt, FALSE) = TRUE) as external_debts,
    COUNT(*) FILTER (WHERE COALESCE(bb.platform_user, TRUE) = FALSE) as pre_platform_debts,
    CASE 
        WHEN COUNT(*) FILTER (WHERE COALESCE(bb.external_debt, FALSE) = TRUE) > 0 
        THEN 'Has external debts from outside platform'
        WHEN COUNT(*) > 2 
        THEN 'High risk - reported by multiple lenders'
        WHEN COUNT(*) > 0 
        THEN 'Risky - has outstanding debts'
        ELSE 'Clear'
    END as risk_status,
    CASE 
        WHEN COUNT(*) FILTER (WHERE COALESCE(bb.external_debt, FALSE) = TRUE) > 0 
        THEN '⚠️ BORROWER OWES MONEY TO LENDER(S) OUTSIDE THE PLATFORM'
        ELSE NULL
    END as external_debt_warning
FROM profiles p
LEFT JOIN blacklisted_borrowers bb ON 
    bb.borrower_profile_id = p.id 
    AND COALESCE(bb.deregistered, FALSE) = FALSE
WHERE p.role = 'borrower'
GROUP BY p.id, p.full_name, p.email;

-- Grant access to the view
GRANT SELECT ON public.borrower_risk_status TO authenticated;

-- =====================================================
-- 7. RLS POLICIES UPDATE
-- =====================================================
ALTER TABLE public.blacklisted_borrowers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No one can delete blacklist entries" ON public.blacklisted_borrowers;

-- Create policy to prevent deletion
CREATE POLICY "No one can delete blacklist entries" ON public.blacklisted_borrowers
    FOR DELETE USING (FALSE);

-- Ensure select policies exist
DROP POLICY IF EXISTS "Lenders can view all blacklist entries" ON public.blacklisted_borrowers;
CREATE POLICY "Lenders can view all blacklist entries" ON public.blacklisted_borrowers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('lender', 'admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Borrowers can view their own entries" ON public.blacklisted_borrowers;
CREATE POLICY "Borrowers can view their own entries" ON public.blacklisted_borrowers
    FOR SELECT USING (
        borrower_profile_id IN (
            SELECT id FROM profiles
            WHERE auth_user_id = auth.uid()
        )
    );

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================
GRANT SELECT, INSERT, UPDATE ON public.blacklisted_borrowers TO authenticated;
-- Explicitly REVOKE DELETE
REVOKE DELETE ON public.blacklisted_borrowers FROM authenticated;

GRANT EXECUTE ON FUNCTION add_external_borrower_to_blacklist TO authenticated;
GRANT SELECT ON public.borrower_risk_status TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
    v_delete_prevented BOOLEAN;
    v_external_debt_col BOOLEAN;
    v_function_exists BOOLEAN;
BEGIN
    -- Check if delete is prevented
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'no_delete_blacklist'
    ) INTO v_delete_prevented;
    
    -- Check if external_debt column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'blacklisted_borrowers' 
        AND column_name = 'external_debt'
    ) INTO v_external_debt_col;
    
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'add_external_borrower_to_blacklist'
    ) INTO v_function_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PERMANENT BLACKLIST ENHANCEMENT STATUS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Delete prevention trigger: %', CASE WHEN v_delete_prevented THEN 'ACTIVE ✓' ELSE 'NOT FOUND ✗' END;
    RAISE NOTICE 'External debt tracking: %', CASE WHEN v_external_debt_col THEN 'ENABLED ✓' ELSE 'NOT FOUND ✗' END;
    RAISE NOTICE 'External borrower function: %', CASE WHEN v_function_exists THEN 'CREATED ✓' ELSE 'NOT FOUND ✗' END;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Protection Features:';
    RAISE NOTICE '  ✓ Blacklist entries CANNOT be deleted';
    RAISE NOTICE '  ✓ External borrowers can be listed';
    RAISE NOTICE '  ✓ Pre-registered borrowers get notified';
    RAISE NOTICE '  ✓ Only lender/admin can deregister';
    RAISE NOTICE '========================================';
END $$;