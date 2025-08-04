-- ============================================
-- REMOVE CUSTOMER_ID COLUMN FROM PROFILES TABLE
-- ============================================
-- This script safely removes the customer_id column which is no longer needed

-- STEP 1: Check if customer_id column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'customer_id'
    ) THEN
        -- STEP 2: Drop the unique constraint if it exists
        ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_customer_id_key;
        
        -- STEP 3: Drop the column
        ALTER TABLE profiles DROP COLUMN customer_id;
        
        RAISE NOTICE 'customer_id column has been removed from profiles table';
    ELSE
        RAISE NOTICE 'customer_id column does not exist in profiles table';
    END IF;
END $$;

-- STEP 4: Verify the column has been removed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;