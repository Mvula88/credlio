-- Add Missing Columns Only
-- This script only adds columns that are missing, without trying to insert data

-- ============================================
-- STEP 1: Add missing columns to countries table
-- ============================================

ALTER TABLE public.countries 
ADD COLUMN IF NOT EXISTS flag_emoji VARCHAR(10);

ALTER TABLE public.countries 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.countries 
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low';

-- ============================================
-- STEP 2: Add missing columns to profiles table
-- ============================================

-- Add profile picture and other visual fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS online_status BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add role and verification fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'borrower';

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_documents JSONB DEFAULT '[]';

-- Add borrower-specific fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 500;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_borrowed DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_repaid DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS loans_taken INTEGER DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS loans_defaulted INTEGER DEFAULT 0;

-- Add lender-specific fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_lent DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_recovered DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS active_loans_count INTEGER DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS borrowers_count INTEGER DEFAULT 0;

-- Add location/travel fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.countries(id);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_traveling BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS home_country VARCHAR(2);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS detected_country VARCHAR(2);

-- Add subscription fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50);

-- Add other common fields if missing
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS national_id VARCHAR(100);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- STEP 3: Add missing columns to loan_requests table
-- ============================================

-- Check if borrower_profile_id exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'loan_requests' 
        AND column_name = 'borrower_profile_id'
    ) THEN
        ALTER TABLE public.loan_requests 
        ADD COLUMN borrower_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add other potentially missing columns
ALTER TABLE public.loan_requests 
ADD COLUMN IF NOT EXISTS amount DECIMAL(15, 2);

ALTER TABLE public.loan_requests 
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3);

ALTER TABLE public.loan_requests 
ADD COLUMN IF NOT EXISTS purpose TEXT;

ALTER TABLE public.loan_requests 
ADD COLUMN IF NOT EXISTS duration_months INTEGER;

ALTER TABLE public.loan_requests 
ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5, 2);

ALTER TABLE public.loan_requests 
ADD COLUMN IF NOT EXISTS collateral_description TEXT;

ALTER TABLE public.loan_requests 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE public.loan_requests 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');

-- ============================================
-- STEP 4: Verify columns were added
-- ============================================

-- Check countries columns
SELECT 
    'Countries table columns:' as info,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'countries';

-- Check profiles columns
SELECT 
    'Profiles table columns:' as info,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- Check loan_requests columns
SELECT 
    'Loan requests table columns:' as info,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'loan_requests';

-- ============================================
-- STEP 5: Now you can safely update data
-- ============================================

-- Update countries with emoji flags (now that column exists)
UPDATE public.countries SET flag_emoji = '🇿🇦' WHERE code = 'ZA';
UPDATE public.countries SET flag_emoji = '🇳🇬' WHERE code = 'NG';
UPDATE public.countries SET flag_emoji = '🇰🇪' WHERE code = 'KE';
UPDATE public.countries SET flag_emoji = '🇬🇭' WHERE code = 'GH';
UPDATE public.countries SET flag_emoji = '🇪🇬' WHERE code = 'EG';
UPDATE public.countries SET flag_emoji = '🇪🇹' WHERE code = 'ET';
UPDATE public.countries SET flag_emoji = '🇺🇬' WHERE code = 'UG';
UPDATE public.countries SET flag_emoji = '🇹🇿' WHERE code = 'TZ';
UPDATE public.countries SET flag_emoji = '🇲🇦' WHERE code = 'MA';
UPDATE public.countries SET flag_emoji = '🇩🇿' WHERE code = 'DZ';
UPDATE public.countries SET flag_emoji = '🇦🇴' WHERE code = 'AO';
UPDATE public.countries SET flag_emoji = '🇨🇲' WHERE code = 'CM';
UPDATE public.countries SET flag_emoji = '🇨🇮' WHERE code = 'CI';
UPDATE public.countries SET flag_emoji = '🇸🇳' WHERE code = 'SN';
UPDATE public.countries SET flag_emoji = '🇿🇼' WHERE code = 'ZW';
UPDATE public.countries SET flag_emoji = '🇿🇲' WHERE code = 'ZM';

-- ============================================
-- FINAL: Summary
-- ============================================

DO $$
DECLARE
    v_countries_cols INT;
    v_profiles_cols INT;
    v_loan_requests_cols INT;
BEGIN
    SELECT COUNT(*) INTO v_countries_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'countries';
    
    SELECT COUNT(*) INTO v_profiles_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles';
    
    SELECT COUNT(*) INTO v_loan_requests_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'loan_requests';
    
    RAISE NOTICE '';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Columns Added Successfully!';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Countries table: % columns', v_countries_cols;
    RAISE NOTICE 'Profiles table: % columns', v_profiles_cols;
    RAISE NOTICE 'Loan requests table: % columns', v_loan_requests_cols;
    RAISE NOTICE '=================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ All missing columns have been added!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run INSERT_BASE_DATA.sql to add countries and roles';
    RAISE NOTICE '2. Run POPULATE_TEST_DATA.sql to add sample data';
    RAISE NOTICE '3. Run setup_chat_system.sql for chat features';
END $$;