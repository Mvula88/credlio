-- =====================================================
-- COMPREHENSIVE RLS AUDIT FOR CREDLIO
-- =====================================================

-- 1. Check which tables have RLS enabled
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN c.relrowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS DISABLED'
    END as rls_status,
    CASE 
        WHEN tablename IN (
            'profiles', 'borrower_profiles', 'lender_profiles',
            'loan_requests', 'loan_offers', 'lender_subscriptions',
            'blacklist', 'notifications', 'active_loans',
            'loan_payments', 'profile_settings', 'borrower_invitations',
            'watchlist', 'borrower_risk_history'
        ) THEN 'CRITICAL - User Data'
        WHEN tablename IN (
            'subscription_plans', 'countries', 'user_roles'
        ) THEN 'Public Data - RLS Optional'
        ELSE 'Check Usage'
    END as data_sensitivity
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
ORDER BY data_sensitivity, tablename;

-- 2. List all RLS policies by table
SELECT 
    schemaname,
    tablename,
    pol.polname as policy_name,
    pol.polcmd as operation,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END as operation_type,
    pol.polroles::regrole[] as roles
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
LEFT JOIN pg_policy pol ON c.oid = pol.polrelid
WHERE schemaname = 'public'
AND pol.polname IS NOT NULL
ORDER BY tablename, pol.polcmd;

-- 3. CRITICAL SECURITY CHECKS

-- Check if borrowers can access lender subscriptions (SHOULD BE EMPTY)
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- This query simulates a borrower trying to access subscriptions
    SELECT COUNT(*) INTO v_count
    FROM pg_policy
    WHERE polrelid = 'lender_subscriptions'::regclass
    AND polname NOT LIKE '%lender%'
    AND polname NOT LIKE '%service%';
    
    IF v_count > 0 THEN
        RAISE NOTICE '❌ SECURITY ISSUE: Non-lender policies found on lender_subscriptions!';
    ELSE
        RAISE NOTICE '✅ GOOD: Only lenders can access lender_subscriptions';
    END IF;
END $$;

-- 4. Check for tables that should have RLS but don't
DO $$
DECLARE
    tbl RECORD;
    missing_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== TABLES MISSING RLS ===';
    
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE schemaname = 'public'
        AND NOT c.relrowsecurity
        AND tablename IN (
            'profiles', 'borrower_profiles', 'lender_profiles',
            'loan_requests', 'loan_offers', 'lender_subscriptions',
            'blacklist', 'notifications', 'active_loans',
            'loan_payments', 'profile_settings', 'borrower_invitations',
            'watchlist', 'borrower_risk_history', 'user_subscriptions'
        )
    LOOP
        RAISE NOTICE '❌ MISSING RLS: %', tbl.tablename;
        missing_count := missing_count + 1;
    END LOOP;
    
    IF missing_count = 0 THEN
        RAISE NOTICE '✅ All critical tables have RLS enabled!';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  Found % tables missing RLS!', missing_count;
    END IF;
END $$;

-- 5. Verify subscription-related RLS
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== SUBSCRIPTION RLS AUDIT ===';
    
    -- Check lender_subscriptions policies
    IF EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polrelid = 'lender_subscriptions'::regclass
    ) THEN
        RAISE NOTICE '✅ lender_subscriptions has policies';
        
        -- Check specific policies
        IF EXISTS (
            SELECT 1 FROM pg_policy 
            WHERE polrelid = 'lender_subscriptions'::regclass
            AND polname = 'Lenders can view own subscription'
        ) THEN
            RAISE NOTICE '  ✅ Lenders can view own subscription';
        ELSE
            RAISE NOTICE '  ❌ MISSING: Lenders view policy';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM pg_policy 
            WHERE polrelid = 'lender_subscriptions'::regclass
            AND polname = 'Service role can manage subscriptions'
        ) THEN
            RAISE NOTICE '  ✅ Service role can manage subscriptions';
        ELSE
            RAISE NOTICE '  ❌ MISSING: Service role policy';
        END IF;
    ELSE
        RAISE NOTICE '❌ lender_subscriptions has NO policies!';
    END IF;
END $$;

-- 6. Check profile-related RLS
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PROFILE RLS AUDIT ===';
    
    -- Check profiles table
    IF EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polrelid = 'profiles'::regclass
        AND polcmd = 'r' -- SELECT
    ) THEN
        RAISE NOTICE '✅ profiles table has SELECT policies';
    ELSE
        RAISE NOTICE '❌ profiles table missing SELECT policies';
    END IF;
    
    -- Check profile_settings
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE tablename = 'profile_settings'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM pg_policy 
            WHERE polrelid = 'profile_settings'::regclass
        ) THEN
            RAISE NOTICE '✅ profile_settings has policies';
        ELSE
            RAISE NOTICE '❌ profile_settings missing policies';
        END IF;
    END IF;
END $$;

-- 7. Security Summary
DO $$
DECLARE
    v_total_tables INTEGER;
    v_rls_enabled INTEGER;
    v_critical_unprotected INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_tables
    FROM pg_tables WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO v_rls_enabled
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE schemaname = 'public' AND c.relrowsecurity;
    
    SELECT COUNT(*) INTO v_critical_unprotected
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE schemaname = 'public' 
    AND NOT c.relrowsecurity
    AND tablename IN (
        'profiles', 'borrower_profiles', 'lender_profiles',
        'loan_requests', 'loan_offers', 'lender_subscriptions',
        'active_loans', 'loan_payments'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '=== RLS SECURITY SUMMARY ===';
    RAISE NOTICE 'Total tables: %', v_total_tables;
    RAISE NOTICE 'RLS enabled: %', v_rls_enabled;
    RAISE NOTICE 'Critical tables unprotected: %', v_critical_unprotected;
    
    IF v_critical_unprotected = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 All critical tables are protected with RLS!';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  SECURITY RISK: % critical tables lack RLS!', v_critical_unprotected;
    END IF;
END $$;

-- 8. List any overly permissive policies
SELECT 
    tablename,
    polname as policy_name,
    'WARNING' as status,
    'Check if this policy is too permissive' as note
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_policy pol ON c.oid = pol.polrelid
WHERE schemaname = 'public'
AND (
    pol.polqual::text LIKE '%true%' 
    OR pol.polwithcheck::text LIKE '%true%'
)
AND tablename NOT IN ('countries', 'subscription_plans'); -- These can be public

-- Final message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 RLS Audit Complete!';
    RAISE NOTICE 'Review the output above for any ❌ marks that need attention.';
END $$;