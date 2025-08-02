-- =====================================================
-- ADD MISSING HASH COLUMNS FOR SECURE SIGNUP
-- =====================================================

-- Add all hash columns that the secure signup form uses for privacy
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS national_id_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS passport_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone_hash VARCHAR(255);

-- Check that all columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name LIKE '%hash%'
ORDER BY ordinal_position;