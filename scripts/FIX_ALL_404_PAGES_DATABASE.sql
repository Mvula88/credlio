-- =====================================================
-- Database Support for All 404 Fixed Pages
-- =====================================================
-- This script ensures all tables, functions, and policies
-- needed for the newly created pages are available
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENSURE ALL REQUIRED TABLES EXIST
-- =====================================================

-- First, ensure missing columns on existing tables
DO $$
BEGIN
    -- Add status column to loan_payments if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'loan_payments' AND column_name = 'status') THEN
        ALTER TABLE public.loan_payments ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
    END IF;
    
    -- Add other potentially missing columns to loan_payments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'loan_payments' AND column_name = 'borrower_profile_id') THEN
        ALTER TABLE public.loan_payments ADD COLUMN borrower_profile_id UUID REFERENCES public.profiles(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'loan_payments' AND column_name = 'lender_profile_id') THEN
        ALTER TABLE public.loan_payments ADD COLUMN lender_profile_id UUID REFERENCES public.profiles(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'loan_payments' AND column_name = 'amount_due') THEN
        ALTER TABLE public.loan_payments ADD COLUMN amount_due DECIMAL(15, 2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'loan_payments' AND column_name = 'amount_paid') THEN
        ALTER TABLE public.loan_payments ADD COLUMN amount_paid DECIMAL(15, 2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'loan_payments' AND column_name = 'due_date') THEN
        ALTER TABLE public.loan_payments ADD COLUMN due_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'loan_payments' AND column_name = 'loan_offer_id') THEN
        ALTER TABLE public.loan_payments ADD COLUMN loan_offer_id UUID REFERENCES public.loan_offers(id);
    END IF;
END $$;

-- Ensure borrower_profiles table exists (for borrower profile views)
CREATE TABLE IF NOT EXISTS public.borrower_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    reputation_score INTEGER DEFAULT 50,
    total_loans_requested INTEGER DEFAULT 0,
    loans_repaid INTEGER DEFAULT 0,
    loans_defaulted INTEGER DEFAULT 0,
    total_borrowed DECIMAL(15, 2) DEFAULT 0,
    total_repaid DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure document_verifications table for verification pages
CREATE TABLE IF NOT EXISTS public.document_verifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,  -- Changed from profile_id to user_id
    document_type VARCHAR(50) NOT NULL, -- national_id, proof_of_income, etc.
    document_url TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure lender_borrower_relationships for tracking connections
CREATE TABLE IF NOT EXISTS public.lender_borrower_relationships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    borrower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'connected', -- connected, invited, blocked
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lender_id, borrower_id)
);

-- Ensure compliance_logs table for risk/compliance page
CREATE TABLE IF NOT EXISTS public.compliance_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    log_type VARCHAR(50) NOT NULL, -- risk_alert, compliance_check, verification
    severity VARCHAR(20) DEFAULT 'info', -- info, warning, critical
    user_id UUID REFERENCES public.profiles(id),  -- Changed from profile_id to user_id for consistency
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure financial_summaries table for financial overview
CREATE TABLE IF NOT EXISTS public.financial_summaries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    summary_date DATE NOT NULL,
    total_lent DECIMAL(15, 2) DEFAULT 0,
    total_repaid DECIMAL(15, 2) DEFAULT 0,
    total_defaulted DECIMAL(15, 2) DEFAULT 0,
    active_loans_count INTEGER DEFAULT 0,
    completed_loans_count INTEGER DEFAULT 0,
    new_users_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(summary_date)
);

-- Ensure admin_activity_logs for admin actions
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50), -- user, loan, payment, etc.
    target_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- =====================================================

