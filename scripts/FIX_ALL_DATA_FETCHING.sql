-- Comprehensive Data Fix for Credlio Platform
-- This script ensures all tables exist and have proper data

-- ============================================
-- STEP 1: Create all missing tables
-- ============================================

-- Ensure countries table exists
CREATE TABLE IF NOT EXISTS public.countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(2) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    flag_emoji VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    risk_level VARCHAR(20) DEFAULT 'low',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure profiles table exists with all necessary columns
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone_number VARCHAR(50),
    country_id UUID REFERENCES public.countries(id),
    role VARCHAR(50) DEFAULT 'borrower',
    address TEXT,
    date_of_birth DATE,
    national_id VARCHAR(100),
    profile_picture_url TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_blacklisted BOOLEAN DEFAULT false,
    verification_documents JSONB DEFAULT '[]',
    
    -- Borrower specific fields
    reputation_score INTEGER DEFAULT 500,
    total_borrowed DECIMAL(15, 2) DEFAULT 0,
    total_repaid DECIMAL(15, 2) DEFAULT 0,
    loans_taken INTEGER DEFAULT 0,
    loans_defaulted INTEGER DEFAULT 0,
    
    -- Lender specific fields
    total_lent DECIMAL(15, 2) DEFAULT 0,
    total_recovered DECIMAL(15, 2) DEFAULT 0,
    active_loans_count INTEGER DEFAULT 0,
    borrowers_count INTEGER DEFAULT 0,
    
    -- Additional fields
    online_status BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to profiles if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_traveling BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_country VARCHAR(2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS detected_country VARCHAR(2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50);

-- Ensure loan_requests table exists
CREATE TABLE IF NOT EXISTS public.loan_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    purpose TEXT NOT NULL,
    duration_months INTEGER NOT NULL,
    interest_rate DECIMAL(5, 2),
    collateral_description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Ensure loan_offers table exists
CREATE TABLE IF NOT EXISTS public.loan_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_request_id UUID NOT NULL REFERENCES public.loan_requests(id) ON DELETE CASCADE,
    lender_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    offered_amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    duration_months INTEGER NOT NULL,
    terms_conditions TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE
);

-- Ensure loan_payments table exists
CREATE TABLE IF NOT EXISTS public.loan_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_offer_id UUID NOT NULL REFERENCES public.loan_offers(id) ON DELETE CASCADE,
    borrower_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lender_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount_due DECIMAL(15, 2) NOT NULL,
    amount_paid DECIMAL(15, 2) DEFAULT 0,
    currency_code VARCHAR(3) NOT NULL,
    due_date DATE NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    payment_notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure notifications table exists
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure blacklisted_borrowers table exists
CREATE TABLE IF NOT EXISTS public.blacklisted_borrowers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    reason_category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    evidence_urls JSONB DEFAULT '[]',
    severity_level VARCHAR(20) DEFAULT 'medium',
    is_system_generated BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    deregistered BOOLEAN DEFAULT false,
    deregistered_by UUID REFERENCES public.profiles(id),
    deregistered_at TIMESTAMP WITH TIME ZONE,
    deregistration_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure borrower_invitations table exists
CREATE TABLE IF NOT EXISTS public.borrower_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lender_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invitation_code VARCHAR(20) UNIQUE NOT NULL,
    borrower_name VARCHAR(255),
    borrower_phone VARCHAR(50),
    borrower_email VARCHAR(255),
    loan_amount DECIMAL(15, 2),
    currency_code VARCHAR(3),
    custom_message TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure watchlist table exists
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lender_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    borrower_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lender_profile_id, borrower_profile_id)
);

-- Ensure smart_tags table exists
CREATE TABLE IF NOT EXISTS public.smart_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    tag_value VARCHAR(255),
    tag_type VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(5, 2) DEFAULT 0,
    created_by VARCHAR(50) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure reputation_badges table exists
