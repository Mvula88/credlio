-- =====================================================
-- ADD MISSING COLUMNS FOR SIGNUP
-- =====================================================

-- Add all missing columns that the signup form needs
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS id_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS id_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS occupation VARCHAR(100),
ADD COLUMN IF NOT EXISTS monthly_income DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_name VARCHAR(200);

-- Check that all columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;