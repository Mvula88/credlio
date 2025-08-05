-- =====================================================
-- Check Current Database State
-- =====================================================

-- 1. Check if tables exist and their row counts
SELECT 
    'profiles' as table_name,
    COUNT(*) as row_count,
    COUNT(country_id) as with_country_id,
    COUNT(country) as with_country_code
FROM profiles
UNION ALL
SELECT 
    'countries' as table_name,
    COUNT(*) as row_count,
    0 as with_country_id,
    0 as with_country_code
FROM countries;

-- 2. Show all countries
SELECT 
    id,
    name,
    code,
    flag,
    currency_code
FROM countries
ORDER BY name;

-- 3. Show sample profiles (if any)
SELECT 
    id,
    auth_user_id,
    email,
    role,
    country,
    country_id,
    created_at
FROM profiles
LIMIT 5;

-- 4. Check columns in profiles table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('country', 'country_id', 'auth_user_id', 'email', 'role')
ORDER BY ordinal_position;