CREATE TABLE IF NOT EXISTS public.reputation_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_type VARCHAR(50) NOT NULL,
    badge_name VARCHAR(100) NOT NULL,
    description TEXT,
    criteria_met JSONB DEFAULT '{}',
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Ensure audit_logs table exists
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: Insert essential data
-- ============================================

-- Insert countries
INSERT INTO public.countries (code, name, currency_code, flag_emoji, is_active, risk_level) 
VALUES 
    ('ZA', 'South Africa', 'ZAR', '🇿🇦', true, 'low'),
    ('NG', 'Nigeria', 'NGN', '🇳🇬', true, 'medium'),
    ('KE', 'Kenya', 'KES', '🇰🇪', true, 'low'),
    ('GH', 'Ghana', 'GHS', '🇬🇭', true, 'low'),
    ('EG', 'Egypt', 'EGP', '🇪🇬', true, 'medium'),
    ('ET', 'Ethiopia', 'ETB', '🇪🇹', true, 'medium'),
    ('UG', 'Uganda', 'UGX', '🇺🇬', true, 'low'),
    ('TZ', 'Tanzania', 'TZS', '🇹🇿', true, 'low'),
    ('MA', 'Morocco', 'MAD', '🇲🇦', true, 'low'),
    ('DZ', 'Algeria', 'DZD', '🇩🇿', true, 'medium')
ON CONFLICT (code) DO UPDATE
SET 
    name = EXCLUDED.name,
    currency_code = EXCLUDED.currency_code,
    flag_emoji = EXCLUDED.flag_emoji,
    is_active = EXCLUDED.is_active,
    risk_level = EXCLUDED.risk_level;

-- Insert user roles
INSERT INTO public.user_roles (name, description) 
VALUES 
    ('borrower', 'Can request loans and manage repayments'),
    ('lender', 'Can offer loans and track borrowers'),
    ('admin', 'Platform administrator with full access'),
    ('country_admin', 'Administrator for specific country'),
    ('super_admin', 'Super administrator with system-wide access')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- STEP 3: Enable RLS and create policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklisted_borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrower_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
    -- Profiles policies
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
    
    -- Loan requests policies
    DROP POLICY IF EXISTS "Loan requests viewable by authenticated" ON public.loan_requests;
    DROP POLICY IF EXISTS "Borrowers can create loan requests" ON public.loan_requests;
    DROP POLICY IF EXISTS "Borrowers can update their loan requests" ON public.loan_requests;
    
    -- Other table policies
    DROP POLICY IF EXISTS "Loan offers viewable by involved parties" ON public.loan_offers;
    DROP POLICY IF EXISTS "Notifications viewable by owner" ON public.notifications;
    DROP POLICY IF EXISTS "Countries viewable by everyone" ON public.countries;
    DROP POLICY IF EXISTS "User roles viewable by everyone" ON public.user_roles;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create new comprehensive policies

-- Profiles policies
CREATE POLICY "Profiles viewable by authenticated" 
ON public.profiles FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth_user_id = auth.uid());

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth_user_id = auth.uid());

-- Loan requests policies
CREATE POLICY "Loan requests viewable by authenticated" 
ON public.loan_requests FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Borrowers can create loan requests" 
ON public.loan_requests FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = borrower_profile_id 
        AND auth_user_id = auth.uid()
    )
);

CREATE POLICY "Borrowers can update own requests" 
ON public.loan_requests FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = borrower_profile_id 
        AND auth_user_id = auth.uid()
    )
);

-- Loan offers policies
CREATE POLICY "Loan offers viewable by authenticated" 
ON public.loan_offers FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Lenders can create offers" 
ON public.loan_offers FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = lender_profile_id 
        AND auth_user_id = auth.uid()
    )
);

-- Notifications policies
CREATE POLICY "Users view own notifications" 
ON public.notifications FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = profile_id 
        AND auth_user_id = auth.uid()
    )
);

CREATE POLICY "System can create notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

