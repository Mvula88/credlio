-- =====================================================
-- Check and Add Country Columns to Required Tables
-- =====================================================

-- 1. First check if profiles table has country_id column
-- If not, add it with proper foreign key reference
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'country_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN country_id UUID REFERENCES countries(id);
        RAISE NOTICE 'Added country_id column to profiles table';
    ELSE
        RAISE NOTICE 'country_id column already exists in profiles table';
    END IF;
END $$;

-- 2. Add country column (for backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'country'
    ) THEN
        ALTER TABLE profiles ADD COLUMN country VARCHAR(2);
        RAISE NOTICE 'Added country column to profiles table';
    ELSE
        RAISE NOTICE 'country column already exists in profiles table';
    END IF;
END $$;

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_country_id ON profiles(country_id);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country);

-- 4. Check and add country_id to other tables
DO $$
BEGIN
    -- Add to blacklisted_borrowers if not exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'blacklisted_borrowers') THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'blacklisted_borrowers' 
            AND column_name = 'country_id'
        ) THEN
            ALTER TABLE blacklisted_borrowers ADD COLUMN country_id UUID REFERENCES countries(id);
            RAISE NOTICE 'Added country_id to blacklisted_borrowers';
        END IF;
    END IF;
    
    -- Add to loan_requests if exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_requests') THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'loan_requests' 
            AND column_name = 'country_id'
        ) THEN
            ALTER TABLE loan_requests ADD COLUMN country_id UUID REFERENCES countries(id);
            RAISE NOTICE 'Added country_id to loan_requests';
        END IF;
    END IF;
    
    -- Add to loan_offers if exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_offers') THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'loan_offers' 
            AND column_name = 'country_id'
        ) THEN
            ALTER TABLE loan_offers ADD COLUMN country_id UUID REFERENCES countries(id);
            RAISE NOTICE 'Added country_id to loan_offers';
        END IF;
    END IF;
    
    -- Add to loans if exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loans') THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'loans' 
            AND column_name = 'country_id'
        ) THEN
            ALTER TABLE loans ADD COLUMN country_id UUID REFERENCES countries(id);
            RAISE NOTICE 'Added country_id to loans';
        END IF;
    END IF;
    
    -- Add to payments if exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'payments' 
            AND column_name = 'country_id'
        ) THEN
            ALTER TABLE payments ADD COLUMN country_id UUID REFERENCES countries(id);
            RAISE NOTICE 'Added country_id to payments';
        END IF;
    END IF;
END $$;

-- 5. Create a function to sync country code with country_id
CREATE OR REPLACE FUNCTION sync_country_id()
RETURNS void AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update profiles where country_id is null but country code exists
    UPDATE profiles p
    SET country_id = c.id
    FROM countries c
    WHERE p.country = c.code
    AND p.country_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    IF updated_count > 0 THEN
        RAISE NOTICE 'Updated % profiles with country_id', updated_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Run the sync function
SELECT sync_country_id();

-- 7. Display current state
DO $$
DECLARE
    total_profiles INTEGER;
    profiles_with_country_id INTEGER;
    profiles_with_country_code INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_profiles FROM profiles;
    SELECT COUNT(*) INTO profiles_with_country_id FROM profiles WHERE country_id IS NOT NULL;
    SELECT COUNT(*) INTO profiles_with_country_code FROM profiles WHERE country IS NOT NULL;
    
    RAISE NOTICE 'Profile Statistics:';
    RAISE NOTICE '  Total profiles: %', total_profiles;
    RAISE NOTICE '  Profiles with country_id: %', profiles_with_country_id;
    RAISE NOTICE '  Profiles with country code: %', profiles_with_country_code;
END $$;