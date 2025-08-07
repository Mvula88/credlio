-- =====================================================
-- UPDATE AUTO-BLACKLIST TIMING TO 7 DAYS
-- =====================================================
-- Changes automatic blacklisting from 30 days to 7 days
-- to prevent borrowers from defrauding more lenders
-- =====================================================

-- =====================================================
-- 1. UPDATE AUTO-DETECTION FUNCTION FOR 7-DAY TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION auto_detect_risky_borrower()
RETURNS TRIGGER AS $$
DECLARE
    v_borrower_id UUID;
    v_risk_score INTEGER;
    v_recent_defaults INTEGER;
    v_overdue_payments INTEGER;
    v_should_blacklist BOOLEAN := FALSE;
    v_blacklist_reason TEXT;
BEGIN
    -- Get borrower ID based on trigger context
    IF TG_TABLE_NAME = 'loans' THEN
        v_borrower_id := NEW.borrower_id;
    ELSIF TG_TABLE_NAME = 'loan_repayments' OR TG_TABLE_NAME = 'loan_payments' THEN
        SELECT borrower_id INTO v_borrower_id
        FROM loans
        WHERE id = NEW.loan_id;
    ELSE
        RETURN NEW;
    END IF;
    
    -- Calculate risk metrics
    -- Count recent defaults (last 3 months instead of 6 for faster detection)
    SELECT COUNT(*) INTO v_recent_defaults
    FROM loans
    WHERE borrower_id = v_borrower_id
    AND status = 'defaulted'
    AND created_at >= CURRENT_DATE - INTERVAL '3 months';
    
    -- Count overdue payments (7 days instead of 30)
    SELECT COUNT(*) INTO v_overdue_payments
    FROM loan_repayments lr
    JOIN loans l ON l.id = lr.loan_id
    WHERE l.borrower_id = v_borrower_id
    AND lr.status IN ('pending', 'overdue', 'pending_confirmation')
    AND lr.due_date < CURRENT_DATE - INTERVAL '7 days';  -- CHANGED FROM 30 TO 7 DAYS
    
    -- Calculate risk score
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE (
                (COUNT(*) FILTER (WHERE status = 'defaulted') * 30) +
                (COUNT(*) FILTER (WHERE status = 'overdue') * 20) +
                (COUNT(*) FILTER (WHERE CURRENT_DATE > due_date + INTERVAL '7 days') * 25)  -- CHANGED
            )
        END INTO v_risk_score
    FROM loans
    WHERE borrower_id = v_borrower_id;
    
    -- Determine if should blacklist (more aggressive criteria)
    IF v_overdue_payments >= 1 THEN  -- CHANGED FROM 3 TO 1 - even 1 payment 7 days overdue triggers
        v_should_blacklist := TRUE;
        v_blacklist_reason := format('Automatic: %s payment(s) overdue by 7+ days', v_overdue_payments);
    ELSIF v_recent_defaults >= 1 THEN  -- CHANGED FROM 2 TO 1 - even 1 default triggers
        v_should_blacklist := TRUE;
        v_blacklist_reason := format('Automatic: %s recent default(s) in last 3 months', v_recent_defaults);
    ELSIF v_risk_score >= 50 THEN  -- LOWERED FROM 70 TO 50 for earlier detection
        v_should_blacklist := TRUE;
        v_blacklist_reason := format('Automatic: High risk score (%s)', v_risk_score);
    END IF;
    
    -- Add to blacklist if criteria met
    IF v_should_blacklist THEN
        -- Check if not already blacklisted
        IF NOT EXISTS (
            SELECT 1 FROM blacklisted_borrowers
            WHERE borrower_profile_id = v_borrower_id
            AND deregistered = FALSE
            AND auto_generated = TRUE
            AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        ) THEN
            -- Get borrower details
            DECLARE
                v_borrower_name VARCHAR;
                v_borrower_email VARCHAR;
                v_borrower_phone VARCHAR;
                v_total_owed DECIMAL;
            BEGIN
                SELECT 
                    p.full_name,
                    p.email,
                    p.phone,
                    COALESCE(SUM(l.amount - COALESCE(l.amount_paid, 0)), 0)
                INTO 
                    v_borrower_name,
                    v_borrower_email,
                    v_borrower_phone,
                    v_total_owed
                FROM profiles p
                LEFT JOIN loans l ON l.borrower_id = p.id
                WHERE p.id = v_borrower_id
                AND l.status IN ('active', 'overdue', 'defaulted')
                GROUP BY p.full_name, p.email, p.phone;
                
                -- Add to blacklist
                INSERT INTO blacklisted_borrowers (
                    borrower_profile_id,
                    borrower_name,
                    borrower_email,
                    borrower_phone,
                    amount_owed,
                    reason,
                    auto_generated,
                    risk_score,
                    detection_reason,
                    additional_notes,
                    deregistered,
                    permanent_entry
                ) VALUES (
                    v_borrower_id,
                    v_borrower_name,
                    v_borrower_email,
                    v_borrower_phone,
                    v_total_owed,
                    v_blacklist_reason,
                    TRUE,
                    v_risk_score,
                    'auto_detected_7_days',  -- Clear indicator of 7-day rule
                    format('Auto-flagged after 7 days overdue. Overdue payments: %s, Recent defaults: %s', 
                           v_overdue_payments, v_recent_defaults),
                    FALSE,
                    TRUE
                );
                
                -- Notify relevant lenders
                INSERT INTO notifications (
                    profile_id,
                    title,
                    message,
                    type,
                    metadata
                )
                SELECT DISTINCT
                    l.lender_id,
                    '⚠️ Borrower Auto-Blacklisted (7-Day Rule)',
                    format('Borrower %s has been automatically blacklisted due to payment overdue by 7+ days. Total owed: $%s',
                           v_borrower_name,
                           v_total_owed),
                    'critical_alert',
                    jsonb_build_object(
                        'borrower_id', v_borrower_id,
                        'borrower_name', v_borrower_name,
                        'reason', v_blacklist_reason,
                        'auto_generated', true,
                        'trigger_date', CURRENT_DATE
                    )
                FROM loans l
                WHERE l.borrower_id = v_borrower_id
                AND l.status IN ('active', 'overdue')
                AND l.lender_id IS NOT NULL;
                
                -- Also notify admins
                INSERT INTO notifications (
                    profile_id,
                    title,
                    message,
                    type,
                    metadata
                )
                SELECT 
                    id,
                    '🚨 Auto-Blacklist Alert (7-Day Rule)',
                    format('System automatically blacklisted %s for overdue payments exceeding 7 days', v_borrower_name),
                    'system_alert',
                    jsonb_build_object(
                        'borrower_id', v_borrower_id,
                        'action', 'auto_blacklisted_7_days'
                    )
                FROM profiles
                WHERE role IN ('admin', 'super_admin');
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. UPDATE LOAN STATUS CHECK FOR 7-DAY OVERDUE
-- =====================================================
CREATE OR REPLACE FUNCTION check_and_update_overdue_loans()
RETURNS void AS $$
BEGIN
    -- Update loans to overdue after 1 day
    UPDATE loans
    SET 
        status = 'overdue',
        updated_at = NOW()
    WHERE status = 'active'
    AND due_date < CURRENT_DATE
    AND due_date >= CURRENT_DATE - INTERVAL '7 days';
    
    -- Update loans to defaulted and auto-blacklist after 7 days
    UPDATE loans
    SET 
        status = 'defaulted',
        updated_at = NOW()
    WHERE status IN ('active', 'overdue')
    AND due_date < CURRENT_DATE - INTERVAL '7 days';
    
    -- Trigger auto-blacklisting for all defaulted loans
    PERFORM auto_detect_risky_borrower()
    FROM loans
    WHERE status = 'defaulted'
    AND updated_at >= NOW() - INTERVAL '1 minute';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CREATE SCHEDULED JOB FOR DAILY CHECK (7-DAY RULE)
