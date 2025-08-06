-- ============================================
-- VERIFY BACKEND SETUP IS COMPLETE
-- ============================================

-- Check that all tables exist
SELECT 'Tables Created:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('audit_logs', 'risk_alerts', 'notifications', 'support_tickets')
ORDER BY table_name;

-- Check that functions exist
SELECT 'Dashboard Functions Created:' as info;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_lender_stats', 'get_borrower_stats', 'get_admin_system_stats', 'get_country_admin_stats', 'get_platform_revenue_stats')
ORDER BY routine_name;

-- Test admin stats function
SELECT 'Admin Dashboard Stats:' as info;
SELECT * FROM get_admin_system_stats();

-- Check your admin status
SELECT 'Your Admin Status:' as info;
SELECT 
    email,
    full_name,
    role,
    verified,
    credit_score,
    reputation_score,
    CASE 
        WHEN role = 'super_admin' THEN '✅ READY - Full Admin Access'
        ELSE '❌ Not Admin'
    END as status
FROM profiles
WHERE email = 'inekela34@gmail.com';