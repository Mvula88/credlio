-- =====================================================
-- Risky/Bad Borrowers System - ID Based Identification
-- =====================================================
-- This system uses borrower profile IDs as primary identifier
-- Email is kept only as supplementary information
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CREATE/UPDATE BLACKLISTED TABLE WITH ID-BASED STRUCTURE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.blacklisted_borrowers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- PRIMARY IDENTIFIER - Borrower Profile ID (Required)
    borrower_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Lender who reported this default
    lender_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Cached borrower information (for display only, not for identification)
    borrower_name VARCHAR(255),
    borrower_email VARCHAR(255),
    borrower_phone VARCHAR(50),
    borrower_id_number VARCHAR(100), -- National ID or other identifier
    
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
    detection_reason VARCHAR(100),
    risk_score INTEGER DEFAULT 50,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one report per borrower per lender (or system)
    UNIQUE(borrower_profile_id, lender_profile_id)
);

-- Add missing columns if table already exists
DO $$
BEGIN
    -- Ensure borrower_profile_id is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'blacklisted_borrowers' 
        AND column_name = 'borrower_profile_id'
    ) THEN
        -- Remove any records without borrower_profile_id
        DELETE FROM public.blacklisted_borrowers WHERE borrower_profile_id IS NULL;
        
        -- Make it NOT NULL
        ALTER TABLE public.blacklisted_borrowers 
        ALTER COLUMN borrower_profile_id SET NOT NULL;
    END IF;
    
    -- Add borrower_id_number if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'blacklisted_borrowers' 
        AND column_name = 'borrower_id_number'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN borrower_id_number VARCHAR(100);
    END IF;
END $$;

-- =====================================================
-- 2. BORROWER RISK METRICS TABLE (ID-BASED)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.borrower_risk_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- PRIMARY IDENTIFIER - Links directly to profiles table
    borrower_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
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
    risk_score INTEGER DEFAULT 50,
    risk_category VARCHAR(20) DEFAULT 'medium',
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
-- 3. INDEXES FOR PERFORMANCE (ID-BASED)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_blacklisted_borrower_id ON public.blacklisted_borrowers(borrower_profile_id);
CREATE INDEX IF NOT EXISTS idx_blacklisted_lender_id ON public.blacklisted_borrowers(lender_profile_id);
CREATE INDEX IF NOT EXISTS idx_blacklisted_auto ON public.blacklisted_borrowers(auto_generated);
CREATE INDEX IF NOT EXISTS idx_blacklisted_risk ON public.blacklisted_borrowers(risk_score);
CREATE INDEX IF NOT EXISTS idx_blacklisted_deregistered ON public.blacklisted_borrowers(deregistered);
CREATE INDEX IF NOT EXISTS idx_risk_metrics_borrower_id ON public.borrower_risk_metrics(borrower_profile_id);

-- =====================================================
-- 4. ID-BASED FUNCTIONS
-- =====================================================

