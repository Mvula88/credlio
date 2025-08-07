-- =====================================================
-- COMPLETE BACKEND SETUP FOR DEREGISTRATION SYSTEM
-- =====================================================
-- Run this script to set up all backend components
-- for the risky borrower deregistration system
-- =====================================================

-- First ensure the base risky borrowers system is set up
-- (Run RISKY_BORROWERS_ID_BASED.sql first if not already done)

-- =====================================================
-- PART 1: ENSURE DEREGISTRATION COLUMNS EXIST
-- =====================================================
DO $$
BEGIN
    -- Check and add deregistration tracking columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'blacklisted_borrowers' 
                   AND column_name = 'deregistered_by') THEN
        
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN IF NOT EXISTS deregistered_by UUID REFERENCES public.profiles(id),
        ADD COLUMN IF NOT EXISTS deregistered_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS deregistration_reason TEXT,
        ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
        
        RAISE NOTICE 'Added deregistration columns to blacklisted_borrowers table';
    ELSE
        RAISE NOTICE 'Deregistration columns already exist';
    END IF;
END $$;

-- =====================================================
-- PART 2: CREATE NOTIFICATIONS TABLE IF NOT EXISTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_profile 
    ON public.notifications(profile_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user 
    ON public.notifications(user_id, read, created_at DESC);

-- =====================================================
-- PART 3: CREATE COMPLIANCE LOGS TABLE IF NOT EXISTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.compliance_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    log_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    user_id UUID REFERENCES public.profiles(id),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for compliance logs
CREATE INDEX IF NOT EXISTS idx_compliance_logs_type 
    ON public.compliance_logs(log_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_user 
    ON public.compliance_logs(user_id, created_at DESC);

-- =====================================================
-- PART 4: CREATE BORROWER RISK METRICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.borrower_risk_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    borrower_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    times_reported INTEGER DEFAULT 0,
    risk_score INTEGER DEFAULT 0,
    risk_category VARCHAR(20) DEFAULT 'low',
    last_reported_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_borrower_risk_metrics_borrower 
    ON public.borrower_risk_metrics(borrower_profile_id);

-- =====================================================
-- PART 5: ENSURE ALL DEREGISTRATION SYSTEM COMPONENTS
-- =====================================================
-- This includes all functions and tables from DEREGISTER_RISKY_BORROWER_SYSTEM.sql

-- Create deregistration requests table
CREATE TABLE IF NOT EXISTS public.deregistration_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Request details
    blacklist_entry_id UUID REFERENCES public.blacklisted_borrowers(id) ON DELETE CASCADE,
    borrower_profile_id UUID REFERENCES public.profiles(id) NOT NULL,
    lender_profile_id UUID REFERENCES public.profiles(id),
    
    -- Payment information
    payment_amount DECIMAL(15, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_reference VARCHAR(255),
    payment_proof_url TEXT,
    
    -- Request status
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    borrower_message TEXT,
    lender_response TEXT,
    
    -- Processing details
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deregistration_requests_status 
    ON public.deregistration_requests(status, borrower_profile_id);
CREATE INDEX IF NOT EXISTS idx_deregistration_requests_lender 
    ON public.deregistration_requests(lender_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_deregistration_requests_borrower 
    ON public.deregistration_requests(borrower_profile_id, status);

-- =====================================================
-- PART 6: CREATE OR REPLACE ALL DEREGISTRATION FUNCTIONS
-- =====================================================

-- Drop existing functions to recreate with latest version
DROP FUNCTION IF EXISTS deregister_risky_borrower CASCADE;
DROP FUNCTION IF EXISTS request_deregistration CASCADE;
DROP FUNCTION IF EXISTS approve_deregistration_request CASCADE;
DROP FUNCTION IF EXISTS alert_risky_borrowers CASCADE;

-- Re-create all functions from DEREGISTER_RISKY_BORROWER_SYSTEM.sql
\i C:/Users/ineke/Downloads/credlio/scripts/DEREGISTER_RISKY_BORROWER_SYSTEM.sql

-- =====================================================
-- PART 7: SET UP RLS POLICIES
-- =====================================================
ALTER TABLE public.blacklisted_borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deregistration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrower_risk_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Borrowers can view own risky status" ON public.blacklisted_borrowers;
DROP POLICY IF EXISTS "Lenders can view all risky borrowers" ON public.blacklisted_borrowers;
DROP POLICY IF EXISTS "Lenders can manage risky borrowers" ON public.blacklisted_borrowers;
DROP POLICY IF EXISTS "Borrowers can view own requests" ON public.deregistration_requests;
DROP POLICY IF EXISTS "Borrowers can create requests" ON public.deregistration_requests;
DROP POLICY IF EXISTS "Lenders can manage requests" ON public.deregistration_requests;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

-- Create comprehensive RLS policies
-- Blacklisted borrowers policies
CREATE POLICY "Borrowers can view own risky status" ON public.blacklisted_borrowers
    FOR SELECT USING (
        borrower_profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Lenders can view all risky borrowers" ON public.blacklisted_borrowers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('lender', 'admin', 'super_admin')
        )
    );

CREATE POLICY "Lenders can manage risky borrowers" ON public.blacklisted_borrowers
    FOR ALL USING (
        lender_profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'lender'
        ) OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- Deregistration requests policies
CREATE POLICY "Borrowers can view own requests" ON public.deregistration_requests
    FOR SELECT USING (
        borrower_profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Borrowers can create requests" ON public.deregistration_requests
    FOR INSERT WITH CHECK (
        borrower_profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'borrower'
        )
    );

CREATE POLICY "Lenders can manage requests" ON public.deregistration_requests
    FOR ALL USING (
        lender_profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'lender'
        ) OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (
        profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
        ) OR user_id = auth.uid()
    );

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (
        profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
        ) OR user_id = auth.uid()
    );

-- =====================================================
-- PART 8: GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.blacklisted_borrowers TO authenticated;
GRANT ALL ON public.deregistration_requests TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.compliance_logs TO authenticated;
GRANT ALL ON public.borrower_risk_metrics TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- PART 9: CREATE HELPER VIEWS
-- =====================================================

-- View for risky borrowers with full details
CREATE OR REPLACE VIEW public.risky_borrowers_detailed AS
SELECT 
    bb.*,
    p.full_name as borrower_full_name,
    p.email as current_email,
    lp.full_name as lender_name,
    lp.company_name as lender_company,
    COUNT(dr.id) as pending_requests,
    MAX(dr.created_at) as last_request_date
FROM public.blacklisted_borrowers bb
LEFT JOIN public.profiles p ON p.id = bb.borrower_profile_id
LEFT JOIN public.profiles lp ON lp.id = bb.lender_profile_id
LEFT JOIN public.deregistration_requests dr ON dr.blacklist_entry_id = bb.id AND dr.status = 'pending'
WHERE bb.deregistered = FALSE
GROUP BY bb.id, p.full_name, p.email, lp.full_name, lp.company_name;

-- Grant access to views
GRANT SELECT ON public.risky_borrowers_detailed TO authenticated;

-- =====================================================
-- PART 10: CREATE SCHEDULED JOB FOR ALERTS
-- =====================================================
-- Note: This requires pg_cron extension which needs to be enabled
-- in Supabase dashboard under Database > Extensions
DO $$
BEGIN
    -- Check if pg_cron is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Schedule daily alert job at 10 AM
        PERFORM cron.schedule(
            'alert-risky-borrowers',
            '0 10 * * *',
            'SELECT alert_risky_borrowers();'
        );
        RAISE NOTICE 'Scheduled job for alerting risky borrowers created';
    ELSE
        RAISE NOTICE 'pg_cron extension not available - manual alerts will be needed';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not create scheduled job: %', SQLERRM;
END $$;

-- =====================================================
-- VERIFICATION AND STATUS REPORT
-- =====================================================
DO $$
DECLARE
    v_tables_count INTEGER;
    v_functions_count INTEGER;
    v_policies_count INTEGER;
BEGIN
    -- Count created tables
    SELECT COUNT(*) INTO v_tables_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'blacklisted_borrowers',
        'deregistration_requests',
        'notifications',
        'compliance_logs',
        'borrower_risk_metrics'
    );
    
    -- Count created functions
    SELECT COUNT(*) INTO v_functions_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name IN (
        'deregister_risky_borrower',
        'request_deregistration',
        'approve_deregistration_request',
        'alert_risky_borrowers'
    );
    
    -- Count RLS policies
    SELECT COUNT(*) INTO v_policies_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN (
        'blacklisted_borrowers',
        'deregistration_requests',
        'notifications'
    );
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DEREGISTRATION BACKEND SETUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables created/verified: %', v_tables_count;
    RAISE NOTICE 'Functions created/verified: %', v_functions_count;
    RAISE NOTICE 'RLS policies active: %', v_policies_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'The system is ready for:';
    RAISE NOTICE '1. Lenders to deregister borrowers';
    RAISE NOTICE '2. Borrowers to request deregistration';
    RAISE NOTICE '3. Automatic borrower notifications';
    RAISE NOTICE '4. Complete audit trail tracking';
    RAISE NOTICE '========================================';
END $$;