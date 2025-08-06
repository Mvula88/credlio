-- =====================================================
-- VERIFY CREDLIO DATABASE SETUP
-- =====================================================
-- This script verifies that all tables, policies, and functions
-- were created correctly by the master setup script

-- =====================================================
-- 1. CHECK TABLES
-- =====================================================

SELECT 
  'TABLES' as check_type,
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
FROM (
  VALUES 
    ('countries'),
    ('user_roles'),
    ('profiles'),
    ('user_profile_roles'),
    ('country_admins'),
    ('loan_requests'),
    ('loan_offers'),
    ('active_loans'),
    ('loan_payments'),
    ('blacklisted_borrowers'),
    ('off_platform_defaulters'),
    ('ghost_borrowers'),
    ('ghost_loans'),
    ('ghost_loan_payments'),
    ('borrower_risk_history'),
    ('borrower_invitations'),
    ('conversations'),
    ('messages'),
    ('message_attachments'),
    ('notifications'),
    ('subscription_plans'),
    ('user_subscriptions'),
    ('watchlist'),
    ('smart_tags'),
    ('reputation_badges'),
    ('audit_logs'),
    ('blocked_access_attempts'),
    ('location_verification_logs'),
    ('setup_log')
) AS expected_tables(table_name)
LEFT JOIN information_schema.tables t ON t.table_name = expected_tables.table_name 
  AND t.table_schema = 'public'
ORDER BY expected_tables.table_name;

-- =====================================================
-- 2. CHECK ROW LEVEL SECURITY
-- =====================================================

SELECT 
  'RLS STATUS' as check_type,
  tablename as table_name,
  CASE 
    WHEN rowsecurity THEN '✓ ENABLED'
    ELSE '✗ DISABLED'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename NOT IN ('countries', 'user_roles', 'subscription_plans', 'setup_log')
ORDER BY tablename;

-- =====================================================
-- 3. CHECK POLICIES
-- =====================================================

SELECT 
  'POLICIES' as check_type,
  schemaname,
  tablename,
  policyname,
  '✓ EXISTS' as status
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 4. CHECK FUNCTIONS
-- =====================================================

SELECT 
  'FUNCTIONS' as check_type,
  routine_name as function_name,
  routine_type,
  '✓ EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN (
    'handle_new_user',
    'update_conversation_on_message',
    'create_active_loan_from_offer'
  )
ORDER BY routine_name;

-- =====================================================
-- 5. CHECK TRIGGERS
-- =====================================================

SELECT 
  'TRIGGERS' as check_type,
  trigger_name,
  event_object_table as table_name,
  '✓ EXISTS' as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- 6. CHECK INDEXES
-- =====================================================

SELECT 
  'INDEXES' as check_type,
  indexname as index_name,
  tablename as table_name,
  '✓ EXISTS' as status
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- =====================================================
-- 7. CHECK FOREIGN KEY CONSTRAINTS
-- =====================================================

SELECT 
  'FOREIGN KEYS' as check_type,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  '✓ EXISTS' as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- 8. CHECK DATA INTEGRITY
-- =====================================================

-- Check if countries were inserted
SELECT 
  'DATA CHECK' as check_type,
  'Countries inserted' as description,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 16 THEN '✓ COMPLETE'
    ELSE '⚠ INCOMPLETE'
  END as status
FROM countries;

-- Check if user roles were inserted
SELECT 
  'DATA CHECK' as check_type,
  'User roles inserted' as description,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 5 THEN '✓ COMPLETE'
    ELSE '⚠ INCOMPLETE'
  END as status
FROM user_roles;

-- Check if subscription plans were inserted
SELECT 
  'DATA CHECK' as check_type,
  'Subscription plans inserted' as description,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 2 THEN '✓ COMPLETE'
    ELSE '⚠ INCOMPLETE'
  END as status
FROM subscription_plans;

-- =====================================================
-- 9. SUMMARY REPORT
-- =====================================================

SELECT 
  '=== SETUP SUMMARY ===' as summary,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') as total_functions,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as total_triggers,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes;

-- =====================================================
-- 10. POTENTIAL ISSUES CHECK
-- =====================================================

-- Check for tables without RLS that should have RLS
SELECT 
  'POTENTIAL ISSUES' as check_type,
  'Table without RLS: ' || tablename as issue,
  '⚠ WARNING' as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false
  AND tablename NOT IN ('countries', 'user_roles', 'subscription_plans', 'setup_log');

-- Check for missing essential indexes
WITH expected_indexes AS (
  SELECT unnest(ARRAY['idx_profiles_auth_user_id', 'idx_loan_requests_borrower', 'idx_loan_offers_lender']) as index_name
)
SELECT 
  'POTENTIAL ISSUES' as check_type,
  'Missing index: ' || ei.index_name as issue,
  '⚠ WARNING' as status
FROM expected_indexes ei
LEFT JOIN pg_indexes pi ON pi.indexname = ei.index_name AND pi.schemaname = 'public'
WHERE pi.indexname IS NULL;

-- =====================================================
-- VERIFICATION COMPLETE
-- =====================================================

SELECT '=== VERIFICATION COMPLETE ===' as message;