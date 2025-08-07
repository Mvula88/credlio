-- =====================================================
-- Fix Missing Pages Database Requirements
-- =====================================================
-- This script ensures all tables and functions needed
-- for the newly created dashboard pages are available
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENSURE BORROWER_PROFILES TABLE EXISTS
-- =====================================================
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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_borrower_profiles_user_id ON public.borrower_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_borrower_profiles_reputation ON public.borrower_profiles(reputation_score);

-- =====================================================
-- ENSURE DOCUMENT VERIFICATION COLUMNS
-- =====================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_documents JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS address_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS income_verified BOOLEAN DEFAULT FALSE;

-- =====================================================
-- CREATE OR UPDATE NOTIFICATIONS TABLE
-- =====================================================
-- Check if table exists and has the correct column name
DO $$ 
BEGIN
    -- Create table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        CREATE TABLE public.notifications (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'info', -- info, alert, payment, system
            read BOOLEAN DEFAULT FALSE,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
    
    -- Add missing columns if they don't exist
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title VARCHAR(255);
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'info';
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(profile_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- =====================================================
-- ENSURE LOAN_PAYMENTS TABLE HAS ALL COLUMNS
-- =====================================================
ALTER TABLE public.loan_payments
ADD COLUMN IF NOT EXISTS loan_offer_id UUID REFERENCES public.loan_offers(id),
ADD COLUMN IF NOT EXISTS payment_notes TEXT,
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- =====================================================
-- CREATE REPUTATION_BADGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reputation_badges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_type VARCHAR(50) NOT NULL, -- star, shield, zap, target
    badge_name VARCHAR(100) NOT NULL,
    description TEXT,
    criteria_met JSONB DEFAULT '{}'::jsonb,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_badges_profile ON public.reputation_badges(profile_id);
CREATE INDEX IF NOT EXISTS idx_badges_active ON public.reputation_badges(profile_id, is_active);

-- =====================================================
-- CREATE ADMIN SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'general', -- general, security, notification, database
    description TEXT,
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.admin_settings (setting_key, setting_value, setting_type, description)
VALUES 
    ('site_name', '"Credlio"', 'general', 'The name of the platform'),
    ('maintenance_mode', 'false', 'general', 'Enable/disable maintenance mode'),
    ('registration_open', 'true', 'general', 'Allow new user registrations'),
    ('email_verification_required', 'true', 'security', 'Require email verification'),
    ('session_timeout', '30', 'security', 'Session timeout in minutes'),
    ('transaction_threshold', '10000', 'notification', 'Alert threshold for large transactions')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS on tables (safe - won't error if already enabled)
ALTER TABLE public.borrower_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own borrower profile" ON public.borrower_profiles;
DROP POLICY IF EXISTS "Users can update own borrower profile" ON public.borrower_profiles;
DROP POLICY IF EXISTS "Lenders can view borrower profiles" ON public.borrower_profiles;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own badges" ON public.reputation_badges;
DROP POLICY IF EXISTS "Public can view active badges" ON public.reputation_badges;
DROP POLICY IF EXISTS "Admins can view settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Super admins can update settings" ON public.admin_settings;

-- Borrower Profiles Policies
CREATE POLICY "Users can view own borrower profile" ON public.borrower_profiles
    FOR SELECT USING (
        user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Users can update own borrower profile" ON public.borrower_profiles
    FOR UPDATE USING (
        user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Lenders can view borrower profiles" ON public.borrower_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'lender'
        )
    );

-- Notifications Policies
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (
        profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (
        profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Reputation Badges Policies
CREATE POLICY "Users can view own badges" ON public.reputation_badges
    FOR SELECT USING (
        profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Public can view active badges" ON public.reputation_badges
    FOR SELECT USING (is_active = true);

-- Admin Settings Policies
CREATE POLICY "Admins can view settings" ON public.admin_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('admin', 'super_admin', 'country_admin')
        )
    );

CREATE POLICY "Super admins can update settings" ON public.admin_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- =====================================================
-- HELPER FUNCTIONS FOR DATA FETCHING
-- =====================================================

-- Drop existing functions if they exist (to avoid return type conflicts)
DROP FUNCTION IF EXISTS get_borrower_stats(UUID);
DROP FUNCTION IF EXISTS get_lender_stats(UUID);
DROP FUNCTION IF EXISTS create_notification(UUID, VARCHAR, TEXT, VARCHAR, JSONB);
DROP FUNCTION IF EXISTS update_reputation_score(UUID);

-- Function to get borrower statistics
CREATE FUNCTION get_borrower_stats(p_borrower_id UUID)
RETURNS TABLE (
    total_requests INTEGER,
    active_loans INTEGER,
    completed_loans INTEGER,
    total_borrowed DECIMAL,
    total_repaid DECIMAL,
    reputation_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT lr.id)::INTEGER as total_requests,
        COUNT(DISTINCT CASE WHEN lo.status = 'active' THEN lo.id END)::INTEGER as active_loans,
        COUNT(DISTINCT CASE WHEN lo.status = 'completed' THEN lo.id END)::INTEGER as completed_loans,
        COALESCE(SUM(DISTINCT lo.offered_amount), 0) as total_borrowed,
        COALESCE(SUM(lp.amount_paid), 0) as total_repaid,
        COALESCE(MAX(bp.reputation_score), 50) as reputation_score
    FROM public.profiles p
    LEFT JOIN public.loan_requests lr ON lr.borrower_profile_id = p.id
    LEFT JOIN public.loan_offers lo ON lo.loan_request_id = lr.id AND lo.status IN ('accepted', 'active', 'completed')
    LEFT JOIN public.loan_payments lp ON lp.borrower_profile_id = p.id AND lp.status = 'completed'
    LEFT JOIN public.borrower_profiles bp ON bp.user_id = p.id
    WHERE p.id = p_borrower_id
    GROUP BY p.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get lender statistics
CREATE FUNCTION get_lender_stats(p_lender_id UUID)
RETURNS TABLE (
    total_offers INTEGER,
    active_loans INTEGER,
    completed_loans INTEGER,
    total_lent DECIMAL,
    total_received DECIMAL,
    pending_payments INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT lo.id)::INTEGER as total_offers,
        COUNT(DISTINCT CASE WHEN lo.status = 'active' THEN lo.id END)::INTEGER as active_loans,
        COUNT(DISTINCT CASE WHEN lo.status = 'completed' THEN lo.id END)::INTEGER as completed_loans,
        COALESCE(SUM(DISTINCT lo.offered_amount), 0) as total_lent,
        COALESCE(SUM(lp.amount_paid), 0) as total_received,
        COUNT(DISTINCT CASE WHEN lp.status = 'pending' THEN lp.id END)::INTEGER as pending_payments
    FROM public.profiles p
    LEFT JOIN public.loan_offers lo ON lo.lender_profile_id = p.id
    LEFT JOIN public.loan_payments lp ON lp.lender_profile_id = p.id
    WHERE p.id = p_lender_id
    GROUP BY p.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE FUNCTION create_notification(
    p_profile_id UUID,
    p_title VARCHAR,
    p_message TEXT,
    p_type VARCHAR DEFAULT 'info',
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (profile_id, title, message, type, metadata)
    VALUES (p_profile_id, p_title, p_message, p_type, p_metadata)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate and update reputation score
CREATE FUNCTION update_reputation_score(p_borrower_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 50; -- Base score
    v_payment_rate DECIMAL;
    v_loan_count INTEGER;
    v_default_count INTEGER;
BEGIN
    -- Calculate payment rate
    SELECT 
        CASE WHEN COUNT(*) > 0 
            THEN COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL 
            ELSE 1 
        END,
        COUNT(DISTINCT loan_offer_id)
    INTO v_payment_rate, v_loan_count
    FROM public.loan_payments
    WHERE borrower_profile_id = p_borrower_id;
    
    -- Get default count
    SELECT COUNT(*)
    INTO v_default_count
    FROM public.loan_payments
    WHERE borrower_profile_id = p_borrower_id
    AND status = 'defaulted';
    
    -- Calculate score
    v_score := 50; -- Base score
    v_score := v_score + (v_payment_rate * 30)::INTEGER; -- Up to 30 points for payment rate
    v_score := v_score + LEAST(v_loan_count * 2, 20); -- Up to 20 points for loan history
    v_score := v_score - (v_default_count * 10); -- Minus 10 points per default
    
    -- Ensure score is between 0 and 100
    v_score := GREATEST(0, LEAST(100, v_score));
    
    -- Update borrower profile
    UPDATE public.borrower_profiles
    SET reputation_score = v_score,
        updated_at = NOW()
    WHERE user_id = p_borrower_id;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Auto-create borrower profile when borrower signs up
CREATE OR REPLACE FUNCTION create_borrower_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'borrower' THEN
        INSERT INTO public.borrower_profiles (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'create_borrower_profile_trigger'
    ) THEN
        CREATE TRIGGER create_borrower_profile_trigger
            AFTER INSERT ON public.profiles
            FOR EACH ROW
            EXECUTE FUNCTION create_borrower_profile_on_signup();
    END IF;
END $$;

-- Auto-create notification on loan offer
CREATE OR REPLACE FUNCTION notify_on_loan_offer()
RETURNS TRIGGER AS $$
DECLARE
    v_borrower_id UUID;
    v_lender_name TEXT;
BEGIN
    -- Get borrower ID
    SELECT borrower_profile_id INTO v_borrower_id
    FROM public.loan_requests
    WHERE id = NEW.loan_request_id;
    
    -- Get lender name
    SELECT full_name INTO v_lender_name
    FROM public.profiles
    WHERE id = NEW.lender_profile_id;
    
    -- Create notification
    PERFORM create_notification(
        v_borrower_id,
        'New Loan Offer',
        format('You have received a new loan offer from %s for $%s', 
               COALESCE(v_lender_name, 'a lender'), 
               NEW.offered_amount),
        'payment',
        jsonb_build_object('offer_id', NEW.id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'notify_loan_offer_trigger'
    ) THEN
        CREATE TRIGGER notify_loan_offer_trigger
            AFTER INSERT ON public.loan_offers
            FOR EACH ROW
            EXECUTE FUNCTION notify_on_loan_offer();
    END IF;
END $$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Database setup completed successfully!';
    RAISE NOTICE 'Tables created/updated: borrower_profiles, notifications, reputation_badges, admin_settings';
    RAISE NOTICE 'Functions created: get_borrower_stats, get_lender_stats, create_notification, update_reputation_score';
    RAISE NOTICE 'RLS policies applied to all new tables';
END $$;