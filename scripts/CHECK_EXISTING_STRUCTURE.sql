-- Check Existing Database Structure
-- Run this first to see what tables and columns exist

-- ============================================
-- Check what tables exist
-- ============================================
SELECT 
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- ============================================
-- Check columns in key tables
-- ============================================

-- Check profiles table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check countries table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'countries'
ORDER BY ordinal_position;

-- Check loan_requests table structure (if exists)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'loan_requests'
ORDER BY ordinal_position;

-- Check if specific tables exist
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') 
         THEN '✅ profiles table exists' 
         ELSE '❌ profiles table missing' END as profiles_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'countries') 
         THEN '✅ countries table exists' 
         ELSE '❌ countries table missing' END as countries_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loan_requests') 
         THEN '✅ loan_requests table exists' 
         ELSE '❌ loan_requests table missing' END as loan_requests_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loan_offers') 
         THEN '✅ loan_offers table exists' 
         ELSE '❌ loan_offers table missing' END as loan_offers_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') 
         THEN '✅ notifications table exists' 
         ELSE '❌ notifications table missing' END as notifications_status;