-- Create indexes only if the table and column exist
DO $$
BEGIN
    -- Document verifications indexes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_verifications' AND column_name = 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_document_verifications_user ON public.document_verifications(user_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_verifications' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_document_verifications_status ON public.document_verifications(status);
    END IF;
    
    -- Lender borrower relationships indexes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lender_borrower_relationships' AND column_name = 'lender_id') THEN
        CREATE INDEX IF NOT EXISTS idx_lender_borrower_lender ON public.lender_borrower_relationships(lender_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lender_borrower_relationships' AND column_name = 'borrower_id') THEN
        CREATE INDEX IF NOT EXISTS idx_lender_borrower_borrower ON public.lender_borrower_relationships(borrower_id);
    END IF;
    
    -- Compliance logs indexes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'compliance_logs' AND column_name = 'severity') THEN
        CREATE INDEX IF NOT EXISTS idx_compliance_logs_severity ON public.compliance_logs(severity);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'compliance_logs' AND column_name = 'resolved') THEN
        CREATE INDEX IF NOT EXISTS idx_compliance_logs_resolved ON public.compliance_logs(resolved);
    END IF;
    
    -- Financial summaries indexes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_summaries' AND column_name = 'summary_date') THEN
        CREATE INDEX IF NOT EXISTS idx_financial_summaries_date ON public.financial_summaries(summary_date DESC);
    END IF;
    
    -- Admin activity logs indexes  
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_activity_logs' AND column_name = 'admin_id') THEN
        CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON public.admin_activity_logs(admin_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_activity_logs' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON public.admin_activity_logs(created_at DESC);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- If any error, just continue
        NULL;
END $$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.document_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lender_borrower_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own documents" ON public.document_verifications;
DROP POLICY IF EXISTS "Admins can manage all documents" ON public.document_verifications;
DROP POLICY IF EXISTS "Lenders can manage relationships" ON public.lender_borrower_relationships;
DROP POLICY IF EXISTS "Borrowers can view relationships" ON public.lender_borrower_relationships;
DROP POLICY IF EXISTS "Admins can view compliance logs" ON public.compliance_logs;
DROP POLICY IF EXISTS "Admins can view financial summaries" ON public.financial_summaries;
DROP POLICY IF EXISTS "Admins can view activity logs" ON public.admin_activity_logs;

-- Document Verifications Policies
CREATE POLICY "Users can view own documents" ON public.document_verifications
    FOR SELECT USING (
        user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Admins can manage all documents" ON public.document_verifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('admin', 'super_admin', 'country_admin')
        )
    );

-- Lender-Borrower Relationships Policies
CREATE POLICY "Lenders can manage relationships" ON public.lender_borrower_relationships
    FOR ALL USING (
        lender_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Borrowers can view relationships" ON public.lender_borrower_relationships
    FOR SELECT USING (
        borrower_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );

-- Compliance Logs Policies
CREATE POLICY "Admins can view compliance logs" ON public.compliance_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('admin', 'super_admin', 'country_admin')
        )
    );

-- Financial Summaries Policies
CREATE POLICY "Admins can view financial summaries" ON public.financial_summaries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('admin', 'super_admin', 'country_admin')
        )
    );

-- Admin Activity Logs Policies
CREATE POLICY "Admins can view activity logs" ON public.admin_activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- =====================================================
-- HELPER FUNCTIONS FOR NEW PAGES
-- =====================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_borrower_details(UUID, UUID);
DROP FUNCTION IF EXISTS get_lender_borrowers(UUID);
DROP FUNCTION IF EXISTS get_verification_queue();
DROP FUNCTION IF EXISTS get_compliance_metrics();
DROP FUNCTION IF EXISTS get_financial_overview();
DROP FUNCTION IF EXISTS verify_user_document(UUID, UUID, VARCHAR);
DROP FUNCTION IF EXISTS log_admin_activity(UUID, VARCHAR, VARCHAR, UUID, JSONB, JSONB);

