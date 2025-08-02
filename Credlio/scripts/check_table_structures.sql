-- Check the actual structure of tables that need RLS policies

-- 1. Check loan_offers columns
SELECT 'loan_offers' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'loan_offers'
ORDER BY ordinal_position;

-- 2. Check borrower_invitations columns  
SELECT 'borrower_invitations' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'borrower_invitations'
ORDER BY ordinal_position;

-- 3. Check watchlist columns
SELECT 'watchlist' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'watchlist'
ORDER BY ordinal_position;

-- 4. Check if these tables exist at all
SELECT tablename, 
       CASE WHEN tablename IS NOT NULL THEN '✅ Exists' ELSE '❌ Missing' END as status
FROM (
    SELECT DISTINCT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename IN (
        'loan_offers', 'borrower_invitations', 'watchlist', 
        'smart_tags', 'reputation_badges', 'blacklisted_borrowers'
    )
) t
ORDER BY tablename;