-- Check if borrower is risky by ID
CREATE OR REPLACE FUNCTION is_borrower_risky_by_id(p_borrower_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_report_count INTEGER;
    v_risk_score INTEGER;
    v_is_risky BOOLEAN;
    v_reporting_lenders INTEGER;
    v_borrower_name TEXT;
    v_borrower_email TEXT;
BEGIN
    -- Get borrower info
    SELECT full_name, email INTO v_borrower_name, v_borrower_email
    FROM public.profiles
    WHERE id = p_borrower_id;
    
    -- Get report counts using ID
    SELECT 
        COUNT(*),
        COUNT(DISTINCT lender_profile_id),
        MAX(risk_score)
    INTO v_report_count, v_reporting_lenders, v_risk_score
    FROM public.blacklisted_borrowers
    WHERE borrower_profile_id = p_borrower_id
    AND deregistered = FALSE;
    
    -- Check risk metrics
    SELECT risk_score INTO v_risk_score
    FROM public.borrower_risk_metrics
    WHERE borrower_profile_id = p_borrower_id;
    
    v_is_risky := v_report_count > 0 OR COALESCE(v_risk_score, 50) >= 60;
    
    v_result := jsonb_build_object(
        'borrower_id', p_borrower_id,
        'borrower_name', v_borrower_name,
        'borrower_email', v_borrower_email,
        'is_risky', v_is_risky,
        'risk_level', CASE 
            WHEN v_reporting_lenders >= 3 THEN 'extreme'
            WHEN v_reporting_lenders >= 2 THEN 'high'
            WHEN v_report_count > 0 THEN 'moderate'
            WHEN COALESCE(v_risk_score, 50) >= 60 THEN 'elevated'
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
            WHEN COALESCE(v_risk_score, 50) >= 60 THEN
                '⚠️ ELEVATED RISK - System detected risky patterns'
            ELSE NULL
        END
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all risky borrowers with their IDs
CREATE OR REPLACE FUNCTION get_all_risky_borrowers()
RETURNS TABLE (
    borrower_id UUID,
    borrower_name VARCHAR,
    borrower_email VARCHAR,
    borrower_id_number VARCHAR,
    risk_score INTEGER,
    risk_category VARCHAR,
    total_reports INTEGER,
    reporting_lenders INTEGER,
    system_flagged BOOLEAN,
    total_amount_owed DECIMAL,
    oldest_report_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH borrower_reports AS (
        SELECT 
            bb.borrower_profile_id,
            MAX(bb.borrower_name) as borrower_name,
            MAX(bb.borrower_email) as borrower_email,
            MAX(bb.borrower_id_number) as borrower_id_number,
            COUNT(*) as total_reports,
            COUNT(DISTINCT bb.lender_profile_id) as reporting_lenders,
            BOOL_OR(bb.auto_generated) as system_flagged,
            SUM(bb.amount_owed) as total_amount_owed,
            MIN(bb.created_at) as oldest_report_date,
            MAX(bb.risk_score) as risk_score
        FROM public.blacklisted_borrowers bb
        WHERE bb.deregistered = FALSE
        GROUP BY bb.borrower_profile_id
    )
    SELECT 
        br.borrower_profile_id,
        COALESCE(br.borrower_name, p.full_name)::VARCHAR,
        COALESCE(br.borrower_email, p.email)::VARCHAR,
        br.borrower_id_number::VARCHAR,
        COALESCE(brm.risk_score, br.risk_score, 50),
        COALESCE(brm.risk_category, 'unknown')::VARCHAR,
        br.total_reports::INTEGER,
        br.reporting_lenders::INTEGER,
        br.system_flagged,
        br.total_amount_owed,
        br.oldest_report_date
    FROM borrower_reports br
    LEFT JOIN public.profiles p ON p.id = br.borrower_profile_id
    LEFT JOIN public.borrower_risk_metrics brm ON brm.borrower_profile_id = br.borrower_profile_id
    ORDER BY br.reporting_lenders DESC, br.total_amount_owed DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Report a defaulter by ID
CREATE OR REPLACE FUNCTION report_defaulter_by_id(
    p_borrower_id UUID,
    p_lender_id UUID,
    p_reason VARCHAR,
    p_amount_owed DECIMAL,
    p_loan_date DATE DEFAULT NULL,
    p_due_date DATE DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_evidence_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_report_id UUID;
    v_borrower_info RECORD;
BEGIN
    -- Get borrower information
    SELECT full_name, email, phone_number
    INTO v_borrower_info
    FROM public.profiles
    WHERE id = p_borrower_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Borrower with ID % not found', p_borrower_id;
    END IF;
    
    -- Insert or update the report
    INSERT INTO public.blacklisted_borrowers (
        borrower_profile_id,
        lender_profile_id,
        borrower_name,
        borrower_email,
        borrower_phone,
        reason,
        amount_owed,
        loan_date,
        due_date,
        additional_notes,
        evidence_url,
        auto_generated
    ) VALUES (
        p_borrower_id,
        p_lender_id,
        v_borrower_info.full_name,
        v_borrower_info.email,
        v_borrower_info.phone_number,
        p_reason,
        p_amount_owed,
        p_loan_date,
        p_due_date,
        p_notes,
        p_evidence_url,
        FALSE
    )
    ON CONFLICT (borrower_profile_id, lender_profile_id) DO UPDATE
    SET 
        amount_owed = EXCLUDED.amount_owed,
        reason = EXCLUDED.reason,
        additional_notes = EXCLUDED.additional_notes,
        evidence_url = EXCLUDED.evidence_url,
        updated_at = NOW()
    RETURNING id INTO v_report_id;
    
    -- Update risk metrics
    INSERT INTO public.borrower_risk_metrics (
        borrower_profile_id,
        times_reported,
        unique_lenders_reporting
    ) VALUES (
        p_borrower_id,
        1,
        1
    )
    ON CONFLICT (borrower_profile_id) DO UPDATE
    SET 
        times_reported = borrower_risk_metrics.times_reported + 1,
        unique_lenders_reporting = (
            SELECT COUNT(DISTINCT lender_profile_id)
            FROM public.blacklisted_borrowers
            WHERE borrower_profile_id = p_borrower_id
        ),
        updated_at = NOW();
    
    RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. AUTOMATIC RISK DETECTION (ID-BASED)
-- =====================================================
CREATE OR REPLACE FUNCTION auto_detect_risky_borrower_by_id()
RETURNS TRIGGER AS $$
DECLARE
    v_risk_score INTEGER;
    v_recent_defaults INTEGER;
    v_overdue_count INTEGER;
BEGIN
    -- Only process for borrowers with profile IDs
    IF NEW.borrower_profile_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Only process for defaulted or significantly late payments
    IF NEW.status IN ('defaulted', 'pending') THEN
        -- Count recent defaults
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
        
        -- Calculate risk score
        v_risk_score := 50;
        v_risk_score := v_risk_score + (v_recent_defaults * 15);
        v_risk_score := v_risk_score + (v_overdue_count * 10);
        v_risk_score := LEAST(100, v_risk_score);
        
        -- Auto-flag if meets criteria
        IF v_risk_score >= 70 OR v_recent_defaults >= 2 OR v_overdue_count >= 3 THEN
            -- Add to blacklist (system-generated)
            INSERT INTO public.blacklisted_borrowers (
                borrower_profile_id,
                borrower_name,
                borrower_email,
                reason,
                additional_notes,
                auto_generated,
                detection_reason,
                risk_score,
                amount_owed
            ) 
            SELECT 
                NEW.borrower_profile_id,
                p.full_name,
                p.email,
                CASE 
                    WHEN v_recent_defaults >= 2 THEN 'multiple_defaults'
                    WHEN v_overdue_count >= 3 THEN 'chronic_late_payments'
                    ELSE 'high_risk_score'
                END,
                format('Auto-detected: Risk Score %s, Defaults: %s, Overdue: %s',
                       v_risk_score, v_recent_defaults, v_overdue_count),
                TRUE,
                'payment_pattern',
                v_risk_score,
                NEW.amount_due
            FROM public.profiles p
            WHERE p.id = NEW.borrower_profile_id
            ON CONFLICT (borrower_profile_id, lender_profile_id) 
            WHERE lender_profile_id IS NULL
            DO UPDATE SET
                risk_score = EXCLUDED.risk_score,
                updated_at = NOW();
        END IF;
        
        -- Update risk metrics
        INSERT INTO public.borrower_risk_metrics (
            borrower_profile_id,
            risk_score,
            risk_category
        ) VALUES (
            NEW.borrower_profile_id,
            v_risk_score,
            CASE 
                WHEN v_risk_score >= 80 THEN 'extreme'
                WHEN v_risk_score >= 60 THEN 'high'
                WHEN v_risk_score >= 40 THEN 'medium'
                ELSE 'low'
            END
        )
        ON CONFLICT (borrower_profile_id) DO UPDATE
        SET risk_score = EXCLUDED.risk_score,
            risk_category = EXCLUDED.risk_category,
            last_calculated = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. RLS POLICIES (ID-BASED)
-- =====================================================
ALTER TABLE public.blacklisted_borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrower_risk_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Lenders can view all reports" ON public.blacklisted_borrowers;
DROP POLICY IF EXISTS "Lenders can insert reports" ON public.blacklisted_borrowers;
DROP POLICY IF EXISTS "Lenders can view metrics" ON public.borrower_risk_metrics;

-- Create new policies
CREATE POLICY "Lenders can view all reports" ON public.blacklisted_borrowers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('lender', 'admin', 'super_admin')
        )
    );

CREATE POLICY "Lenders can insert reports" ON public.blacklisted_borrowers
    FOR INSERT WITH CHECK (
        lender_profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'lender'
        )
    );

CREATE POLICY "Lenders can view metrics" ON public.borrower_risk_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('lender', 'admin', 'super_admin')
        )
    );

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================
GRANT SELECT, INSERT, UPDATE ON public.blacklisted_borrowers TO authenticated;
GRANT SELECT ON public.borrower_risk_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION is_borrower_risky_by_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_risky_borrowers TO authenticated;
GRANT EXECUTE ON FUNCTION report_defaulter_by_id TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ID-Based Risky Borrowers System Ready!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Key Features:';
    RAISE NOTICE '1. All borrowers identified by profile ID (UUID)';
    RAISE NOTICE '2. Email stored but not used for identification';
    RAISE NOTICE '3. Automatic risk detection based on borrower ID';
    RAISE NOTICE '4. Functions use borrower_profile_id as primary key';
    RAISE NOTICE '5. One report per borrower per lender enforced';
    RAISE NOTICE '========================================';
END $$;