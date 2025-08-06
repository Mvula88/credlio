-- Setup EXACTLY the 16 countries you specified for Credlio
-- Nigeria, Kenya, Uganda, South Africa, Ghana, Tanzania, Rwanda, Zambia,
-- Namibia, Botswana, Malawi, Senegal, Ethiopia, Cameroon, Sierra Leone, Zimbabwe

-- ============================================
-- First, clear any extra countries
-- ============================================

DELETE FROM public.countries 
WHERE code NOT IN ('NG', 'KE', 'UG', 'ZA', 'GH', 'TZ', 'RW', 'ZM', 'NA', 'BW', 'MW', 'SN', 'ET', 'CM', 'SL', 'ZW');

-- ============================================
-- Add columns if they don't exist
-- ============================================

ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS flag_emoji VARCHAR(10);
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low';
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS phone_code VARCHAR(10);
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS region VARCHAR(50);

-- ============================================
-- Insert/Update YOUR EXACT 16 countries
-- ============================================

INSERT INTO public.countries (name, code, currency_code, flag_emoji, is_active, risk_level, phone_code, region) 
VALUES 
    -- West Africa (5 countries)
    ('Nigeria', 'NG', 'NGN', '🇳🇬', true, 'medium', '+234', 'West Africa'),
    ('Ghana', 'GH', 'GHS', '🇬🇭', true, 'low', '+233', 'West Africa'),
    ('Senegal', 'SN', 'XOF', '🇸🇳', true, 'low', '+221', 'West Africa'),
    ('Cameroon', 'CM', 'XAF', '🇨🇲', true, 'medium', '+237', 'Central Africa'),
    ('Sierra Leone', 'SL', 'SLL', '🇸🇱', true, 'high', '+232', 'West Africa'),
    
    -- East Africa (5 countries)
    ('Kenya', 'KE', 'KES', '🇰🇪', true, 'low', '+254', 'East Africa'),
    ('Uganda', 'UG', 'UGX', '🇺🇬', true, 'low', '+256', 'East Africa'),
    ('Tanzania', 'TZ', 'TZS', '🇹🇿', true, 'low', '+255', 'East Africa'),
    ('Rwanda', 'RW', 'RWF', '🇷🇼', true, 'low', '+250', 'East Africa'),
    ('Ethiopia', 'ET', 'ETB', '🇪🇹', true, 'medium', '+251', 'East Africa'),
    
    -- Southern Africa (6 countries)
    ('South Africa', 'ZA', 'ZAR', '🇿🇦', true, 'low', '+27', 'Southern Africa'),
    ('Zambia', 'ZM', 'ZMW', '🇿🇲', true, 'medium', '+260', 'Southern Africa'),
    ('Namibia', 'NA', 'NAD', '🇳🇦', true, 'low', '+264', 'Southern Africa'),
    ('Botswana', 'BW', 'BWP', '🇧🇼', true, 'low', '+267', 'Southern Africa'),
    ('Malawi', 'MW', 'MWK', '🇲🇼', true, 'medium', '+265', 'Southern Africa'),
    ('Zimbabwe', 'ZW', 'ZWL', '🇿🇼', true, 'high', '+263', 'Southern Africa')
ON CONFLICT (code) DO UPDATE
SET 
    name = EXCLUDED.name,
    currency_code = EXCLUDED.currency_code,
    flag_emoji = EXCLUDED.flag_emoji,
    is_active = EXCLUDED.is_active,
    risk_level = EXCLUDED.risk_level,
    phone_code = EXCLUDED.phone_code,
    region = EXCLUDED.region;

-- Remove Morocco, Algeria, Egypt, Angola, Ivory Coast (not in your list)
DELETE FROM public.countries 
WHERE code IN ('MA', 'DZ', 'EG', 'AO', 'CI');

-- ============================================
-- Verify we have exactly your 16 countries
-- ============================================

DO $$
DECLARE
    v_count INT;
    v_west_africa INT;
    v_east_africa INT;
    v_southern_africa INT;
    v_central_africa INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.countries;
    SELECT COUNT(*) INTO v_west_africa FROM public.countries WHERE region = 'West Africa';
    SELECT COUNT(*) INTO v_east_africa FROM public.countries WHERE region = 'East Africa';
    SELECT COUNT(*) INTO v_southern_africa FROM public.countries WHERE region = 'Southern Africa';
    SELECT COUNT(*) INTO v_central_africa FROM public.countries WHERE region IN ('Central Africa');
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ YOUR 16 COUNTRIES SETUP COMPLETE';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total countries: %', v_count;
    RAISE NOTICE '';
    RAISE NOTICE 'By Region:';
    RAISE NOTICE '  • Southern Africa: % (ZA, ZW, ZM, NA, BW, MW)', v_southern_africa;
    RAISE NOTICE '  • East Africa: % (KE, UG, TZ, RW, ET)', v_east_africa;
    RAISE NOTICE '  • West Africa: % (NG, GH, SN, SL)', v_west_africa;
    RAISE NOTICE '  • Central Africa: % (CM)', v_central_africa;
    RAISE NOTICE '================================================';
    
    IF v_count = 16 THEN
        RAISE NOTICE '✅ Perfect! Exactly 16 countries as requested.';
    ELSE
        RAISE NOTICE '⚠️  Count mismatch: Have % countries, expected 16', v_count;
    END IF;
END $$;

-- ============================================
-- Show your 16 countries in order
-- ============================================

SELECT 
    ROW_NUMBER() OVER (ORDER BY name) as "#",
    name,
    code,
    currency_code,
    flag_emoji,
    region,
    risk_level
FROM public.countries
WHERE code IN ('NG', 'KE', 'UG', 'ZA', 'GH', 'TZ', 'RW', 'ZM', 'NA', 'BW', 'MW', 'SN', 'ET', 'CM', 'SL', 'ZW')
ORDER BY name;

-- ============================================
-- Summary by currency
-- ============================================

SELECT 
    currency_code as currency,
    COUNT(*) as countries_using,
    STRING_AGG(flag_emoji || ' ' || name, ', ' ORDER BY name) as countries
FROM public.countries
GROUP BY currency_code
ORDER BY COUNT(*) DESC;

-- ============================================
-- Insert user roles if not exists
-- ============================================

INSERT INTO public.user_roles (name, description) 
VALUES 
    ('borrower', 'Can request loans and manage repayments'),
    ('lender', 'Can offer loans and track borrowers'),
    ('admin', 'Platform administrator with full access'),
    ('country_admin', 'Administrator for specific country'),
    ('super_admin', 'Super administrator with system-wide access')
ON CONFLICT (name) DO NOTHING;