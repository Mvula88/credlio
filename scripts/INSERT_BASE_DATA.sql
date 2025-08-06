-- Insert Base Data Only
-- Run this AFTER adding missing columns

-- ============================================
-- Insert Countries (if not exists)
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
    ('TZ', 'Tanzania', 'TZS'),
    ('MA', 'Morocco', 'MAD'),
    ('DZ', 'Algeria', 'DZD'),
    ('AO', 'Angola', 'AOA'),
    ('CM', 'Cameroon', 'XAF'),
    ('CI', 'Ivory Coast', 'XOF'),
    ('SN', 'Senegal', 'XOF'),
    ('ZW', 'Zimbabwe', 'ZWL'),
    ('ZM', 'Zambia', 'ZMW')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Insert User Roles (if not exists)
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
-- Create basic RLS policies (safe)
-- ============================================

-- Enable RLS on tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop and recreate basic policies
DROP POLICY IF EXISTS "Countries viewable by all" ON public.countries;
CREATE POLICY "Countries viewable by all" 
ON public.countries FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "User roles viewable by all" ON public.user_roles;
CREATE POLICY "User roles viewable by all" 
ON public.user_roles FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated" 
ON public.profiles FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth_user_id = auth.uid());

-- ============================================
-- Grant permissions
-- ============================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.countries TO anon;
GRANT SELECT ON public.user_roles TO anon;

-- ============================================
-- Create profile trigger for new users
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        auth_user_id, 
        email, 
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id, 
        NEW.email, 
        NOW(), 
        NOW()
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Verify setup
-- ============================================

SELECT 
    'Data Insert Complete!' as status,
    (SELECT COUNT(*) FROM public.countries) as countries_count,
    (SELECT COUNT(*) FROM public.user_roles) as roles_count,
    (SELECT COUNT(*) FROM public.profiles) as profiles_count;

-- Show sample countries with flags
SELECT 
    code,
    name,
    currency_code,
    flag_emoji,
    is_active,
    risk_level
FROM public.countries
ORDER BY name
LIMIT 10;