-- Countries and roles - viewable by all authenticated
CREATE POLICY "Countries viewable by all" 
ON public.countries FOR SELECT 
USING (true);

CREATE POLICY "User roles viewable by all" 
ON public.user_roles FOR SELECT 
USING (true);

-- Blacklist viewable by authenticated
CREATE POLICY "Blacklist viewable by authenticated" 
ON public.blacklisted_borrowers FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Watchlist policies
CREATE POLICY "Lenders view own watchlist" 
ON public.watchlist FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = lender_profile_id 
        AND auth_user_id = auth.uid()
    )
);

CREATE POLICY "Lenders manage own watchlist" 
ON public.watchlist FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = lender_profile_id 
        AND auth_user_id = auth.uid()
    )
);

-- Smart tags and badges
CREATE POLICY "Tags viewable by profile owner" 
ON public.smart_tags FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = profile_id 
        AND auth_user_id = auth.uid()
    )
);

CREATE POLICY "Badges viewable by all" 
ON public.reputation_badges FOR SELECT 
USING (true);

-- Audit logs for admins
CREATE POLICY "Audit logs for admins" 
ON public.audit_logs FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- ============================================
-- STEP 4: Create helper functions
-- ============================================

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (auth_user_id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NOW(), NOW())
    ON CONFLICT (auth_user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to update profile timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loan_payments_updated_at 
    BEFORE UPDATE ON public.loan_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- STEP 5: Grant permissions
-- ============================================

-- Grant all permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant select on countries and roles to anon (for signup)
GRANT SELECT ON public.countries TO anon;
GRANT SELECT ON public.user_roles TO anon;

-- ============================================
-- STEP 6: Create indexes for performance
-- ============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_country_id ON public.profiles(country_id);

-- Loan requests indexes
CREATE INDEX IF NOT EXISTS idx_loan_requests_borrower ON public.loan_requests(borrower_profile_id);
CREATE INDEX IF NOT EXISTS idx_loan_requests_status ON public.loan_requests(status);
CREATE INDEX IF NOT EXISTS idx_loan_requests_created ON public.loan_requests(created_at DESC);

-- Loan offers indexes
CREATE INDEX IF NOT EXISTS idx_loan_offers_request ON public.loan_offers(loan_request_id);
CREATE INDEX IF NOT EXISTS idx_loan_offers_lender ON public.loan_offers(lender_profile_id);
CREATE INDEX IF NOT EXISTS idx_loan_offers_status ON public.loan_offers(status);

-- Notifications index
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_borrower ON public.loan_payments(borrower_profile_id);
CREATE INDEX IF NOT EXISTS idx_payments_lender ON public.loan_payments(lender_profile_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.loan_payments(status);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check if tables exist and have data
DO $$
DECLARE
    v_table_count INT;
    v_profiles_count INT;
    v_countries_count INT;
    v_roles_count INT;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO v_table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    -- Count records
    SELECT COUNT(*) INTO v_profiles_count FROM public.profiles;
    SELECT COUNT(*) INTO v_countries_count FROM public.countries;
    SELECT COUNT(*) INTO v_roles_count FROM public.user_roles;
    
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Database Setup Verification:';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Total tables created: %', v_table_count;
    RAISE NOTICE 'Profiles count: %', v_profiles_count;
    RAISE NOTICE 'Countries count: %', v_countries_count;
    RAISE NOTICE 'User roles count: %', v_roles_count;
    RAISE NOTICE '=================================';
    
    IF v_countries_count = 0 THEN
        RAISE WARNING 'No countries found - data may not display correctly';
    END IF;
    
    IF v_roles_count = 0 THEN
        RAISE WARNING 'No user roles found - authentication may fail';
    END IF;
END $$;

-- Final message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Database setup completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run POPULATE_TEST_DATA.sql to add sample data';
    RAISE NOTICE '2. Run setup_chat_system.sql to enable chat features';
    RAISE NOTICE '3. Restart your application to see the changes';
END $$;