-- =====================================================
-- This runs daily to catch any overdue loans
CREATE OR REPLACE FUNCTION daily_overdue_check_7_days()
RETURNS void AS $$
DECLARE
    v_blacklisted_count INTEGER := 0;
    v_borrower RECORD;
BEGIN
    -- Find all borrowers with payments overdue by 7+ days
    FOR v_borrower IN 
        SELECT DISTINCT
            l.borrower_id,
            p.full_name,
            p.email,
            COUNT(DISTINCT lr.id) as overdue_payments,
            SUM(lr.amount - COALESCE(lr.amount_paid, 0)) as total_overdue
        FROM loan_repayments lr
        JOIN loans l ON l.id = lr.loan_id
        JOIN profiles p ON p.id = l.borrower_id
        WHERE lr.status IN ('pending', 'overdue', 'pending_confirmation')
        AND lr.due_date < CURRENT_DATE - INTERVAL '7 days'
        AND NOT EXISTS (
            SELECT 1 FROM blacklisted_borrowers bb
            WHERE bb.borrower_profile_id = l.borrower_id
            AND bb.deregistered = FALSE
            AND bb.auto_generated = TRUE
            AND bb.created_at >= CURRENT_DATE - INTERVAL '1 day'
        )
        GROUP BY l.borrower_id, p.full_name, p.email
    LOOP
        -- Add to blacklist
        INSERT INTO blacklisted_borrowers (
            borrower_profile_id,
            borrower_name,
            borrower_email,
            amount_owed,
            reason,
            auto_generated,
            detection_reason,
            additional_notes,
            permanent_entry
        ) VALUES (
            v_borrower.borrower_id,
            v_borrower.full_name,
            v_borrower.email,
            v_borrower.total_overdue,
            format('Auto: %s payments overdue by 7+ days', v_borrower.overdue_payments),
            TRUE,
            'scheduled_7_day_check',
            'Daily scheduled check found payments overdue by 7+ days',
            TRUE
        );
        
        v_blacklisted_count := v_blacklisted_count + 1;
        
        -- Notify the borrower
        INSERT INTO notifications (
            profile_id,
            title,
            message,
            type,
            metadata
        ) VALUES (
            v_borrower.borrower_id,
            '⚠️ You have been listed as a Risky Borrower',
            format('You have %s payment(s) overdue by more than 7 days totaling $%s. You have been automatically added to the risky borrowers list. Contact your lender(s) immediately to resolve this.',
                   v_borrower.overdue_payments,
                   v_borrower.total_overdue),
            'critical_alert',
            jsonb_build_object(
                'auto_blacklisted', true,
                'overdue_days', 7,
                'total_overdue', v_borrower.total_overdue
            )
        );
    END LOOP;
    
    -- Log the results
    IF v_blacklisted_count > 0 THEN
        INSERT INTO compliance_logs (
            log_type,
            severity,
            description,
            metadata
        ) VALUES (
            'auto_blacklist_7_days',
            'warning',
            format('Daily check: Auto-blacklisted %s borrower(s) with payments overdue by 7+ days', v_blacklisted_count),
            jsonb_build_object(
                'count', v_blacklisted_count,
                'run_date', CURRENT_DATE
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. SETUP CRON JOB (IF PG_CRON AVAILABLE)
-- =====================================================
DO $$
BEGIN
    -- Check if pg_cron is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove old 30-day job if exists
        PERFORM cron.unschedule('check-overdue-loans-30-days');
        PERFORM cron.unschedule('check-overdue-loans');
        
        -- Schedule new 7-day check to run every day at 9 AM
        PERFORM cron.schedule(
            'check-overdue-loans-7-days',
            '0 9 * * *',  -- Daily at 9 AM
            'SELECT daily_overdue_check_7_days();'
        );
        
        RAISE NOTICE 'Scheduled daily job for 7-day overdue check at 9 AM';
    ELSE
        RAISE NOTICE 'pg_cron not available - run daily_overdue_check_7_days() manually';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not create scheduled job: %', SQLERRM;
END $$;

-- =====================================================
-- 5. UPDATE EXISTING TRIGGERS
-- =====================================================
-- Drop old trigger if exists
DROP TRIGGER IF EXISTS auto_detect_risky_borrower_trigger ON loan_repayments;
DROP TRIGGER IF EXISTS auto_detect_risky_borrower_trigger ON loan_payments;
DROP TRIGGER IF EXISTS auto_detect_risky_borrower_trigger ON loans;

-- Create new triggers with 7-day detection
CREATE TRIGGER auto_detect_risky_borrower_on_payment
    AFTER INSERT OR UPDATE ON loan_repayments
    FOR EACH ROW
    WHEN (NEW.status IN ('overdue', 'failed', 'defaulted') 
          OR (NEW.status = 'pending' AND NEW.due_date < CURRENT_DATE - INTERVAL '7 days'))
    EXECUTE FUNCTION auto_detect_risky_borrower();

CREATE TRIGGER auto_detect_risky_borrower_on_loan
    AFTER UPDATE ON loans
    FOR EACH ROW
    WHEN (NEW.status IN ('overdue', 'defaulted')
          OR (NEW.status = 'active' AND NEW.due_date < CURRENT_DATE - INTERVAL '7 days'))
    EXECUTE FUNCTION auto_detect_risky_borrower();

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
    v_trigger_count INTEGER;
    v_function_exists BOOLEAN;
BEGIN
    -- Count triggers
    SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger
    WHERE tgname LIKE '%risky_borrower%';
    
    -- Check function
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'daily_overdue_check_7_days'
    ) INTO v_function_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '7-DAY AUTO-BLACKLIST SYSTEM UPDATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Previous timing: 30 days → Now: 7 DAYS';
    RAISE NOTICE 'Triggers created: %', v_trigger_count;
    RAISE NOTICE 'Daily check function: %', CASE WHEN v_function_exists THEN 'READY' ELSE 'NOT FOUND' END;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'New Rules:';
    RAISE NOTICE '  • 1 payment 7 days overdue = AUTO-BLACKLIST';
    RAISE NOTICE '  • 1 default in 3 months = AUTO-BLACKLIST';
    RAISE NOTICE '  • Risk score ≥ 50 = AUTO-BLACKLIST';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Protection: Prevents borrowers from';
    RAISE NOTICE 'defrauding multiple lenders!';
    RAISE NOTICE '========================================';
END $$;