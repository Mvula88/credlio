-- Check and fix any references to countries NOT in your 16-country list
-- Your 16 countries: NG, KE, UG, ZA, GH, TZ, RW, ZM, NA, BW, MW, SN, ET, CM, SL, ZW

-- ============================================
-- STEP 1: Check for invalid country references
-- ============================================

-- Check profiles with invalid countries
SELECT 
    'Profiles with invalid countries:' as check_type,
    COUNT(*) as count
FROM public.profiles p
WHERE p.country_id IS NOT NULL
AND p.country_id NOT IN (
    SELECT id FROM public.countries 
    WHERE code IN ('NG', 'KE', 'UG', 'ZA', 'GH', 'TZ', 'RW', 'ZM', 'NA', 'BW', 'MW', 'SN', 'ET', 'CM', 'SL', 'ZW')
);

-- List any profiles with invalid countries
SELECT 
    p.id,
    p.email,
    p.full_name,
    c.name as invalid_country,
    c.code as invalid_code
FROM public.profiles p
JOIN public.countries c ON p.country_id = c.id
WHERE c.code NOT IN ('NG', 'KE', 'UG', 'ZA', 'GH', 'TZ', 'RW', 'ZM', 'NA', 'BW', 'MW', 'SN', 'ET', 'CM', 'SL', 'ZW');

-- ============================================
-- STEP 2: Fix invalid references
-- ============================================

-- Update profiles with invalid countries to default to South Africa
UPDATE public.profiles
SET country_id = (SELECT id FROM public.countries WHERE code = 'ZA' LIMIT 1)
WHERE country_id IN (
    SELECT id FROM public.countries 
    WHERE code NOT IN ('NG', 'KE', 'UG', 'ZA', 'GH', 'TZ', 'RW', 'ZM', 'NA', 'BW', 'MW', 'SN', 'ET', 'CM', 'SL', 'ZW')
);

-- Check loan_requests with invalid currencies
SELECT 
    'Loan requests with invalid currencies:' as check_type,
    COUNT(*) as count
FROM public.loan_requests
WHERE currency_code NOT IN (
    SELECT currency_code FROM public.countries 
    WHERE code IN ('NG', 'KE', 'UG', 'ZA', 'GH', 'TZ', 'RW', 'ZM', 'NA', 'BW', 'MW', 'SN', 'ET', 'CM', 'SL', 'ZW')
);

-- Fix loan requests with invalid currencies
UPDATE public.loan_requests lr
SET currency_code = (
    SELECT c.currency_code 
    FROM public.profiles p
    JOIN public.countries c ON p.country_id = c.id
    WHERE p.id = lr.borrower_profile_id
    LIMIT 1
)
WHERE currency_code NOT IN (
    'NGN', 'KES', 'UGX', 'ZAR', 'GHS', 'TZS', 'RWF', 'ZMW', 
    'NAD', 'BWP', 'MWK', 'XOF', 'ETB', 'XAF', 'SLL', 'ZWL'
);

-- ============================================
-- STEP 3: Remove invalid countries from database
-- ============================================

-- Delete countries not in your list
DELETE FROM public.countries 
WHERE code NOT IN ('NG', 'KE', 'UG', 'ZA', 'GH', 'TZ', 'RW', 'ZM', 'NA', 'BW', 'MW', 'SN', 'ET', 'CM', 'SL', 'ZW');

-- ============================================
-- STEP 4: Verify everything is correct
-- ============================================

DO $$
DECLARE
    v_total_countries INT;
    v_valid_profiles INT;
    v_invalid_profiles INT;
    v_valid_currencies INT;
    v_invalid_currencies INT;
