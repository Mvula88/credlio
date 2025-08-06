-- Populate Database Using Existing Auth Users
-- This script works with your existing Supabase auth users

-- ============================================
-- STEP 1: Check what we have
-- ============================================

DO $$
DECLARE
    v_auth_users_count INT;
    v_profiles_count INT;
    v_countries_count INT;
BEGIN
    -- Count auth users
    SELECT COUNT(*) INTO v_auth_users_count FROM auth.users;
    
    -- Count profiles
    SELECT COUNT(*) INTO v_profiles_count FROM public.profiles;
    
    -- Count countries
    SELECT COUNT(*) INTO v_countries_count FROM public.countries;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Current Database State:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Auth Users: %', v_auth_users_count;
    RAISE NOTICE 'Profiles: %', v_profiles_count;
    RAISE NOTICE 'Countries: %', v_countries_count;
    RAISE NOTICE '========================================';
    
    IF v_auth_users_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  No auth users found!';
        RAISE NOTICE '';
        RAISE NOTICE 'To create test data, you need to:';
        RAISE NOTICE '1. Sign up through your app, OR';
        RAISE NOTICE '2. Create users in Supabase Dashboard > Authentication > Users';
        RAISE NOTICE '';
    END IF;
END $$;

-- ============================================
-- STEP 2: Ensure countries exist
-- ============================================

INSERT INTO public.countries (code, name, currency_code) 
VALUES 
    ('ZA', 'South Africa', 'ZAR'),
    ('NG', 'Nigeria', 'NGN'),
    ('KE', 'Kenya', 'KES'),
    ('GH', 'Ghana', 'GHS'),
    ('EG', 'Egypt', 'EGP'),
    ('ET', 'Ethiopia', 'ETB'),
    ('UG', 'Uganda', 'UGX'),
    ('TZ', 'Tanzania', 'TZS')
ON CONFLICT (code) DO NOTHING;

-- Update flags if column exists
UPDATE public.countries SET flag_emoji = '🇿🇦', is_active = true WHERE code = 'ZA';
UPDATE public.countries SET flag_emoji = '🇳🇬', is_active = true WHERE code = 'NG';
UPDATE public.countries SET flag_emoji = '🇰🇪', is_active = true WHERE code = 'KE';
UPDATE public.countries SET flag_emoji = '🇬🇭', is_active = true WHERE code = 'GH';
UPDATE public.countries SET flag_emoji = '🇪🇬', is_active = true WHERE code = 'EG';
UPDATE public.countries SET flag_emoji = '🇪🇹', is_active = true WHERE code = 'ET';
UPDATE public.countries SET flag_emoji = '🇺🇬', is_active = true WHERE code = 'UG';
UPDATE public.countries SET flag_emoji = '🇹🇿', is_active = true WHERE code = 'TZ';

-- ============================================
-- STEP 3: Ensure user roles exist
-- ============================================

INSERT INTO public.user_roles (name, description) 
VALUES 
    ('borrower', 'Can request loans and manage repayments'),
    ('lender', 'Can offer loans and track borrowers'),
    ('admin', 'Platform administrator with full access'),
    ('country_admin', 'Administrator for specific country'),
    ('super_admin', 'Super administrator with system-wide access')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- STEP 4: Create profiles for existing auth users
-- ============================================

-- This creates profiles for any auth users that don't have profiles yet
INSERT INTO public.profiles (
    auth_user_id,
    email,
    full_name,
    role,
    country_id,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        split_part(au.email, '@', 1)
    ) as full_name,
    COALESCE(
        au.raw_user_meta_data->>'role',
        'borrower'  -- Default role
    ) as role,
    (SELECT id FROM public.countries WHERE code = 'ZA' LIMIT 1) as country_id,
    NOW(),
    NOW()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.auth_user_id = au.id
);

-- Update profiles with missing data
UPDATE public.profiles
SET 
    country_id = COALESCE(country_id, (SELECT id FROM public.countries WHERE code = 'ZA' LIMIT 1)),
    role = COALESCE(role, 'borrower'),
    reputation_score = COALESCE(reputation_score, 500),
    is_verified = COALESCE(is_verified, false),
    online_status = COALESCE(online_status, false),
    updated_at = NOW()
WHERE country_id IS NULL OR role IS NULL;

-- ============================================
-- STEP 5: Add sample data for existing profiles
-- ============================================