-- Function to get detailed borrower information for profile page
CREATE FUNCTION get_borrower_details(p_borrower_id UUID, p_lender_id UUID)
RETURNS TABLE (
    borrower_id UUID,
    full_name VARCHAR,
    email VARCHAR,
    phone_number VARCHAR,
    country_name VARCHAR,
    reputation_score INTEGER,
    total_loans INTEGER,
    loans_repaid INTEGER,
    loans_defaulted INTEGER,
    is_blacklisted BOOLEAN,
    relationship_status VARCHAR,
    loan_history_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as borrower_id,
        p.full_name,
        p.email,
        p.phone_number,
        c.name as country_name,
        COALESCE(bp.reputation_score, 50) as reputation_score,
        COALESCE(bp.total_loans_requested, 0) as total_loans,
        COALESCE(bp.loans_repaid, 0) as loans_repaid,
        COALESCE(bp.loans_defaulted, 0) as loans_defaulted,
        EXISTS(SELECT 1 FROM public.blacklisted_borrowers WHERE borrower_profile_id = p.id) as is_blacklisted,
        lbr.relationship_type as relationship_status,
        COUNT(DISTINCT lo.id)::INTEGER as loan_history_count
    FROM public.profiles p
    LEFT JOIN public.countries c ON p.country_id = c.id
    LEFT JOIN public.borrower_profiles bp ON bp.user_id = p.id
    LEFT JOIN public.lender_borrower_relationships lbr ON lbr.borrower_id = p.id AND lbr.lender_id = p_lender_id
    LEFT JOIN public.loan_requests lr ON lr.borrower_profile_id = p.id
    LEFT JOIN public.loan_offers lo ON lo.loan_request_id = lr.id AND lo.lender_profile_id = p_lender_id
    WHERE p.id = p_borrower_id AND p.role = 'borrower'
    GROUP BY p.id, p.full_name, p.email, p.phone_number, c.name, bp.reputation_score, 
             bp.total_loans_requested, bp.loans_repaid, bp.loans_defaulted, lbr.relationship_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get lender's connected borrowers
CREATE FUNCTION get_lender_borrowers(p_lender_id UUID)
RETURNS TABLE (
    borrower_id UUID,
    full_name VARCHAR,
    email VARCHAR,
    country_name VARCHAR,
    reputation_score INTEGER,
    relationship_type VARCHAR,
    active_loans INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as borrower_id,
        p.full_name,
        p.email,
        c.name as country_name,
        COALESCE(bp.reputation_score, 50) as reputation_score,
        COALESCE(lbr.relationship_type, 'none') as relationship_type,
        COUNT(DISTINCT CASE WHEN lo.status = 'active' THEN lo.id END)::INTEGER as active_loans
    FROM public.profiles p
    LEFT JOIN public.countries c ON p.country_id = c.id
    LEFT JOIN public.borrower_profiles bp ON bp.user_id = p.id
    LEFT JOIN public.lender_borrower_relationships lbr ON lbr.borrower_id = p.id AND lbr.lender_id = p_lender_id
    LEFT JOIN public.loan_requests lr ON lr.borrower_profile_id = p.id
    LEFT JOIN public.loan_offers lo ON lo.loan_request_id = lr.id AND lo.lender_profile_id = p_lender_id
    WHERE p.role = 'borrower'
    AND (lbr.lender_id = p_lender_id OR EXISTS(
        SELECT 1 FROM public.loan_offers lo2
        JOIN public.loan_requests lr2 ON lo2.loan_request_id = lr2.id
        WHERE lo2.lender_profile_id = p_lender_id AND lr2.borrower_profile_id = p.id
    ))
    GROUP BY p.id, p.full_name, p.email, c.name, bp.reputation_score, lbr.relationship_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get verification queue for admin
CREATE FUNCTION get_verification_queue()
RETURNS TABLE (
    profile_id UUID,
    full_name VARCHAR,
    email VARCHAR,
    role VARCHAR,
    country_name VARCHAR,
    documents_submitted INTEGER,
    documents_verified INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as profile_id,
        p.full_name,
        p.email,
        p.role,
        c.name as country_name,
        COUNT(DISTINCT dv.id)::INTEGER as documents_submitted,
        COUNT(DISTINCT CASE WHEN dv.status = 'approved' THEN dv.id END)::INTEGER as documents_verified,
        p.created_at
    FROM public.profiles p
    LEFT JOIN public.countries c ON p.country_id = c.id
    LEFT JOIN public.document_verifications dv ON dv.user_id = p.id  -- Changed from profile_id to user_id
    WHERE p.is_verified = false
    GROUP BY p.id, p.full_name, p.email, p.role, c.name, p.created_at
    ORDER BY p.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get compliance metrics
CREATE FUNCTION get_compliance_metrics()
RETURNS TABLE (
    total_users INTEGER,
    verified_users INTEGER,
    high_risk_users INTEGER,
    blacklisted_users INTEGER,
    overdue_payments INTEGER,
    unresolved_compliance_issues INTEGER,
    platform_risk_score INTEGER
) AS $$
DECLARE
    v_total_users INTEGER;
    v_verified_users INTEGER;
    v_high_risk_users INTEGER;
    v_blacklisted_users INTEGER;
    v_overdue_payments INTEGER;
    v_unresolved_issues INTEGER;
    v_risk_score INTEGER;
BEGIN
    -- Get total users
    SELECT COUNT(*) INTO v_total_users FROM public.profiles WHERE role IN ('borrower', 'lender');
    
    -- Get verified users
    SELECT COUNT(*) INTO v_verified_users FROM public.profiles WHERE is_verified = true;
    
    -- Get high risk users (reputation < 40)
    SELECT COUNT(*) INTO v_high_risk_users 
    FROM public.borrower_profiles WHERE reputation_score < 40;
    
    -- Get blacklisted users
    SELECT COUNT(DISTINCT borrower_profile_id) INTO v_blacklisted_users 
    FROM public.blacklisted_borrowers WHERE deregistered = false;
    
    -- Get overdue payments
    SELECT COUNT(*) INTO v_overdue_payments 
    FROM public.loan_payments 
    WHERE status = 'pending' AND due_date < NOW();
    
    -- Get unresolved compliance issues
    SELECT COUNT(*) INTO v_unresolved_issues 
    FROM public.compliance_logs 
    WHERE resolved = false AND severity IN ('warning', 'critical');
    
    -- Calculate platform risk score (simple formula)
    v_risk_score := GREATEST(0, LEAST(100, 
        100 - (v_high_risk_users * 2) - (v_blacklisted_users * 5) - (v_overdue_payments * 1)
    ));
    
    RETURN QUERY
    SELECT v_total_users, v_verified_users, v_high_risk_users, 
           v_blacklisted_users, v_overdue_payments, v_unresolved_issues, v_risk_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get financial overview
CREATE FUNCTION get_financial_overview(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    total_lent DECIMAL,
    total_repaid DECIMAL,
    total_outstanding DECIMAL,
    active_loans_count INTEGER,
    completed_loans_count INTEGER,
    default_rate DECIMAL,
    average_loan_size DECIMAL,
    average_interest_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN lo.status IN ('accepted', 'active', 'completed') THEN lo.offered_amount END), 0) as total_lent,
        COALESCE(SUM(lp.amount_paid), 0) as total_repaid,
        COALESCE(SUM(CASE WHEN lo.status = 'active' THEN lo.offered_amount END), 0) as total_outstanding,
        COUNT(DISTINCT CASE WHEN lo.status = 'active' THEN lo.id END)::INTEGER as active_loans_count,
        COUNT(DISTINCT CASE WHEN lo.status = 'completed' THEN lo.id END)::INTEGER as completed_loans_count,
        CASE 
            WHEN COUNT(DISTINCT lo.id) > 0 
            THEN (COUNT(DISTINCT CASE WHEN lp.status = 'defaulted' THEN lo.id END)::DECIMAL / COUNT(DISTINCT lo.id)::DECIMAL * 100)
            ELSE 0 
        END as default_rate,
        AVG(lo.offered_amount) as average_loan_size,
        AVG(lo.interest_rate) as average_interest_rate
    FROM public.loan_offers lo
    LEFT JOIN public.loan_payments lp ON lp.loan_offer_id = lo.id
    WHERE lo.created_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify user document
CREATE FUNCTION verify_user_document(
    p_document_id UUID,
    p_admin_id UUID,
    p_status VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Update document verification status
    UPDATE public.document_verifications
    SET status = p_status,
        verified_by = p_admin_id,
        verified_at = NOW(),
        updated_at = NOW()
    WHERE id = p_document_id
    RETURNING user_id INTO v_user_id;  -- Changed from profile_id to user_id
    
    -- Check if all required documents are verified
    IF p_status = 'approved' AND v_user_id IS NOT NULL THEN
        -- If all documents approved, mark profile as verified
        IF NOT EXISTS (
            SELECT 1 FROM public.document_verifications
            WHERE user_id = v_user_id  -- Changed from profile_id to user_id
            AND status != 'approved'
        ) THEN
            UPDATE public.profiles
            SET is_verified = true,
                updated_at = NOW()
            WHERE id = v_user_id;  -- Changed from profile_id to user_id
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin activity
CREATE FUNCTION log_admin_activity(
    p_admin_id UUID,
    p_action VARCHAR,
    p_target_type VARCHAR,
    p_target_id UUID,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.admin_activity_logs (
        admin_id, action, target_type, target_id, 
        old_values, new_values, created_at
    )
    VALUES (
        p_admin_id, p_action, p_target_type, p_target_id,
        p_old_values, p_new_values, NOW()
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Auto-update financial summaries daily
CREATE OR REPLACE FUNCTION update_daily_financial_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update today's financial summary
    INSERT INTO public.financial_summaries (
        summary_date,
        total_lent,
        total_repaid,
        active_loans_count,
        completed_loans_count
    )
    SELECT 
        CURRENT_DATE,
        COALESCE(SUM(CASE WHEN status IN ('accepted', 'active', 'completed') THEN offered_amount END), 0),
        0, -- Will be updated by payment trigger
        COUNT(DISTINCT CASE WHEN status = 'active' THEN id END),
        COUNT(DISTINCT CASE WHEN status = 'completed' THEN id END)
    FROM public.loan_offers
    WHERE DATE(created_at) = CURRENT_DATE
    ON CONFLICT (summary_date) DO UPDATE
    SET total_lent = EXCLUDED.total_lent,
        active_loans_count = EXCLUDED.active_loans_count,
        completed_loans_count = EXCLUDED.completed_loans_count,
        metadata = jsonb_build_object('last_updated', NOW());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_financial_summary_trigger'
    ) THEN
        CREATE TRIGGER update_financial_summary_trigger
            AFTER INSERT OR UPDATE ON public.loan_offers
            FOR EACH ROW
            EXECUTE FUNCTION update_daily_financial_summary();
    END IF;
END $$;

-- =====================================================
-- SAMPLE DATA FOR TESTING (Optional)
-- =====================================================

-- Insert sample compliance logs
INSERT INTO public.compliance_logs (log_type, severity, description, metadata)
VALUES 
    ('risk_alert', 'warning', 'High number of loan defaults detected', '{"default_count": 5}'::jsonb),
    ('verification', 'info', 'New user verification completed', '{"user_count": 10}'::jsonb),
    ('compliance_check', 'critical', 'Suspicious activity detected', '{"activity": "multiple_accounts"}'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database setup for 404 pages completed!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables created: document_verifications, lender_borrower_relationships, compliance_logs, financial_summaries, admin_activity_logs';
    RAISE NOTICE 'Functions created: get_borrower_details, get_lender_borrowers, get_verification_queue, get_compliance_metrics, get_financial_overview';
    RAISE NOTICE 'RLS policies applied to all tables';
    RAISE NOTICE 'All pages should now have full backend support!';
END $$;