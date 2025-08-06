-- Fix the 5 countries with missing data
-- Updates Rwanda, Namibia, Botswana, Malawi, Sierra Leone

-- ============================================
-- Update the 5 countries that have NULL regions and flags
-- ============================================

-- Rwanda (East Africa)
UPDATE public.countries 
SET 
    flag_emoji = '🇷🇼',
    region = 'East Africa',
    phone_code = '+250',
    risk_level = 'low',
    is_active = true
WHERE name = 'Rwanda';

-- Namibia (Southern Africa)
UPDATE public.countries 
SET 
    flag_emoji = '🇳🇦',
    region = 'Southern Africa',
    phone_code = '+264',
    risk_level = 'low',
    is_active = true
WHERE name = 'Namibia';

-- Botswana (Southern Africa)
UPDATE public.countries 
SET 
    flag_emoji = '🇧🇼',
    region = 'Southern Africa',
    phone_code = '+267',
    risk_level = 'low',
    is_active = true
WHERE name = 'Botswana';

-- Malawi (Southern Africa)
UPDATE public.countries 
SET 
    flag_emoji = '🇲🇼',
    region = 'Southern Africa',
    phone_code = '+265',
    risk_level = 'medium',
    is_active = true
WHERE name = 'Malawi';

-- Sierra Leone (West Africa)
UPDATE public.countries 
SET 
    flag_emoji = '🇸🇱',
    region = 'West Africa',
    phone_code = '+232',
    risk_level = 'high',
    is_active = true
WHERE name = 'Sierra Leone';

-- If these countries don't have codes, let's ensure they're properly inserted
INSERT INTO public.countries (code, name, currency_code, flag_emoji, is_active, risk_level, phone_code, region)
VALUES 
    ('RW', 'Rwanda', 'RWF', '🇷🇼', true, 'low', '+250', 'East Africa'),
    ('NA', 'Namibia', 'NAD', '🇳🇦', true, 'low', '+264', 'Southern Africa'),
    ('BW', 'Botswana', 'BWP', '🇧🇼', true, 'low', '+267', 'Southern Africa'),
    ('MW', 'Malawi', 'MWK', '🇲🇼', true, 'medium', '+265', 'Southern Africa'),
    ('SL', 'Sierra Leone', 'SLL', '🇸🇱', true, 'high', '+232', 'West Africa')
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
-- Verify all countries now have complete data
-- ============================================

DO $$
DECLARE
    v_total INT;
    v_with_flags INT;
    v_with_regions INT;
    v_complete INT;
BEGIN
    SELECT COUNT(*) INTO v_total FROM public.countries;
    SELECT COUNT(*) INTO v_with_flags FROM public.countries WHERE flag_emoji IS NOT NULL;
    SELECT COUNT(*) INTO v_with_regions FROM public.countries WHERE region IS NOT NULL;
    SELECT COUNT(*) INTO v_complete FROM public.countries WHERE flag_emoji IS NOT NULL AND region IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '📊 COUNTRY DATA STATUS';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total countries: %', v_total;
    RAISE NOTICE 'With flags: %', v_with_flags;
    RAISE NOTICE 'With regions: %', v_with_regions;
    RAISE NOTICE 'Complete (flags + regions): %', v_complete;
    RAISE NOTICE '================================================';
    
    IF v_complete = v_total THEN
        RAISE NOTICE '✅ All countries now have complete data!';
    ELSE
        RAISE NOTICE '⚠️ Some countries still missing data';
    END IF;
END $$;

-- Show updated summary by region
SELECT 
    region,
    COUNT(*) as countries,
    STRING_AGG(flag_emoji, ' ') as flags,
    STRING_AGG(name, ', ' ORDER BY name) as country_names
FROM public.countries
GROUP BY region
ORDER BY COUNT(*) DESC;

-- Check if any countries still have missing data
SELECT 
    code,
    name,
    currency_code,
    flag_emoji,
    region,
    CASE 
        WHEN flag_emoji IS NULL THEN '❌ Missing flag'
        WHEN region IS NULL THEN '❌ Missing region'
        ELSE '✅ Complete'
    END as status
FROM public.countries
WHERE flag_emoji IS NULL OR region IS NULL;

-- Final complete list of all 21 countries
SELECT 
    '================================================' as separator
UNION ALL
SELECT 
    '🌍 COMPLETE COUNTRY LIST (21 COUNTRIES)' as separator
UNION ALL
SELECT 
    '================================================' as separator;

SELECT 
    region,
    code,
    name || ' ' || flag_emoji as country,
    currency_code,
    risk_level
FROM public.countries
ORDER BY 
    CASE region
        WHEN 'Southern Africa' THEN 1
        WHEN 'West Africa' THEN 2
        WHEN 'East Africa' THEN 3
        WHEN 'North Africa' THEN 4
        WHEN 'Central Africa' THEN 5
    END,
    name;