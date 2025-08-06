-- Insert ALL 54 African Countries
-- This script ensures all countries are properly inserted

-- First, check what countries currently exist
DO $$
DECLARE
    v_existing_count INT;
BEGIN
    SELECT COUNT(*) INTO v_existing_count FROM public.countries;
    RAISE NOTICE 'Currently have % countries in database', v_existing_count;
END $$;

-- Add columns if they don't exist
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS flag_emoji VARCHAR(10);
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low';
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS region VARCHAR(50);
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS phone_code VARCHAR(10);

-- Now insert ALL 54 African countries
-- Using simpler INSERT to avoid conflicts

-- NORTH AFRICA (6 countries)
INSERT INTO public.countries (code, name, currency_code) VALUES ('DZ', 'Algeria', 'DZD') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('EG', 'Egypt', 'EGP') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('LY', 'Libya', 'LYD') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('MA', 'Morocco', 'MAD') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('SD', 'Sudan', 'SDG') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('TN', 'Tunisia', 'TND') ON CONFLICT (code) DO NOTHING;

-- WEST AFRICA (16 countries)
INSERT INTO public.countries (code, name, currency_code) VALUES ('BJ', 'Benin', 'XOF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('BF', 'Burkina Faso', 'XOF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('CV', 'Cape Verde', 'CVE') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('CI', 'Ivory Coast', 'XOF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('GM', 'Gambia', 'GMD') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('GH', 'Ghana', 'GHS') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('GN', 'Guinea', 'GNF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('GW', 'Guinea-Bissau', 'XOF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('LR', 'Liberia', 'LRD') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('ML', 'Mali', 'XOF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('MR', 'Mauritania', 'MRU') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('NE', 'Niger', 'XOF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('NG', 'Nigeria', 'NGN') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('SN', 'Senegal', 'XOF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('SL', 'Sierra Leone', 'SLL') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('TG', 'Togo', 'XOF') ON CONFLICT (code) DO NOTHING;

-- EAST AFRICA (17 countries)
INSERT INTO public.countries (code, name, currency_code) VALUES ('BI', 'Burundi', 'BIF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('KM', 'Comoros', 'KMF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('DJ', 'Djibouti', 'DJF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('ER', 'Eritrea', 'ERN') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('ET', 'Ethiopia', 'ETB') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('KE', 'Kenya', 'KES') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('MG', 'Madagascar', 'MGA') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('MW', 'Malawi', 'MWK') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('MU', 'Mauritius', 'MUR') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('MZ', 'Mozambique', 'MZN') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('RW', 'Rwanda', 'RWF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('SC', 'Seychelles', 'SCR') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('SO', 'Somalia', 'SOS') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('SS', 'South Sudan', 'SSP') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('TZ', 'Tanzania', 'TZS') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('UG', 'Uganda', 'UGX') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('ZM', 'Zambia', 'ZMW') ON CONFLICT (code) DO NOTHING;

-- CENTRAL AFRICA (9 countries)
INSERT INTO public.countries (code, name, currency_code) VALUES ('AO', 'Angola', 'AOA') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('CM', 'Cameroon', 'XAF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('CF', 'Central African Republic', 'XAF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('TD', 'Chad', 'XAF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('CG', 'Congo', 'XAF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('CD', 'DR Congo', 'CDF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('GQ', 'Equatorial Guinea', 'XAF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('GA', 'Gabon', 'XAF') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('ST', 'São Tomé and Príncipe', 'STN') ON CONFLICT (code) DO NOTHING;

-- SOUTHERN AFRICA (6 countries)
INSERT INTO public.countries (code, name, currency_code) VALUES ('BW', 'Botswana', 'BWP') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('SZ', 'Eswatini', 'SZL') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('LS', 'Lesotho', 'LSL') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('NA', 'Namibia', 'NAD') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('ZA', 'South Africa', 'ZAR') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.countries (code, name, currency_code) VALUES ('ZW', 'Zimbabwe', 'ZWL') ON CONFLICT (code) DO NOTHING;

-- Now update all countries with additional data
UPDATE public.countries SET flag_emoji = '🇩🇿', is_active = true, risk_level = 'medium', region = 'North Africa', phone_code = '+213' WHERE code = 'DZ';
UPDATE public.countries SET flag_emoji = '🇪🇬', is_active = true, risk_level = 'medium', region = 'North Africa', phone_code = '+20' WHERE code = 'EG';
UPDATE public.countries SET flag_emoji = '🇱🇾', is_active = false, risk_level = 'high', region = 'North Africa', phone_code = '+218' WHERE code = 'LY';
UPDATE public.countries SET flag_emoji = '🇲🇦', is_active = true, risk_level = 'low', region = 'North Africa', phone_code = '+212' WHERE code = 'MA';
UPDATE public.countries SET flag_emoji = '🇸🇩', is_active = false, risk_level = 'high', region = 'North Africa', phone_code = '+249' WHERE code = 'SD';
UPDATE public.countries SET flag_emoji = '🇹🇳', is_active = true, risk_level = 'low', region = 'North Africa', phone_code = '+216' WHERE code = 'TN';

UPDATE public.countries SET flag_emoji = '🇧🇯', is_active = true, risk_level = 'medium', region = 'West Africa', phone_code = '+229' WHERE code = 'BJ';
UPDATE public.countries SET flag_emoji = '🇧🇫', is_active = true, risk_level = 'medium', region = 'West Africa', phone_code = '+226' WHERE code = 'BF';
UPDATE public.countries SET flag_emoji = '🇨🇻', is_active = true, risk_level = 'low', region = 'West Africa', phone_code = '+238' WHERE code = 'CV';
UPDATE public.countries SET flag_emoji = '🇨🇮', is_active = true, risk_level = 'medium', region = 'West Africa', phone_code = '+225' WHERE code = 'CI';
UPDATE public.countries SET flag_emoji = '🇬🇲', is_active = true, risk_level = 'medium', region = 'West Africa', phone_code = '+220' WHERE code = 'GM';
UPDATE public.countries SET flag_emoji = '🇬🇭', is_active = true, risk_level = 'low', region = 'West Africa', phone_code = '+233' WHERE code = 'GH';
UPDATE public.countries SET flag_emoji = '🇬🇳', is_active = true, risk_level = 'high', region = 'West Africa', phone_code = '+224' WHERE code = 'GN';
UPDATE public.countries SET flag_emoji = '🇬🇼', is_active = true, risk_level = 'high', region = 'West Africa', phone_code = '+245' WHERE code = 'GW';
UPDATE public.countries SET flag_emoji = '🇱🇷', is_active = true, risk_level = 'high', region = 'West Africa', phone_code = '+231' WHERE code = 'LR';
UPDATE public.countries SET flag_emoji = '🇲🇱', is_active = true, risk_level = 'high', region = 'West Africa', phone_code = '+223' WHERE code = 'ML';
UPDATE public.countries SET flag_emoji = '🇲🇷', is_active = true, risk_level = 'medium', region = 'West Africa', phone_code = '+222' WHERE code = 'MR';
UPDATE public.countries SET flag_emoji = '🇳🇪', is_active = true, risk_level = 'high', region = 'West Africa', phone_code = '+227' WHERE code = 'NE';
UPDATE public.countries SET flag_emoji = '🇳🇬', is_active = true, risk_level = 'medium', region = 'West Africa', phone_code = '+234' WHERE code = 'NG';
UPDATE public.countries SET flag_emoji = '🇸🇳', is_active = true, risk_level = 'low', region = 'West Africa', phone_code = '+221' WHERE code = 'SN';
UPDATE public.countries SET flag_emoji = '🇸🇱', is_active = true, risk_level = 'high', region = 'West Africa', phone_code = '+232' WHERE code = 'SL';
UPDATE public.countries SET flag_emoji = '🇹🇬', is_active = true, risk_level = 'medium', region = 'West Africa', phone_code = '+228' WHERE code = 'TG';

UPDATE public.countries SET flag_emoji = '🇧🇮', is_active = true, risk_level = 'high', region = 'East Africa', phone_code = '+257' WHERE code = 'BI';
UPDATE public.countries SET flag_emoji = '🇰🇲', is_active = true, risk_level = 'medium', region = 'East Africa', phone_code = '+269' WHERE code = 'KM';
UPDATE public.countries SET flag_emoji = '🇩🇯', is_active = true, risk_level = 'medium', region = 'East Africa', phone_code = '+253' WHERE code = 'DJ';
UPDATE public.countries SET flag_emoji = '🇪🇷', is_active = false, risk_level = 'high', region = 'East Africa', phone_code = '+291' WHERE code = 'ER';
UPDATE public.countries SET flag_emoji = '🇪🇹', is_active = true, risk_level = 'medium', region = 'East Africa', phone_code = '+251' WHERE code = 'ET';
UPDATE public.countries SET flag_emoji = '🇰🇪', is_active = true, risk_level = 'low', region = 'East Africa', phone_code = '+254' WHERE code = 'KE';
UPDATE public.countries SET flag_emoji = '🇲🇬', is_active = true, risk_level = 'medium', region = 'East Africa', phone_code = '+261' WHERE code = 'MG';
UPDATE public.countries SET flag_emoji = '🇲🇼', is_active = true, risk_level = 'medium', region = 'East Africa', phone_code = '+265' WHERE code = 'MW';
UPDATE public.countries SET flag_emoji = '🇲🇺', is_active = true, risk_level = 'low', region = 'East Africa', phone_code = '+230' WHERE code = 'MU';
UPDATE public.countries SET flag_emoji = '🇲🇿', is_active = true, risk_level = 'medium', region = 'East Africa', phone_code = '+258' WHERE code = 'MZ';
UPDATE public.countries SET flag_emoji = '🇷🇼', is_active = true, risk_level = 'low', region = 'East Africa', phone_code = '+250' WHERE code = 'RW';
UPDATE public.countries SET flag_emoji = '🇸🇨', is_active = true, risk_level = 'low', region = 'East Africa', phone_code = '+248' WHERE code = 'SC';
UPDATE public.countries SET flag_emoji = '🇸🇴', is_active = false, risk_level = 'high', region = 'East Africa', phone_code = '+252' WHERE code = 'SO';
UPDATE public.countries SET flag_emoji = '🇸🇸', is_active = false, risk_level = 'high', region = 'East Africa', phone_code = '+211' WHERE code = 'SS';
UPDATE public.countries SET flag_emoji = '🇹🇿', is_active = true, risk_level = 'low', region = 'East Africa', phone_code = '+255' WHERE code = 'TZ';
UPDATE public.countries SET flag_emoji = '🇺🇬', is_active = true, risk_level = 'low', region = 'East Africa', phone_code = '+256' WHERE code = 'UG';
UPDATE public.countries SET flag_emoji = '🇿🇲', is_active = true, risk_level = 'medium', region = 'East Africa', phone_code = '+260' WHERE code = 'ZM';

UPDATE public.countries SET flag_emoji = '🇦🇴', is_active = true, risk_level = 'high', region = 'Central Africa', phone_code = '+244' WHERE code = 'AO';
UPDATE public.countries SET flag_emoji = '🇨🇲', is_active = true, risk_level = 'medium', region = 'Central Africa', phone_code = '+237' WHERE code = 'CM';
UPDATE public.countries SET flag_emoji = '🇨🇫', is_active = false, risk_level = 'high', region = 'Central Africa', phone_code = '+236' WHERE code = 'CF';
UPDATE public.countries SET flag_emoji = '🇹🇩', is_active = true, risk_level = 'high', region = 'Central Africa', phone_code = '+235' WHERE code = 'TD';
UPDATE public.countries SET flag_emoji = '🇨🇬', is_active = true, risk_level = 'medium', region = 'Central Africa', phone_code = '+242' WHERE code = 'CG';
UPDATE public.countries SET flag_emoji = '🇨🇩', is_active = true, risk_level = 'high', region = 'Central Africa', phone_code = '+243' WHERE code = 'CD';
UPDATE public.countries SET flag_emoji = '🇬🇶', is_active = true, risk_level = 'medium', region = 'Central Africa', phone_code = '+240' WHERE code = 'GQ';
UPDATE public.countries SET flag_emoji = '🇬🇦', is_active = true, risk_level = 'medium', region = 'Central Africa', phone_code = '+241' WHERE code = 'GA';
UPDATE public.countries SET flag_emoji = '🇸🇹', is_active = true, risk_level = 'medium', region = 'Central Africa', phone_code = '+239' WHERE code = 'ST';

UPDATE public.countries SET flag_emoji = '🇧🇼', is_active = true, risk_level = 'low', region = 'Southern Africa', phone_code = '+267' WHERE code = 'BW';
UPDATE public.countries SET flag_emoji = '🇸🇿', is_active = true, risk_level = 'medium', region = 'Southern Africa', phone_code = '+268' WHERE code = 'SZ';
UPDATE public.countries SET flag_emoji = '🇱🇸', is_active = true, risk_level = 'medium', region = 'Southern Africa', phone_code = '+266' WHERE code = 'LS';
UPDATE public.countries SET flag_emoji = '🇳🇦', is_active = true, risk_level = 'low', region = 'Southern Africa', phone_code = '+264' WHERE code = 'NA';
UPDATE public.countries SET flag_emoji = '🇿🇦', is_active = true, risk_level = 'low', region = 'Southern Africa', phone_code = '+27' WHERE code = 'ZA';
UPDATE public.countries SET flag_emoji = '🇿🇼', is_active = true, risk_level = 'high', region = 'Southern Africa', phone_code = '+263' WHERE code = 'ZW';

-- Verify all countries were added
DO $$
DECLARE
    v_total_count INT;
    v_north_africa INT;
    v_west_africa INT;
    v_east_africa INT;
    v_central_africa INT;
    v_southern_africa INT;
BEGIN
    SELECT COUNT(*) INTO v_total_count FROM public.countries;
    SELECT COUNT(*) INTO v_north_africa FROM public.countries WHERE region = 'North Africa';
    SELECT COUNT(*) INTO v_west_africa FROM public.countries WHERE region = 'West Africa';
    SELECT COUNT(*) INTO v_east_africa FROM public.countries WHERE region = 'East Africa';
    SELECT COUNT(*) INTO v_central_africa FROM public.countries WHERE region = 'Central Africa';
    SELECT COUNT(*) INTO v_southern_africa FROM public.countries WHERE region = 'Southern Africa';
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '🌍 AFRICAN COUNTRIES INSERT COMPLETE';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'TOTAL COUNTRIES: %', v_total_count;
    RAISE NOTICE '';
    RAISE NOTICE 'By Region:';
    RAISE NOTICE '  • North Africa: % countries', v_north_africa;
    RAISE NOTICE '  • West Africa: % countries', v_west_africa;
    RAISE NOTICE '  • East Africa: % countries', v_east_africa;
    RAISE NOTICE '  • Central Africa: % countries', v_central_africa;
    RAISE NOTICE '  • Southern Africa: % countries', v_southern_africa;
    RAISE NOTICE '================================================';
    
    IF v_total_count < 54 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ WARNING: Expected 54 countries but only have %', v_total_count;
        RAISE NOTICE 'Some countries may have failed to insert.';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '✅ All 54 African countries successfully added!';
    END IF;
END $$;

-- Show all countries with their details
SELECT 
    region,
    COUNT(*) as count,
    STRING_AGG(name || ' ' || flag_emoji, ', ' ORDER BY name) as countries
FROM public.countries
GROUP BY region
ORDER BY 
    CASE region
        WHEN 'North Africa' THEN 1
        WHEN 'West Africa' THEN 2
        WHEN 'East Africa' THEN 3
        WHEN 'Central Africa' THEN 4
        WHEN 'Southern Africa' THEN 5
    END;

-- List any countries without flags or regions (to identify issues)
SELECT code, name, currency_code, flag_emoji, region
FROM public.countries
WHERE flag_emoji IS NULL OR region IS NULL
ORDER BY name;