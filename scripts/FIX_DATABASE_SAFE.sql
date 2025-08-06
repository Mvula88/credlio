-- Safe Database Fix for Credlio Platform
-- This script safely updates existing tables and adds missing columns

-- ============================================
-- STEP 1: Add missing columns to existing tables
-- ============================================

-- Add missing columns to countries table if they don't exist
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS flag_emoji VARCHAR(10);
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low';

-- Ensure countries table has all required columns
CREATE TABLE IF NOT EXISTS public.countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(2) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to profiles if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.countries(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'borrower';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 500;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_borrowed DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_repaid DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loans_taken INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loans_defaulted INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_lent DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_recovered DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_loans_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS borrowers_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS online_status BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_traveling BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_country VARCHAR(2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS detected_country VARCHAR(2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50);

-- Ensure profiles table exists with basic structure
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone_number VARCHAR(50),
    address TEXT,
    date_of_birth DATE,
    national_id VARCHAR(100),
    profile_picture_url TEXT,
    is_verified BOOLEAN DEFAULT false,
    verification_documents JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
-- STEP 2: Insert essential data (safe upsert)
-- ============================================

-- Insert countries with safe column selection
INSERT INTO public.countries (code, name, currency_code) 
VALUES 
    ('ZA', 'South Africa', 'ZAR'),
    ('NG', 'Nigeria', 'NGN'),
    ('KE', 'Kenya', 'KES'),
    ('GH', 'Ghana', 'GHS'),
    ('EG', 'Egypt', 'EGP'),
    ('ET', 'Ethiopia', 'ETB'),
    ('UG', 'Uganda', 'UGX'),
    ('TZ', 'Tanzania', 'TZS'),
    ('MA', 'Morocco', 'MAD'),
    ('DZ', 'Algeria', 'DZD'),
    ('AO', 'Angola', 'AOA'),
    ('CM', 'Cameroon', 'XAF'),
    ('CI', 'Ivory Coast', 'XOF'),
    ('SN', 'Senegal', 'XOF'),
    ('ZW', 'Zimbabwe', 'ZWL'),
    ('ZM', 'Zambia', 'ZMW')
ON CONFLICT (code) DO UPDATE
SET 
    name = EXCLUDED.name,
    currency_code = EXCLUDED.currency_code;

-- Now update the additional columns if they exist
UPDATE public.countries SET flag_emoji = '🇿🇦', is_active = true, risk_level = 'low' WHERE code = 'ZA';
UPDATE public.countries SET flag_emoji = '🇳🇬', is_active = true, risk_level = 'medium' WHERE code = 'NG';
UPDATE public.countries SET flag_emoji = '🇰🇪', is_active = true, risk_level = 'low' WHERE code = 'KE';
UPDATE public.countries SET flag_emoji = '🇬🇭', is_active = true, risk_level = 'low' WHERE code = 'GH';
UPDATE public.countries SET flag_emoji = '🇪🇬', is_active = true, risk_level = 'medium' WHERE code = 'EG';
UPDATE public.countries SET flag_emoji = '🇪🇹', is_active = true, risk_level = 'medium' WHERE code = 'ET';
UPDATE public.countries SET flag_emoji = '🇺🇬', is_active = true, risk_level = 'low' WHERE code = 'UG';
UPDATE public.countries SET flag_emoji = '🇹🇿', is_active = true, risk_level = 'low' WHERE code = 'TZ';
UPDATE public.countries SET flag_emoji = '🇲🇦', is_active = true, risk_level = 'low' WHERE code = 'MA';
UPDATE public.countries SET flag_emoji = '🇩🇿', is_active = true, risk_level = 'medium' WHERE code = 'DZ';
UPDATE public.countries SET flag_emoji = '🇦🇴', is_active = true, risk_level = 'high' WHERE code = 'AO';
UPDATE public.countries SET flag_emoji = '🇨🇲', is_active = true, risk_level = 'medium' WHERE code = 'CM';
UPDATE public.countries SET flag_emoji = '🇨🇮', is_active = true, risk_level = 'medium' WHERE code = 'CI';
UPDATE public.countries SET flag_emoji = '🇸🇳', is_active = true, risk_level = 'low' WHERE code = 'SN';
UPDATE public.countries SET flag_emoji = '🇿🇼', is_active = true, risk_level = 'high' WHERE code = 'ZW';
UPDATE public.countries SET flag_emoji = '🇿🇲', is_active = true, risk_level = 'medium' WHERE code = 'ZM';

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
-- STEP 3: Enable RLS (safe - won't error if already enabled)
-- ============================================

DO $$ 
BEGIN
    -- Enable RLS on all tables (safe - won't error if already enabled)
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
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- ============================================
-- STEP 4: Create RLS policies (drop and recreate to ensure consistency)
-- ============================================

-- Drop existing policies safely
DO $$ 
BEGIN
    -- Profiles policies
    DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    
    -- Loan requests policies
    DROP POLICY IF EXISTS "Loan requests viewable by authenticated" ON public.loan_requests;
    DROP POLICY IF EXISTS "Borrowers can create loan requests" ON public.loan_requests;
    DROP POLICY IF EXISTS "Borrowers can update own requests" ON public.loan_requests;
    
    -- Other policies
    DROP POLICY IF EXISTS "Loan offers viewable by authenticated" ON public.loan_offers;
    DROP POLICY IF EXISTS "Lenders can create offers" ON public.loan_offers;
    DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Countries viewable by all" ON public.countries;
    DROP POLICY IF EXISTS "User roles viewable by all" ON public.user_roles;
    DROP POLICY IF EXISTS "Blacklist viewable by authenticated" ON public.blacklisted_borrowers;
    DROP POLICY IF EXISTS "Lenders view own watchlist" ON public.watchlist;
    DROP POLICY IF EXISTS "Lenders manage own watchlist" ON public.watchlist;
    DROP POLICY IF EXISTS "Tags viewable by profile owner" ON public.smart_tags;
    DROP POLICY IF EXISTS "Badges viewable by all" ON public.reputation_badges;
    DROP POLICY IF EXISTS "Audit logs for admins" ON public.audit_logs;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create comprehensive policies

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

-- Countries and roles - viewable by all
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
-- STEP 5: Create helper functions
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
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_loan_payments_updated_at ON public.loan_payments;
CREATE TRIGGER update_loan_payments_updated_at 
    BEFORE UPDATE ON public.loan_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- STEP 6: Grant permissions
-- ============================================

-- Grant all permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant select on countries and roles to anon (for signup)
GRANT SELECT ON public.countries TO anon;
GRANT SELECT ON public.user_roles TO anon;

-- ============================================
-- STEP 7: Create indexes for performance
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
    
    RAISE NOTICE '';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Database Setup Verification:';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Total tables: %', v_table_count;
    RAISE NOTICE 'Profiles: %', v_profiles_count;
    RAISE NOTICE 'Countries: %', v_countries_count;
    RAISE NOTICE 'User roles: %', v_roles_count;
    RAISE NOTICE '=================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Database setup completed!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Run POPULATE_TEST_DATA.sql for sample data';
END $$;