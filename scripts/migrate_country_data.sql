-- =====================================================
-- Migrate Existing Country Data
-- Run this AFTER fix_country_support.sql
-- =====================================================

-- 1. Migrate existing profiles that have country as text to country_id
DO $$ 
DECLARE
    v_profile RECORD;
    v_country_id UUID;
BEGIN
    -- Check if there's a country column with text data
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'country' 
        AND data_type IN ('text', 'character varying')
    ) THEN
        -- Migrate each profile
        FOR v_profile IN 
            SELECT id, country 
            FROM profiles 
            WHERE country IS NOT NULL 
            AND country != ''
        LOOP
            -- Find the country ID
            SELECT id INTO v_country_id
            FROM countries
            WHERE code = v_profile.country
            OR name = v_profile.country;
            
            -- Update the profile
            IF v_country_id IS NOT NULL THEN
                UPDATE profiles 
                SET country_id = v_country_id
                WHERE id = v_profile.id;
            END IF;
        END LOOP;
        
        -- Drop the old column after migration
        ALTER TABLE profiles DROP COLUMN IF EXISTS country;
    END IF;
END $$;

-- 2. Migrate home_country if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'home_country'
    ) THEN
        -- Add home_country_id if it doesn't exist
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_country_id UUID REFERENCES countries(id);
        
        -- Migrate data
        UPDATE profiles p
        SET home_country_id = c.id
        FROM countries c
        WHERE p.home_country = c.code OR p.home_country = c.name;
        
        -- Drop old column
        ALTER TABLE profiles DROP COLUMN home_country;
    END IF;
END $$;

-- 3. Fix any profiles without country (set to default - Namibia)
UPDATE profiles 
SET country_id = (SELECT id FROM countries WHERE code = 'NA' LIMIT 1)
WHERE country_id IS NULL;

-- 4. Make country_id NOT NULL after migration
ALTER TABLE profiles ALTER COLUMN country_id SET NOT NULL;

-- 5. Update any other tables that reference country
-- Example for user_transactions
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_transactions'
    ) THEN
        -- Add country_id if missing
        ALTER TABLE user_transactions 
        ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id);
        
        -- Populate from user's profile
        UPDATE user_transactions t
        SET country_id = p.country_id
        FROM profiles p
        WHERE t.user_id = p.id
        AND t.country_id IS NULL;
    END IF;
END $$;

-- 6. Create audit log for migration
CREATE TABLE IF NOT EXISTS migration_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    migration_name TEXT NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    affected_rows INT,
    notes TEXT
);

INSERT INTO migration_log (migration_name, affected_rows, notes)
SELECT 
    'country_data_migration',
    COUNT(*),
    'Migrated country data from text to UUID references'
FROM profiles;

-- 7. Verify migration results
SELECT 
    'Migration Summary' as info,
    COUNT(*) as total_profiles,
    COUNT(country_id) as profiles_with_country,
    COUNT(*) - COUNT(country_id) as profiles_without_country
FROM profiles;

-- Show country distribution
SELECT 
    c.name as country,
    c.code,
    c.flag,
    COUNT(p.id) as user_count
FROM countries c
LEFT JOIN profiles p ON c.id = p.country_id
GROUP BY c.id, c.name, c.code, c.flag
ORDER BY user_count DESC;