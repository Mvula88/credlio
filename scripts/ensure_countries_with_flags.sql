-- =====================================================
-- Ensure Countries Table Has Flags
-- Run this to add flag emojis to existing countries
-- =====================================================

-- First, ensure the flag column exists
ALTER TABLE countries ADD COLUMN IF NOT EXISTS flag TEXT;

-- Update countries with their flag emojis
UPDATE countries SET flag = CASE 
    WHEN code = 'NG' THEN '🇳🇬'
    WHEN code = 'KE' THEN '🇰🇪'
    WHEN code = 'UG' THEN '🇺🇬'
    WHEN code = 'ZA' THEN '🇿🇦'
    WHEN code = 'GH' THEN '🇬🇭'
    WHEN code = 'TZ' THEN '🇹🇿'
    WHEN code = 'RW' THEN '🇷🇼'
    WHEN code = 'ZM' THEN '🇿🇲'
    WHEN code = 'NA' THEN '🇳🇦'
    WHEN code = 'BW' THEN '🇧🇼'
    WHEN code = 'MW' THEN '🇲🇼'
    WHEN code = 'SN' THEN '🇸🇳'
    WHEN code = 'ET' THEN '🇪🇹'
    WHEN code = 'CM' THEN '🇨🇲'
    WHEN code = 'SL' THEN '🇸🇱'
    WHEN code = 'ZW' THEN '🇿🇼'
    ELSE flag
END
WHERE code IN ('NG', 'KE', 'UG', 'ZA', 'GH', 'TZ', 'RW', 'ZM', 'NA', 'BW', 'MW', 'SN', 'ET', 'CM', 'SL', 'ZW');

-- Ensure all countries are active by default
UPDATE countries SET active = true WHERE active IS NULL;

-- Insert countries if they don't exist (with flags)
INSERT INTO countries (name, code, currency_code, flag, active) VALUES
('Nigeria', 'NG', 'NGN', '🇳🇬', true),
('Kenya', 'KE', 'KES', '🇰🇪', true),
('Uganda', 'UG', 'UGX', '🇺🇬', true),
('South Africa', 'ZA', 'ZAR', '🇿🇦', true),
('Ghana', 'GH', 'GHS', '🇬🇭', true),
('Tanzania', 'TZ', 'TZS', '🇹🇿', true),
('Rwanda', 'RW', 'RWF', '🇷🇼', true),
('Zambia', 'ZM', 'ZMW', '🇿🇲', true),
('Namibia', 'NA', 'NAD', '🇳🇦', true),
('Botswana', 'BW', 'BWP', '🇧🇼', true),
('Malawi', 'MW', 'MWK', '🇲🇼', true),
('Senegal', 'SN', 'XOF', '🇸🇳', true),
('Ethiopia', 'ET', 'ETB', '🇪🇹', true),
('Cameroon', 'CM', 'XAF', '🇨🇲', true),
('Sierra Leone', 'SL', 'SLL', '🇸🇱', true),
('Zimbabwe', 'ZW', 'ZWL', '🇿🇼', true)
ON CONFLICT (code) DO UPDATE SET 
    flag = EXCLUDED.flag,
    active = EXCLUDED.active;

-- Verify all countries have flags
SELECT name, code, flag, active FROM countries ORDER BY name;