-- =====================================================
-- Master Script to Setup Country Support
-- Run this file to execute all country-related SQL
-- =====================================================

-- IMPORTANT: Run these scripts in order!

\echo 'Starting Country Support Setup...'
\echo '================================'

-- Step 1: Fix country support structure
\echo 'Step 1: Setting up country support...'
\i fix_country_support.sql

-- Step 2: Migrate existing data
\echo 'Step 2: Migrating existing country data...'
\i migrate_country_data.sql

-- Step 3: Setup Row Level Security
\echo 'Step 3: Implementing country-based RLS...'
\i country_based_rls.sql

\echo '================================'
\echo 'Country Support Setup Complete!'
\echo ''
\echo 'Verification Queries:'
\echo '--------------------'

-- Show country setup
SELECT 
    'Total Countries' as metric,
    COUNT(*) as value
FROM countries
UNION ALL
SELECT 
    'Active Countries',
    COUNT(*)
FROM countries
WHERE active = true
UNION ALL
SELECT 
    'Users with Country',
    COUNT(*)
FROM profiles
WHERE country_id IS NOT NULL;

-- Show country distribution
\echo ''
\echo 'User Distribution by Country:'
SELECT 
    c.flag || ' ' || c.name as country,
    c.code,
    COUNT(p.id) as users,
    ROUND(COUNT(p.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM profiles), 0), 2) || '%' as percentage
FROM countries c
LEFT JOIN profiles p ON c.id = p.country_id
GROUP BY c.id, c.name, c.code, c.flag
ORDER BY users DESC;

-- Show RLS status
\echo ''
\echo 'RLS Status:'
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'profiles', 'borrowers', 'lenders', 'loans', 
    'loan_applications', 'reputation_reports', 
    'blacklisted_borrowers'
)
ORDER BY tablename;

\echo ''
\echo 'Setup complete! Users are now restricted to their country data.'