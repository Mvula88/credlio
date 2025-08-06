-- Step by Step Database Fix
-- Run each section one at a time to identify where the error occurs

-- ============================================
-- SECTION 1: Basic tables without foreign keys
-- ============================================
BEGIN;

-- Create countries table first (no dependencies)
CREATE TABLE IF NOT EXISTS public.countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(2) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add optional columns to countries
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS flag_emoji VARCHAR(10);
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low';

-- Create user_roles table (no dependencies)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMIT;

-- ============================================
-- SECTION 2: Create/update profiles table
-- ============================================
BEGIN;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.countries(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'borrower';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS national_id VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_documents JSONB DEFAULT '[]';
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

COMMIT;

-- ============================================
-- SECTION 3: Insert base data
-- ============================================
BEGIN;

-- Insert countries
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
    ('DZ', 'Algeria', 'DZD')
ON CONFLICT (code) DO NOTHING;

-- Update country flags
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

-- Insert user roles
INSERT INTO public.user_roles (name, description) 
VALUES 
    ('borrower', 'Can request loans and manage repayments'),
    ('lender', 'Can offer loans and track borrowers'),
    ('admin', 'Platform administrator with full access'),
    ('country_admin', 'Administrator for specific country'),
    ('super_admin', 'Super administrator with system-wide access')
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- ============================================
-- SECTION 4: Create loan-related tables
-- ============================================
BEGIN;

-- Create loan_requests table
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

-- Create loan_offers table
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

-- Create loan_payments table
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

COMMIT;

-- ============================================
-- SECTION 5: Create other tables
-- ============================================
BEGIN;

-- Create notifications table
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

-- Create blacklisted_borrowers table
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

-- Create watchlist table
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lender_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    borrower_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lender_profile_id, borrower_profile_id)
);

-- Create smart_tags table
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

-- Create reputation_badges table
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

-- Create audit_logs table
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

-- Create borrower_invitations table
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

COMMIT;

-- ============================================
-- SECTION 6: Enable RLS (run separately)
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

-- ============================================
-- SECTION 7: Basic RLS policies (run after tables exist)
-- ============================================

-- Allow authenticated users to view profiles
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated" 
ON public.profiles FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth_user_id = auth.uid());

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth_user_id = auth.uid());

-- Allow viewing countries and roles
DROP POLICY IF EXISTS "Countries viewable by all" ON public.countries;
CREATE POLICY "Countries viewable by all" 
ON public.countries FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "User roles viewable by all" ON public.user_roles;
CREATE POLICY "User roles viewable by all" 
ON public.user_roles FOR SELECT 
USING (true);

-- Allow authenticated users to view loan requests
DROP POLICY IF EXISTS "Loan requests viewable by authenticated" ON public.loan_requests;
CREATE POLICY "Loan requests viewable by authenticated" 
ON public.loan_requests FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to view loan offers
DROP POLICY IF EXISTS "Loan offers viewable by authenticated" ON public.loan_offers;
CREATE POLICY "Loan offers viewable by authenticated" 
ON public.loan_offers FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow users to view their own notifications
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" 
ON public.notifications FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = profile_id 
        AND auth_user_id = auth.uid()
    )
);

-- ============================================
-- SECTION 8: Grants and functions
-- ============================================

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.countries TO anon;
GRANT SELECT ON public.user_roles TO anon;

-- Create helper function for new users
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

-- ============================================
-- SECTION 9: Create indexes
-- ============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_country_id ON public.profiles(country_id);

-- Loan requests indexes
CREATE INDEX IF NOT EXISTS idx_loan_requests_borrower ON public.loan_requests(borrower_profile_id);
CREATE INDEX IF NOT EXISTS idx_loan_requests_status ON public.loan_requests(status);

-- Loan offers indexes
CREATE INDEX IF NOT EXISTS idx_loan_offers_request ON public.loan_offers(loan_request_id);
CREATE INDEX IF NOT EXISTS idx_loan_offers_lender ON public.loan_offers(lender_profile_id);

-- Notifications index
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON public.notifications(profile_id);

-- ============================================
-- FINAL: Verification
-- ============================================

SELECT 
    'Setup Complete!' as status,
    (SELECT COUNT(*) FROM public.countries) as countries_count,
    (SELECT COUNT(*) FROM public.user_roles) as roles_count,
    (SELECT COUNT(*) FROM public.profiles) as profiles_count;