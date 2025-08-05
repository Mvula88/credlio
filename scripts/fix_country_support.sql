-- =====================================================
-- Fix Country Support for Credlio
-- This script ensures proper country support in the database
-- =====================================================

-- 1. First, ensure countries table has all required columns
ALTER TABLE countries ADD COLUMN IF NOT EXISTS flag TEXT;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS currency_symbol TEXT;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Update existing countries with flags and ensure all 16 African countries exist
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

-- 3. Remove any non-African countries (like US) if they exist
DELETE FROM countries WHERE code NOT IN (
    'NG', 'KE', 'UG', 'ZA', 'GH', 'TZ', 'RW', 'ZM', 
    'NA', 'BW', 'MW', 'SN', 'ET', 'CM', 'SL', 'ZW'
);

-- 4. Add currency symbols
UPDATE countries SET currency_symbol = CASE 
    WHEN code = 'NG' THEN '₦'
    WHEN code = 'KE' THEN 'KSh'
    WHEN code = 'UG' THEN 'USh'
    WHEN code = 'ZA' THEN 'R'
    WHEN code = 'GH' THEN '₵'
    WHEN code = 'TZ' THEN 'TSh'
    WHEN code = 'RW' THEN 'FRw'
    WHEN code = 'ZM' THEN 'K'
    WHEN code = 'NA' THEN 'N$'
    WHEN code = 'BW' THEN 'P'
    WHEN code = 'MW' THEN 'MK'
    WHEN code = 'SN' THEN 'CFA'
    WHEN code = 'ET' THEN 'Br'
    WHEN code = 'CM' THEN 'FCFA'
    WHEN code = 'SL' THEN 'Le'
    WHEN code = 'ZW' THEN 'Z$'
    ELSE currency_code
END;

-- 5. Ensure profiles table has proper country support
-- Check if profiles table uses country or country_id
DO $$ 
BEGIN
    -- If profiles has 'country' column but not 'country_id', rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'country'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'country_id'
    ) THEN
        ALTER TABLE profiles RENAME COLUMN country TO country_id;
    END IF;
    
    -- If profiles doesn't have country_id, add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'country_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN country_id UUID REFERENCES countries(id);
    END IF;
END $$;

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_country_id ON profiles(country_id);
CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);

-- 7. Create or update the propagate_user_country function
CREATE OR REPLACE FUNCTION propagate_user_country(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_country_id UUID;
BEGIN
    -- Get the user's country_id
    SELECT country_id INTO v_country_id
    FROM profiles
    WHERE id = p_user_id;
    
    -- Update all related tables with the user's country
    -- Add any other tables that need country propagation here
    
    -- Example: Update user_transactions if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_transactions') THEN
        UPDATE user_transactions 
        SET country_id = v_country_id 
        WHERE user_id = p_user_id;
    END IF;
    
    -- Example: Update user_devices if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_devices') THEN
        UPDATE user_devices 
        SET country_id = v_country_id 
        WHERE user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create view for easy country lookup
CREATE OR REPLACE VIEW user_countries AS
SELECT 
    p.id as user_id,
    p.auth_user_id,
    p.email,
    p.full_name,
    c.id as country_id,
    c.code as country_code,
    c.name as country_name,
    c.flag as country_flag,
    c.currency_code,
    c.currency_symbol
FROM profiles p
LEFT JOIN countries c ON p.country_id = c.id;

-- 9. Add RLS policies for country-based data isolation
-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see profiles from their country
CREATE POLICY "Users can only see profiles from their country" ON profiles
    FOR SELECT
    USING (
        country_id = (
            SELECT country_id 
            FROM profiles 
            WHERE auth_user_id = auth.uid()
        )
        OR auth.uid() IN (
            SELECT auth_user_id 
            FROM profiles 
            WHERE role IN ('admin', 'super_admin')
        )
    );

-- 10. Function to get user's country code
CREATE OR REPLACE FUNCTION get_user_country_code(p_user_id UUID)
RETURNS TEXT AS $$
    SELECT c.code 
    FROM profiles p
    JOIN countries c ON p.country_id = c.id
    WHERE p.id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 11. Function to check if user belongs to a country
CREATE OR REPLACE FUNCTION user_belongs_to_country(p_user_id UUID, p_country_code TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM profiles p
        JOIN countries c ON p.country_id = c.id
        WHERE p.id = p_user_id AND c.code = p_country_code
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- 12. Grant necessary permissions
GRANT SELECT ON countries TO authenticated;
GRANT SELECT ON user_countries TO authenticated;
GRANT EXECUTE ON FUNCTION propagate_user_country TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_country_code TO authenticated;
GRANT EXECUTE ON FUNCTION user_belongs_to_country TO authenticated;

-- 13. Verify the setup
SELECT 
    'Countries Setup Summary' as info,
    COUNT(*) as total_countries,
    COUNT(CASE WHEN active = true THEN 1 END) as active_countries,
    COUNT(CASE WHEN flag IS NOT NULL THEN 1 END) as countries_with_flags
FROM countries;

-- List all countries
SELECT code, name, currency_code, currency_symbol, flag, active 
FROM countries 
ORDER BY name;