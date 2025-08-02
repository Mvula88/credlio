-- =====================================================
-- ADD MISSING ID_VERIFIED COLUMN
-- =====================================================

-- Add the id_verified column that the signup form needs
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT FALSE;

-- Check that the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name IN ('id_verified', 'is_verified', 'date_of_birth', 'id_type', 'id_number')
ORDER BY ordinal_position;