-- Check which tables have RLS enabled and which need it

-- 1. Check current RLS status for all tables
SELECT 
    tablename,
    CASE 
        WHEN c.relrowsecurity = true THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as rls_status,
    CASE 
        WHEN tablename IN (
            'profiles', 'borrower_profiles', 'loan_requests', 'loan_offers',
            'notifications', 'subscription_plans', 'subscription_usage', 
            'stripe_customers', 'stripe_subscriptions', 'borrower_invitations',
            'recent_searches', 'countries', 'payment_proof_uploads', 
            'smart_tags', 'reputation_badges', 'profile_views', 
            'borrower_risk_history', 'active_loans', 'loan_payments'
        ) THEN 'Yes - Contains user data'
        WHEN tablename IN ('currencies', 'roles') THEN 'No - Public reference data'
        ELSE 'Maybe - Check usage'
    END as needs_rls
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
ORDER BY needs_rls DESC, tablename;

-- 2. Tables that MUST have RLS (user-specific data)
-- These contain private user information or user-specific records
DO $$
DECLARE
    tbl TEXT;
    tables_needing_rls TEXT[] := ARRAY[
        'profiles',
        'borrower_profiles', 
        'loan_requests',
        'loan_offers',
        'notifications',
        'subscription_plans',
        'subscription_usage',
        'stripe_customers',
        'stripe_subscriptions',
        'borrower_invitations',
        'recent_searches',
        'payment_proof_uploads',
        'smart_tags',
        'reputation_badges',
        'profile_views',
        'borrower_risk_history',
        'active_loans',
        'loan_payments'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_needing_rls
    LOOP
        -- Check if table exists and RLS is not enabled
        IF EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE tablename = tbl 
            AND schemaname = 'public'
        ) AND NOT EXISTS (
            SELECT 1 FROM pg_class 
            WHERE relname = tbl 
            AND relrowsecurity = true
        ) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
            RAISE NOTICE 'Enabled RLS on table: %', tbl;
        END IF;
    END LOOP;
END $$;

-- 3. Tables that DON'T need RLS (public/reference data)
-- These are lookup tables that all users can read
/*
Tables that DON'T need RLS:
- currencies: Public currency reference data
- roles: Public role definitions
- countries: Public country list (though has RLS for admin features)
*/

-- 4. Check for tables with RLS but no policies (common mistake)
SELECT 
    c.relname as table_name,
    COUNT(pol.polname) as policy_count,
    CASE 
        WHEN COUNT(pol.polname) = 0 THEN '⚠️ RLS enabled but NO POLICIES!'
        ELSE '✅ Has ' || COUNT(pol.polname) || ' policies'
    END as status
FROM pg_class c
LEFT JOIN pg_policy pol ON c.oid = pol.polrelid
WHERE c.relrowsecurity = true
GROUP BY c.relname
ORDER BY policy_count, c.relname;

-- 5. Summary message
DO $$
DECLARE
    rls_enabled_count INTEGER;
    no_policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO rls_enabled_count
    FROM pg_class c
    JOIN pg_tables t ON c.relname = t.tablename
    WHERE c.relrowsecurity = true
    AND t.schemaname = 'public';
    
    SELECT COUNT(*) INTO no_policy_count
    FROM pg_class c
    LEFT JOIN pg_policy pol ON c.oid = pol.polrelid
    WHERE c.relrowsecurity = true
    GROUP BY c.relname
    HAVING COUNT(pol.polname) = 0;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== RLS Summary ===';
    RAISE NOTICE 'Tables with RLS enabled: %', rls_enabled_count;
    RAISE NOTICE 'Tables with RLS but no policies: %', no_policy_count;
    RAISE NOTICE '';
    RAISE NOTICE 'If you see tables with RLS but no policies, they need policies added!';
END $$;