BEGIN
    -- Count countries
    SELECT COUNT(*) INTO v_total_countries FROM public.countries;
    
    -- Count valid profiles
    SELECT COUNT(*) INTO v_valid_profiles 
    FROM public.profiles p
    WHERE p.country_id IN (
        SELECT id FROM public.countries 
        WHERE code IN ('NG', 'KE', 'UG', 'ZA', 'GH', 'TZ', 'RW', 'ZM', 'NA', 'BW', 'MW', 'SN', 'ET', 'CM', 'SL', 'ZW')
    ) OR p.country_id IS NULL;
    
    -- Count invalid profiles
    SELECT COUNT(*) INTO v_invalid_profiles 
    FROM public.profiles p
    WHERE p.country_id IS NOT NULL 
    AND p.country_id NOT IN (
        SELECT id FROM public.countries 
        WHERE code IN ('NG', 'KE', 'UG', 'ZA', 'GH', 'TZ', 'RW', 'ZM', 'NA', 'BW', 'MW', 'SN', 'ET', 'CM', 'SL', 'ZW')
    );
    
    -- Count valid loan request currencies
    SELECT COUNT(*) INTO v_valid_currencies
    FROM public.loan_requests
    WHERE currency_code IN (
        'NGN', 'KES', 'UGX', 'ZAR', 'GHS', 'TZS', 'RWF', 'ZMW', 
        'NAD', 'BWP', 'MWK', 'XOF', 'ETB', 'XAF', 'SLL', 'ZWL'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ COUNTRY REFERENCE CHECK COMPLETE';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Countries in database: %', v_total_countries;
    RAISE NOTICE 'Valid profile countries: %', v_valid_profiles;
    RAISE NOTICE 'Invalid profile countries: %', v_invalid_profiles;
    RAISE NOTICE 'Valid loan currencies: %', v_valid_currencies;
    RAISE NOTICE '================================================';
    
    IF v_total_countries = 16 AND v_invalid_profiles = 0 THEN
        RAISE NOTICE '✅ All references are valid!';
    ELSE
        IF v_total_countries != 16 THEN
            RAISE NOTICE '⚠️  Warning: Have % countries instead of 16', v_total_countries;
        END IF;
        IF v_invalid_profiles > 0 THEN
            RAISE NOTICE '⚠️  Warning: % profiles still have invalid countries', v_invalid_profiles;
        END IF;
    END IF;
END $$;

-- ============================================
-- STEP 5: Show final country list
-- ============================================

SELECT 
    '================================================' as info;
    
SELECT 
    'YOUR 16 COUNTRIES - FINAL VERIFICATION' as info;
    
SELECT 
    '================================================' as info;

SELECT 
    code,
    name,
    currency_code,
    flag_emoji,
    (SELECT COUNT(*) FROM public.profiles WHERE country_id = c.id) as users_count,
    (SELECT COUNT(*) FROM public.loan_requests lr 
     JOIN public.profiles p ON lr.borrower_profile_id = p.id 
     WHERE p.country_id = c.id) as loan_requests_count
FROM public.countries c
ORDER BY name;

-- Check for any remaining invalid data
SELECT 
    '================================================' as info;
    
SELECT 
    'CHECKING FOR INVALID DATA...' as info;

-- Check if any profiles have home_country or detected_country not in list
SELECT 
    'Profiles with invalid home_country:' as check,
    COUNT(*) as count
FROM public.profiles
WHERE home_country IS NOT NULL 
AND home_country NOT IN ('NG', 'KE', 'UG', 'ZA', 'GH', 'TZ', 'RW', 'ZM', 'NA', 'BW', 'MW', 'SN', 'ET', 'CM', 'SL', 'ZW');

-- Fix invalid home_country
UPDATE public.profiles
SET home_country = NULL
WHERE home_country NOT IN ('NG', 'KE', 'UG', 'ZA', 'GH', 'TZ', 'RW', 'ZM', 'NA', 'BW', 'MW', 'SN', 'ET', 'CM', 'SL', 'ZW');

-- Fix invalid detected_country
UPDATE public.profiles
SET detected_country = NULL
WHERE detected_country NOT IN ('NG', 'KE', 'UG', 'ZA', 'GH', 'TZ', 'RW', 'ZM', 'NA', 'BW', 'MW', 'SN', 'ET', 'CM', 'SL', 'ZW');