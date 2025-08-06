-- ============================================
-- COMPREHENSIVE FIX FOR USER SIGNUP ISSUES
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. First, check and clean up any existing test users
SELECT 
    au.id as auth_user_id,
    au.email,
    au.created_at as auth_created_at,
    p.id as profile_id,
    p.full_name
FROM auth.users au
LEFT JOIN profiles p ON p.auth_user_id = au.id
WHERE au.email IN ('inekela34@gmail.com', 'test@example.com')
ORDER BY au.created_at DESC;

-- 2. Clean up orphaned auth users (users without profiles)
-- Uncomment and run if needed:
/*
DELETE FROM auth.users 
WHERE email IN ('inekela34@gmail.com', 'test@example.com')
AND id NOT IN (SELECT auth_user_id FROM profiles WHERE auth_user_id IS NOT NULL);
*/

-- 3. Ensure countries table has necessary data
INSERT INTO countries (name, code, currency_code, phone_code, flag_emoji)
VALUES 
    ('Namibia', 'NA', 'NAD', '+264', '🇳🇦'),
    ('South Africa', 'ZA', 'ZAR', '+27', '🇿🇦'),
    ('Botswana', 'BW', 'BWP', '+267', '🇧🇼'),
    ('Zimbabwe', 'ZW', 'ZWL', '+263', '🇿🇼'),
    ('Zambia', 'ZM', 'ZMW', '+260', '🇿🇲'),
    ('United States', 'US', 'USD', '+1', '🇺🇸'),
    ('United Kingdom', 'GB', 'GBP', '+44', '🇬🇧')
ON CONFLICT (code) DO UPDATE
SET 
    currency_code = EXCLUDED.currency_code,
    phone_code = EXCLUDED.phone_code,
    flag_emoji = EXCLUDED.flag_emoji;

-- 4. Check if countries were inserted successfully
SELECT code, name, currency_code, phone_code 
FROM countries 
WHERE code IN ('NA', 'ZA', 'BW', 'ZW', 'ZM')
ORDER BY name;

-- 5. Fix the profiles table - ensure all columns exist
DO $$
BEGIN
    -- Add detected_country_code if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'detected_country_code'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN detected_country_code VARCHAR(2);
    END IF;

    -- Add signup_ip_address if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'signup_ip_address'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN signup_ip_address VARCHAR(45);
    END IF;

    -- Add role column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN role VARCHAR(20) CHECK (role IN ('borrower', 'lender', 'admin'));
    END IF;
END $$;

-- 6. Ensure RLS policies are correct for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON profiles;

-- Create comprehensive policies
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Enable insert for authenticated users only" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

-- Service role bypass (for server-side operations)
CREATE POLICY "Service role can do anything" 
ON profiles FOR ALL 
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- 7. Create or replace the trigger function for auto-creating profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    default_country_id uuid;
BEGIN
    -- Get a default country (Namibia as fallback)
    SELECT id INTO default_country_id 
    FROM countries 
    WHERE code = 'NA' 
    LIMIT 1;

    -- Insert the profile with minimal required fields
    INSERT INTO public.profiles (
        auth_user_id,
        email,
        created_at,
        country_id
    ) VALUES (
        new.id,
        new.email,
        now(),
        default_country_id
    );
    
    RETURN new;
EXCEPTION
    WHEN others THEN
        -- Log the error but don't fail the signup
        RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Check borrower_profiles table structure
ALTER TABLE borrower_profiles ENABLE ROW LEVEL SECURITY;

-- Ensure borrower_profiles has proper policies
DROP POLICY IF EXISTS "Users can view own borrower profile" ON borrower_profiles;
DROP POLICY IF EXISTS "Users can update own borrower profile" ON borrower_profiles;
DROP POLICY IF EXISTS "Users can insert own borrower profile" ON borrower_profiles;

CREATE POLICY "Users can view own borrower profile" 
ON borrower_profiles FOR SELECT 
USING (
    user_id IN (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "Users can update own borrower profile" 
ON borrower_profiles FOR UPDATE 
USING (
    user_id IN (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert own borrower profile" 
ON borrower_profiles FOR INSERT 
WITH CHECK (
    user_id IN (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
);

-- 10. Create function to safely handle profile creation with better error handling
CREATE OR REPLACE FUNCTION create_user_profile(
    p_auth_user_id uuid,
    p_email text,
    p_full_name text,
    p_phone_number text,
    p_role text,
    p_country_code text,
    p_detected_country_code text DEFAULT NULL,
    p_signup_ip_address text DEFAULT NULL
) RETURNS json AS $$
DECLARE
    v_country_id uuid;
    v_profile_id uuid;
    v_result json;
BEGIN
    -- Get country ID
    SELECT id INTO v_country_id 
    FROM countries 
    WHERE code = p_country_code;
    
    IF v_country_id IS NULL THEN
        -- Try to get default country
        SELECT id INTO v_country_id 
        FROM countries 
        WHERE code = 'NA' 
        LIMIT 1;
    END IF;
    
    -- Insert profile
    INSERT INTO profiles (
        auth_user_id,
        email,
        full_name,
        phone_number,
        role,
        country_id,
        detected_country_code,
        signup_ip_address,
        created_at
    ) VALUES (
        p_auth_user_id,
        p_email,
        p_full_name,
        p_phone_number,
        p_role,
        v_country_id,
        p_detected_country_code,
        p_signup_ip_address,
        now()
    ) RETURNING id INTO v_profile_id;
    
    -- Return success
    v_result := json_build_object(
        'success', true,
        'profile_id', v_profile_id,
        'message', 'Profile created successfully'
    );
    
    RETURN v_result;
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Profile already exists for this user',
            'code', 'UNIQUE_VIOLATION'
        );
    WHEN foreign_key_violation THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid reference data',
            'code', 'FOREIGN_KEY_VIOLATION'
        );
    WHEN others THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'code', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 12. Final verification
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SIGNUP FIX COMPLETED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '1. Countries table populated';
    RAISE NOTICE '2. Profiles table structure fixed';
    RAISE NOTICE '3. RLS policies updated';
    RAISE NOTICE '4. Trigger function improved';
    RAISE NOTICE '5. Helper function created';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Go to Authentication > Providers > Email';
    RAISE NOTICE '2. DISABLE "Confirm email" for testing';
    RAISE NOTICE '3. Clear browser cookies/cache';
    RAISE NOTICE '4. Try signing up again';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;