-- Create loan requests for borrowers who don't have any
INSERT INTO public.loan_requests (
    borrower_profile_id,
    amount,
    currency_code,
    purpose,
    duration_months,
    interest_rate,
    status,
    created_at,
    expires_at
)
SELECT 
    p.id,
    CASE 
        WHEN random() < 0.3 THEN 5000
        WHEN random() < 0.6 THEN 10000
        ELSE 20000
    END as amount,
    COALESCE(c.currency_code, 'ZAR') as currency_code,
    CASE floor(random() * 4)::int
        WHEN 0 THEN 'Business expansion'
        WHEN 1 THEN 'Emergency expenses'
        WHEN 2 THEN 'Education fees'
        ELSE 'Working capital'
    END as purpose,
    CASE 
        WHEN random() < 0.5 THEN 3
        ELSE 6
    END as duration_months,
    15 + (random() * 10)::int as interest_rate,
    'active' as status,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '6 days'
FROM public.profiles p
LEFT JOIN public.countries c ON p.country_id = c.id
WHERE p.role = 'borrower'
AND NOT EXISTS (
    SELECT 1 FROM public.loan_requests lr 
    WHERE lr.borrower_profile_id = p.id
)
LIMIT 3;

-- Create notifications for all profiles
INSERT INTO public.notifications (
    profile_id,
    title,
    message,
    type,
    is_read,
    created_at
)
SELECT 
    p.id,
    'Welcome to Credlio',
    'Your profile has been set up successfully. You can now start using the platform.',
    'system',
    false,
    NOW()
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications n 
    WHERE n.profile_id = p.id 
    AND n.type = 'system'
);

-- ============================================
-- STEP 6: Enable RLS and create policies
-- ============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Basic policies
DROP POLICY IF EXISTS "Public can view countries" ON public.countries;
CREATE POLICY "Public can view countries" ON public.countries
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view roles" ON public.user_roles;
CREATE POLICY "Public can view roles" ON public.user_roles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view loan requests" ON public.loan_requests;
CREATE POLICY "Users can view loan requests" ON public.loan_requests
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Borrowers can create loan requests" ON public.loan_requests;
CREATE POLICY "Borrowers can create loan requests" ON public.loan_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = borrower_profile_id 
            AND auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = profile_id 
            AND auth_user_id = auth.uid()
        )
    );

-- ============================================
-- STEP 7: Grant permissions
-- ============================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.countries TO anon;
GRANT SELECT ON public.user_roles TO anon;

-- ============================================
-- STEP 8: Final summary
-- ============================================

DO $$
DECLARE
    v_auth_users INT;
    v_profiles INT;
    v_countries INT;
    v_roles INT;
    v_requests INT;
    v_notifications INT;
BEGIN
    SELECT COUNT(*) INTO v_auth_users FROM auth.users;
    SELECT COUNT(*) INTO v_profiles FROM public.profiles;
    SELECT COUNT(*) INTO v_countries FROM public.countries;
    SELECT COUNT(*) INTO v_roles FROM public.user_roles;
    SELECT COUNT(*) INTO v_requests FROM public.loan_requests;
    SELECT COUNT(*) INTO v_notifications FROM public.notifications;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Auth Users: %', v_auth_users;
    RAISE NOTICE 'Profiles: %', v_profiles;
    RAISE NOTICE 'Countries: %', v_countries;
    RAISE NOTICE 'User Roles: %', v_roles;
    RAISE NOTICE 'Loan Requests: %', v_requests;
    RAISE NOTICE 'Notifications: %', v_notifications;
    RAISE NOTICE '========================================';
    
    IF v_profiles = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  No profiles created!';
        RAISE NOTICE '';
        RAISE NOTICE 'This means no auth users exist yet.';
        RAISE NOTICE 'Please sign up through your app first.';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '✅ Profiles created for all auth users!';
        RAISE NOTICE '';
        RAISE NOTICE 'Next steps:';
        RAISE NOTICE '1. Run setup_chat_system.sql for chat';
        RAISE NOTICE '2. Sign in to your app to test';
    END IF;
END $$;

-- Show existing profiles
SELECT 
    p.email,
    p.full_name,
    p.role,
    c.name as country,
    p.created_at
FROM public.profiles p
LEFT JOIN public.countries c ON p.country_id = c.id
ORDER BY p.created_at DESC
LIMIT 10;