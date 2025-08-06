-- Insert ONLY the specific countries you want to work with
-- Based on your requirements for Credlio

-- ============================================
-- Add columns if they don't exist
-- ============================================

ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS flag_emoji VARCHAR(10);
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low';
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS phone_code VARCHAR(10);
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS region VARCHAR(50);

-- ============================================
-- Insert YOUR specific countries
-- ============================================

INSERT INTO public.countries (code, name, currency_code, flag_emoji, is_active, risk_level, phone_code, region) 
VALUES 
    -- Your primary markets
    ('ZA', 'South Africa', 'ZAR', '🇿🇦', true, 'low', '+27', 'Southern Africa'),
    ('NG', 'Nigeria', 'NGN', '🇳🇬', true, 'medium', '+234', 'West Africa'),
    ('KE', 'Kenya', 'KES', '🇰🇪', true, 'low', '+254', 'East Africa'),
    ('GH', 'Ghana', 'GHS', '🇬🇭', true, 'low', '+233', 'West Africa'),
    ('EG', 'Egypt', 'EGP', '🇪🇬', true, 'medium', '+20', 'North Africa'),
    ('ET', 'Ethiopia', 'ETB', '🇪🇹', true, 'medium', '+251', 'East Africa'),
    ('UG', 'Uganda', 'UGX', '🇺🇬', true, 'low', '+256', 'East Africa'),
    ('TZ', 'Tanzania', 'TZS', '🇹🇿', true, 'low', '+255', 'East Africa'),
    ('MA', 'Morocco', 'MAD', '🇲🇦', true, 'low', '+212', 'North Africa'),
    ('DZ', 'Algeria', 'DZD', '🇩🇿', true, 'medium', '+213', 'North Africa'),
    ('AO', 'Angola', 'AOA', '🇦🇴', true, 'high', '+244', 'Central Africa'),
    ('CM', 'Cameroon', 'XAF', '🇨🇲', true, 'medium', '+237', 'Central Africa'),
    ('CI', 'Ivory Coast', 'XOF', '🇨🇮', true, 'medium', '+225', 'West Africa'),
    ('SN', 'Senegal', 'XOF', '🇸🇳', true, 'low', '+221', 'West Africa'),
    ('ZW', 'Zimbabwe', 'ZWL', '🇿🇼', true, 'high', '+263', 'Southern Africa'),
    ('ZM', 'Zambia', 'ZMW', '🇿🇲', true, 'medium', '+260', 'Southern Africa')
ON CONFLICT (code) DO UPDATE
SET 
    name = EXCLUDED.name,
    currency_code = EXCLUDED.currency_code,
    flag_emoji = EXCLUDED.flag_emoji,
    is_active = EXCLUDED.is_active,
    risk_level = EXCLUDED.risk_level,
    phone_code = EXCLUDED.phone_code,
    region = EXCLUDED.region;

-- ============================================
-- Verify YOUR countries were added
-- ============================================

DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.countries;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ YOUR SPECIFIC COUNTRIES SETUP COMPLETE';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total countries in database: %', v_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Your target markets:';
    RAISE NOTICE '  • PRIMARY: South Africa, Nigeria, Kenya, Ghana';
    RAISE NOTICE '  • SECONDARY: Egypt, Ethiopia, Uganda, Tanzania';
    RAISE NOTICE '  • EXPANSION: Morocco, Algeria, Angola, Cameroon';
    RAISE NOTICE '  • ADDITIONAL: Ivory Coast, Senegal, Zimbabwe, Zambia';
    RAISE NOTICE '================================================';
END $$;

-- Show your countries with details
SELECT 
    code,
    name,
    flag_emoji,
    currency_code,
    risk_level,
    phone_code,
    region
FROM public.countries
ORDER BY 
    CASE code
        -- Primary markets first
        WHEN 'ZA' THEN 1
        WHEN 'NG' THEN 2
        WHEN 'KE' THEN 3
        WHEN 'GH' THEN 4
        -- Then secondary
        WHEN 'EG' THEN 5
        WHEN 'ET' THEN 6
        WHEN 'UG' THEN 7
        WHEN 'TZ' THEN 8
        -- Then others
        ELSE 9
    END,
    name;

-- ============================================
-- Insert user roles
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
-- Summary by region
-- ============================================

SELECT 
    region,
    COUNT(*) as countries,
    STRING_AGG(flag_emoji, ' ') as flags,
    STRING_AGG(name, ', ') as country_names
FROM public.countries
GROUP BY region
ORDER BY COUNT(*) DESC;