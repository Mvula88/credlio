-- =====================================================
-- ADD PHONE COLUMN (ALIAS FOR PHONE_NUMBER)
-- =====================================================

-- Add phone column that the signup form is looking for
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Check both phone columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name IN ('phone', 'phone_number', 'phone_hash')
ORDER BY ordinal_position;