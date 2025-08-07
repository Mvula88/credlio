-- =====================================================
-- Comprehensive Backend for Risky/Bad Borrowers System
-- =====================================================
-- This includes automatic detection, triggers, and functions
-- for managing risky borrowers both manually and automatically
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ENHANCED BLACKLIST TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.blacklisted_borrowers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Link to existing borrower if they're in the system
    borrower_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Lender who reported this default (NULL for system-generated)
    lender_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Borrower information (stored separately in case they're not in system)
    borrower_name VARCHAR(255) NOT NULL,
    borrower_email VARCHAR(255) NOT NULL,
    borrower_phone VARCHAR(50),
    
    -- Loan details
    original_loan_amount DECIMAL(15, 2),
    amount_owed DECIMAL(15, 2),
    loan_date DATE,
    due_date DATE,
    
    -- Default details
    reason VARCHAR(100) NOT NULL,
    last_contact_date DATE,
    recovery_attempts INTEGER DEFAULT 0,
    
    -- Evidence and notes
    evidence_url TEXT,
    additional_notes TEXT,
    
    -- Status tracking
    deregistered BOOLEAN DEFAULT FALSE,
    resolution_status VARCHAR(50) DEFAULT 'unresolved',
    amount_recovered DECIMAL(15, 2) DEFAULT 0,
    resolution_date DATE,
    resolution_notes TEXT,
    
    -- System detection fields
    auto_generated BOOLEAN DEFAULT FALSE,
    detection_reason VARCHAR(100), -- late_payments, multiple_defaults, fraud_pattern
    risk_score INTEGER DEFAULT 50, -- 0-100, higher is riskier
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. BORROWER RISK METRICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.borrower_risk_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    borrower_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    
    -- Payment history metrics
    total_loans INTEGER DEFAULT 0,
    completed_loans INTEGER DEFAULT 0,
    defaulted_loans INTEGER DEFAULT 0,
    late_payments_count INTEGER DEFAULT 0,
    on_time_payments_count INTEGER DEFAULT 0,
    
    -- Financial metrics
    total_borrowed DECIMAL(15, 2) DEFAULT 0,
    total_repaid DECIMAL(15, 2) DEFAULT 0,
    total_outstanding DECIMAL(15, 2) DEFAULT 0,
    average_days_late DECIMAL(10, 2) DEFAULT 0,
    
    -- Risk indicators
    risk_score INTEGER DEFAULT 50, -- 0-100
    risk_category VARCHAR(20) DEFAULT 'medium', -- low, medium, high, extreme
    last_default_date DATE,
    consecutive_defaults INTEGER DEFAULT 0,
    
    -- Reporting metrics
    times_reported INTEGER DEFAULT 0,
    unique_lenders_reporting INTEGER DEFAULT 0,
    
    -- Timestamps
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. AUTOMATIC DETECTION TRIGGERS
-- =====================================================

-- Function to calculate borrower risk score
CREATE OR REPLACE FUNCTION calculate_borrower_risk_score(p_borrower_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_risk_score INTEGER := 50; -- Base score
    v_metrics RECORD;
BEGIN
    -- Get borrower metrics
    SELECT 
        COALESCE(COUNT(DISTINCT CASE WHEN lp.status = 'completed' THEN lp.id END), 0) as completed_payments,
        COALESCE(COUNT(DISTINCT CASE WHEN lp.status = 'defaulted' THEN lp.id END), 0) as defaulted_payments,
        COALESCE(COUNT(DISTINCT CASE WHEN lp.status = 'pending' AND lp.due_date < NOW() THEN lp.id END), 0) as overdue_payments,
        COALESCE(AVG(CASE WHEN lp.payment_date > lp.due_date THEN 
            EXTRACT(DAY FROM lp.payment_date - lp.due_date) END), 0) as avg_days_late
    INTO v_metrics
    FROM loan_payments lp
    WHERE lp.borrower_profile_id = p_borrower_id;
    
    -- Calculate score based on payment history
    -- Good payments improve score
    v_risk_score := v_risk_score - (v_metrics.completed_payments * 2);
    
    -- Bad payments worsen score
    v_risk_score := v_risk_score + (v_metrics.defaulted_payments * 15);
    v_risk_score := v_risk_score + (v_metrics.overdue_payments * 10);
    v_risk_score := v_risk_score + (v_metrics.avg_days_late::INTEGER);
    
    -- Check if already reported
    SELECT COUNT(DISTINCT lender_profile_id) INTO v_metrics.reports
    FROM blacklisted_borrowers
    WHERE borrower_profile_id = p_borrower_id
    AND deregistered = FALSE;
    
    v_risk_score := v_risk_score + (v_metrics.reports * 20);
    
    -- Ensure score is between 0 and 100
    v_risk_score := GREATEST(0, LEAST(100, v_risk_score));
    
    RETURN v_risk_score;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-detect risky borrowers
CREATE OR REPLACE FUNCTION auto_detect_risky_borrower()
RETURNS TRIGGER AS $$
DECLARE
    v_risk_score INTEGER;
    v_borrower_profile RECORD;
    v_recent_defaults INTEGER;
    v_overdue_count INTEGER;
BEGIN
    -- Only process for defaulted or significantly late payments
    IF NEW.status IN ('defaulted', 'pending') THEN
        -- Calculate risk score
        v_risk_score := calculate_borrower_risk_score(NEW.borrower_profile_id);
        
        -- Get borrower info
        SELECT * INTO v_borrower_profile
        FROM profiles
        WHERE id = NEW.borrower_profile_id;
        
        -- Count recent defaults (last 6 months)
        SELECT COUNT(*) INTO v_recent_defaults
        FROM loan_payments
        WHERE borrower_profile_id = NEW.borrower_profile_id
        AND status = 'defaulted'
        AND created_at > NOW() - INTERVAL '6 months';
        
        -- Count overdue payments
        SELECT COUNT(*) INTO v_overdue_count
        FROM loan_payments
        WHERE borrower_profile_id = NEW.borrower_profile_id
        AND status = 'pending'
        AND due_date < NOW() - INTERVAL '30 days';
        
        -- Auto-flag if meets criteria
        IF v_risk_score >= 70 OR v_recent_defaults >= 2 OR v_overdue_count >= 3 THEN
            -- Check if not already system-flagged
            IF NOT EXISTS (
                SELECT 1 FROM blacklisted_borrowers
                WHERE borrower_profile_id = NEW.borrower_profile_id
                AND auto_generated = TRUE
                AND deregistered = FALSE
            ) THEN
                -- Add to blacklist
                INSERT INTO blacklisted_borrowers (
                    borrower_profile_id,
                    borrower_name,
                    borrower_email,
                    borrower_phone,
                    reason,
                    additional_notes,
                    auto_generated,
                    detection_reason,
                    risk_score,
                    amount_owed
                ) VALUES (
                    NEW.borrower_profile_id,
                    v_borrower_profile.full_name,
                    v_borrower_profile.email,
                    v_borrower_profile.phone_number,
                    CASE 
                        WHEN v_recent_defaults >= 2 THEN 'multiple_defaults'
                        WHEN v_overdue_count >= 3 THEN 'chronic_late_payments'
                        ELSE 'high_risk_score'
                    END,
                    format('System auto-detected: Risk Score %s, Recent Defaults: %s, Overdue Payments: %s',
                           v_risk_score, v_recent_defaults, v_overdue_count),
                    TRUE,
                    CASE 
                        WHEN v_recent_defaults >= 2 THEN 'multiple_defaults'
                        WHEN v_overdue_count >= 3 THEN 'late_payments'
                        ELSE 'risk_pattern'
                    END,
                    v_risk_score,
                    NEW.amount_due
                );
                
                -- Create notification for admins
                INSERT INTO notifications (
                    profile_id,
                    title,
                    message,
                    type,
                    metadata
                ) SELECT 
                    id,
                    'Borrower Auto-Flagged as Risky',
                    format('System has automatically flagged %s as a risky borrower due to payment history',
                           v_borrower_profile.full_name),
                    'alert',
                    jsonb_build_object(
                        'borrower_id', NEW.borrower_profile_id,
                        'risk_score', v_risk_score,
                        'reason', 'auto_detected'
                    )
                FROM profiles
                WHERE role IN ('admin', 'super_admin')
                LIMIT 5; -- Notify up to 5 admins
            END IF;
        END IF;
        
        -- Update borrower risk metrics
        INSERT INTO borrower_risk_metrics (
            borrower_profile_id,
            risk_score,
            risk_category,
            last_calculated
        ) VALUES (
            NEW.borrower_profile_id,
            v_risk_score,
            CASE 
                WHEN v_risk_score >= 80 THEN 'extreme'
                WHEN v_risk_score >= 60 THEN 'high'
                WHEN v_risk_score >= 40 THEN 'medium'
                ELSE 'low'
            END,
            NOW()
        )
        ON CONFLICT (borrower_profile_id) DO UPDATE
        SET risk_score = EXCLUDED.risk_score,
            risk_category = EXCLUDED.risk_category,
            last_calculated = NOW(),
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-detection
DROP TRIGGER IF EXISTS auto_detect_risky_borrower_trigger ON loan_payments;
CREATE TRIGGER auto_detect_risky_borrower_trigger
    AFTER INSERT OR UPDATE ON loan_payments
    FOR EACH ROW
    EXECUTE FUNCTION auto_detect_risky_borrower();

-- =====================================================
-- 4. API FUNCTIONS
-- =====================================================

-- Function to get borrower risk summary
CREATE OR REPLACE FUNCTION get_borrower_risk_summary(p_borrower_email VARCHAR)
RETURNS TABLE (
    borrower_name VARCHAR,
    borrower_email VARCHAR,
    risk_score INTEGER,
    risk_category VARCHAR,
    total_reports INTEGER,
    reporting_lenders INTEGER,
    system_flagged BOOLEAN,
    total_amount_owed DECIMAL,
    oldest_report_date TIMESTAMP WITH TIME ZONE,
    report_reasons TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH borrower_reports AS (
        SELECT 
            bb.borrower_name,
            bb.borrower_email,
            bb.auto_generated,
            bb.lender_profile_id,
            bb.amount_owed,
            bb.reason,
            bb.created_at,
            brm.risk_score,
            brm.risk_category
        FROM blacklisted_borrowers bb
        LEFT JOIN borrower_risk_metrics brm ON bb.borrower_profile_id = brm.borrower_profile_id
        WHERE bb.borrower_email = p_borrower_email
        AND bb.deregistered = FALSE
    )
    SELECT 
        MAX(br.borrower_name)::VARCHAR,
        br.borrower_email,
        COALESCE(MAX(br.risk_score), 50),
        COALESCE(MAX(br.risk_category), 'unknown')::VARCHAR,
        COUNT(*)::INTEGER as total_reports,
        COUNT(DISTINCT br.lender_profile_id)::INTEGER as reporting_lenders,
        BOOL_OR(br.auto_generated) as system_flagged,
        SUM(br.amount_owed) as total_amount_owed,
        MIN(br.created_at) as oldest_report_date,
        ARRAY_AGG(DISTINCT br.reason) as report_reasons
    FROM borrower_reports br
    GROUP BY br.borrower_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if borrower is risky
CREATE OR REPLACE FUNCTION is_borrower_risky(p_email VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_report_count INTEGER;
    v_risk_score INTEGER;
    v_is_risky BOOLEAN;
    v_reporting_lenders INTEGER;
BEGIN
    -- Get report counts
    SELECT 
        COUNT(*),
        COUNT(DISTINCT lender_profile_id),
        MAX(risk_score)
    INTO v_report_count, v_reporting_lenders, v_risk_score
    FROM blacklisted_borrowers
    WHERE borrower_email = p_email
    AND deregistered = FALSE;
    
    v_is_risky := v_report_count > 0 OR v_risk_score >= 60;
    
    v_result := jsonb_build_object(
        'is_risky', v_is_risky,
        'risk_level', CASE 
            WHEN v_reporting_lenders >= 3 THEN 'extreme'
            WHEN v_reporting_lenders >= 2 THEN 'high'
            WHEN v_report_count > 0 THEN 'moderate'
            WHEN v_risk_score >= 60 THEN 'elevated'
            ELSE 'low'
        END,
        'report_count', v_report_count,
        'reporting_lenders', v_reporting_lenders,
        'risk_score', COALESCE(v_risk_score, 50),
        'message', CASE
            WHEN v_reporting_lenders > 1 THEN 
                format('⚠️ RISKY/BAD BORROWER - Listed by %s lenders', v_reporting_lenders)
            WHEN v_report_count > 0 THEN 
                '⚠️ RISKY/BAD BORROWER - Listed by 1 lender'
            WHEN v_risk_score >= 60 THEN
                '⚠️ ELEVATED RISK - System detected risky patterns'
            ELSE NULL
        END
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. SCHEDULED MAINTENANCE FUNCTIONS
-- =====================================================

-- Function to update all borrower risk scores (run daily)
CREATE OR REPLACE FUNCTION update_all_borrower_risk_scores()
RETURNS void AS $$
DECLARE
    v_borrower RECORD;
BEGIN
    -- Update risk scores for all borrowers with loans
    FOR v_borrower IN 
        SELECT DISTINCT borrower_profile_id 
        FROM loan_payments
        WHERE created_at > NOW() - INTERVAL '1 year'
    LOOP
        PERFORM calculate_borrower_risk_score(v_borrower.borrower_profile_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_blacklisted_email ON blacklisted_borrowers(borrower_email);
CREATE INDEX IF NOT EXISTS idx_blacklisted_auto ON blacklisted_borrowers(auto_generated);
CREATE INDEX IF NOT EXISTS idx_blacklisted_risk ON blacklisted_borrowers(risk_score);
CREATE INDEX IF NOT EXISTS idx_risk_metrics_borrower ON borrower_risk_metrics(borrower_profile_id);
CREATE INDEX IF NOT EXISTS idx_risk_metrics_category ON borrower_risk_metrics(risk_category);

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================
ALTER TABLE borrower_risk_metrics ENABLE ROW LEVEL SECURITY;

-- Lenders can view risk metrics
CREATE POLICY "Lenders can view risk metrics" ON borrower_risk_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'lender'
        )
    );

-- System can update risk metrics
CREATE POLICY "System can manage risk metrics" ON borrower_risk_metrics
    FOR ALL USING (TRUE);

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON blacklisted_borrowers TO authenticated;
GRANT SELECT ON borrower_risk_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_borrower_risk_summary TO authenticated;
GRANT EXECUTE ON FUNCTION is_borrower_risky TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_borrower_risk_score TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Risky/Bad Borrowers Backend Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Features Implemented:';
    RAISE NOTICE '1. Automatic risk detection based on payment patterns';
    RAISE NOTICE '2. Risk scoring system (0-100 scale)';
    RAISE NOTICE '3. Triggers for auto-flagging risky borrowers';
    RAISE NOTICE '4. API functions for checking borrower risk';
    RAISE NOTICE '5. Performance indexes and RLS policies';
    RAISE NOTICE '========================================';
END $$;