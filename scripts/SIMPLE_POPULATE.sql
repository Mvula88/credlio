-- Simple Population Script
-- This is a simplified version that's less error-prone

-- ============================================
-- STEP 1: Ensure unique constraints exist
-- ============================================

-- Check and add email constraint
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_email_unique UNIQUE (email);
    EXCEPTION
        WHEN duplicate_table THEN NULL;
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- Check and add auth_user_id constraint
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_auth_user_id_unique UNIQUE (auth_user_id);
    EXCEPTION
        WHEN duplicate_table THEN NULL;
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ============================================
-- STEP 2: Insert countries if missing
-- ============================================

INSERT INTO public.countries (code, name, currency_code) 
VALUES 
    ('ZA', 'South Africa', 'ZAR'),
    ('NG', 'Nigeria', 'NGN'),
    ('KE', 'Kenya', 'KES'),
    ('GH', 'Ghana', 'GHS'),
    ('EG', 'Egypt', 'EGP')
ON CONFLICT (code) DO NOTHING;

-- Update flags if column exists
UPDATE public.countries SET flag_emoji = '🇿🇦' WHERE code = 'ZA' AND flag_emoji IS NULL;
UPDATE public.countries SET flag_emoji = '🇳🇬' WHERE code = 'NG' AND flag_emoji IS NULL;
UPDATE public.countries SET flag_emoji = '🇰🇪' WHERE code = 'KE' AND flag_emoji IS NULL;
UPDATE public.countries SET flag_emoji = '🇬🇭' WHERE code = 'GH' AND flag_emoji IS NULL;
UPDATE public.countries SET flag_emoji = '🇪🇬' WHERE code = 'EG' AND flag_emoji IS NULL;

-- ============================================
-- STEP 3: Insert user roles if missing
-- ============================================

INSERT INTO public.user_roles (name, description) 
VALUES 
    ('borrower', 'Can request loans and manage repayments'),
    ('lender', 'Can offer loans and track borrowers'),
    ('admin', 'Platform administrator with full access')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- STEP 4: Create test profiles
-- ============================================

-- Get a country ID for test data
DO $$
DECLARE
    v_country_id UUID;
    v_existing_count INT;
BEGIN
    -- Get South Africa's ID
    SELECT id INTO v_country_id 
    FROM public.countries 
    WHERE code = 'ZA' 
    LIMIT 1;
    
    -- Count existing profiles
    SELECT COUNT(*) INTO v_existing_count 
    FROM public.profiles;
    
    -- Only add test data if we have less than 3 profiles
    IF v_existing_count < 3 THEN
        
        -- Test Borrower 1
        INSERT INTO public.profiles (
            auth_user_id,
            email,
            full_name,
            role,
            country_id
        ) 
        SELECT 
            gen_random_uuid(),
            'test.borrower1@example.com',
            'Test Borrower One',
            'borrower',
            v_country_id
        WHERE NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE email = 'test.borrower1@example.com'
        );
        
        -- Test Lender 1
        INSERT INTO public.profiles (
            auth_user_id,
            email,
            full_name,
            role,
            country_id
        ) 
        SELECT 
            gen_random_uuid(),
            'test.lender1@example.com',
            'Test Lender One',
            'lender',
            v_country_id
        WHERE NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE email = 'test.lender1@example.com'
        );
        
        -- Test Admin
        INSERT INTO public.profiles (
            auth_user_id,
            email,
            full_name,
            role,
            country_id
        ) 
        SELECT 
            gen_random_uuid(),
            'test.admin@example.com',
            'Test Admin',
            'admin',
            v_country_id
        WHERE NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE email = 'test.admin@example.com'
        );
        
        RAISE NOTICE 'Test profiles created';
    ELSE
        RAISE NOTICE 'Profiles exist, skipping test data';
    END IF;
END $$;

-- ============================================
-- STEP 5: Create sample loan requests
-- ============================================

-- Add loan requests for borrowers
INSERT INTO public.loan_requests (
    borrower_profile_id,
    amount,
    currency_code,
    purpose,
    duration_months,
    status
)
SELECT 
    p.id,
    10000,
    'ZAR',
    'Business expansion',
    6,
    'active'
FROM public.profiles p
WHERE p.role = 'borrower'
AND NOT EXISTS (
    SELECT 1 FROM public.loan_requests lr 
    WHERE lr.borrower_profile_id = p.id
)
LIMIT 2;

-- ============================================
-- STEP 6: Create sample notifications
-- ============================================

-- Add welcome notifications
INSERT INTO public.notifications (
    profile_id,
    title,
    message,
    type,
    is_read
)
SELECT 
    p.id,
    'Welcome to Credlio',
    'Your account has been created successfully',
    'system',
    false
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications n 
    WHERE n.profile_id = p.id
    AND n.type = 'system'
)
LIMIT 5;

-- ============================================
-- STEP 7: Enable basic RLS
-- ============================================

-- Enable RLS on main tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create basic policies
DROP POLICY IF EXISTS "Public read countries" ON public.countries;
CREATE POLICY "Public read countries" ON public.countries
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read roles" ON public.user_roles;
CREATE POLICY "Public read roles" ON public.user_roles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated read profiles" ON public.profiles;
CREATE POLICY "Authenticated read profiles" ON public.profiles
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated read loan requests" ON public.loan_requests;
CREATE POLICY "Authenticated read loan requests" ON public.loan_requests
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================
-- STEP 8: Grant permissions
-- ============================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.countries TO anon;
GRANT SELECT ON public.user_roles TO anon;

-- ============================================
-- FINAL: Show summary
-- ============================================

DO $$
DECLARE
    v_countries INT;
    v_roles INT;
    v_profiles INT;
    v_requests INT;
    v_notifications INT;
BEGIN
    SELECT COUNT(*) INTO v_countries FROM public.countries;
    SELECT COUNT(*) INTO v_roles FROM public.user_roles;
    SELECT COUNT(*) INTO v_profiles FROM public.profiles;
    SELECT COUNT(*) INTO v_requests FROM public.loan_requests;
    SELECT COUNT(*) INTO v_notifications FROM public.notifications;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database Population Summary:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Countries: %', v_countries;
    RAISE NOTICE 'User Roles: %', v_roles;
    RAISE NOTICE 'Profiles: %', v_profiles;
    RAISE NOTICE 'Loan Requests: %', v_requests;
    RAISE NOTICE 'Notifications: %', v_notifications;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Setup complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Run setup_chat_system.sql for chat features';
END $$;