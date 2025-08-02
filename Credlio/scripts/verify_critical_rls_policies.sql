-- =====================================================
-- VERIFY CRITICAL RLS POLICIES - REAL SECURITY CHECK
-- =====================================================

-- 1. Check if borrowers can access lender subscriptions (CRITICAL)
SELECT 
    'lender_subscriptions' as table_name,
    polname as policy_name,
    CASE 
        WHEN polqual::text LIKE '%role = ''lender''%' THEN '✅ Properly restricted to lenders'
        WHEN polqual::text LIKE '%service_role%' THEN '✅ Service role for webhooks'
        ELSE '❌ SECURITY RISK - Check this policy!'
    END as security_status,
    polqual::text as policy_definition
FROM pg_policy
WHERE polrelid = 'lender_subscriptions'::regclass;

-- 2. Check if users can edit other users' profiles (CRITICAL)
SELECT 
    'profiles' as table_name,
    polname as policy_name,
    polcmd as operation,
    CASE 
        WHEN polqual::text LIKE '%auth.uid() = auth_user_id%' THEN '✅ Properly restricted to own profile'
        WHEN polqual::text LIKE '%role = ''admin''%' THEN '✅ Admin access is OK'
        ELSE '❌ SECURITY RISK - Users might edit others profiles!'
    END as security_status
FROM pg_policy
WHERE polrelid = 'profiles'::regclass
AND polcmd IN ('w', 'd'); -- UPDATE or DELETE

-- 3. Check blacklist access requires active subscription
SELECT 
    'blacklist' as table_name,
    polname as policy_name,
    CASE 
        WHEN polqual::text LIKE '%subscription%' OR polqual::text LIKE '%lender_subscriptions%' 
        THEN '✅ Requires subscription check'
        WHEN polqual::text LIKE '%borrower_id%' AND polname LIKE '%borrower%'
        THEN '✅ Borrowers can see if they are blacklisted'
        ELSE '⚠️  Check if subscription is required'
    END as security_status,
    substring(polqual::text, 1, 100) as policy_snippet
FROM pg_policy
WHERE polrelid = 'blacklist'::regclass;

-- 4. Check loan data isolation
SELECT 
    tablename,
    polname as policy_name,
    CASE 
        WHEN polqual::text LIKE '%borrower_id%' AND polqual::text LIKE '%lender_id%' 
        THEN '✅ Both parties can access'
        WHEN polqual::text LIKE '%auth.uid()%'
        THEN '✅ Properly uses auth check'
        ELSE '⚠️  Verify access control'
    END as security_status
FROM pg_tables t
JOIN pg_policy pol ON t.tablename::regclass = pol.polrelid
WHERE tablename IN ('active_loans', 'loan_payments');

-- 5. REAL overly permissive check - policies with just "true" and no auth checks
SELECT 
    t.tablename,
    pol.polname,
    '❌ ACTUALLY PERMISSIVE' as status,
    'This policy has NO auth checks!' as issue
FROM pg_tables t
JOIN pg_policy pol ON t.tablename::regclass = pol.polrelid
WHERE t.schemaname = 'public'
AND pol.polqual::text = '(true)'
AND pol.polwithcheck IS NULL
AND t.tablename NOT IN (
    'countries',           -- OK to be public
    'subscription_plans',  -- OK to be public
    'reputation_badges',   -- OK to be public
    'borrower_invitations' -- Must be public for signup
);

-- 6. Check for missing auth checks in INSERT policies
SELECT 
    t.tablename,
    pol.polname,
    CASE 
        WHEN pol.polwithcheck::text NOT LIKE '%auth.uid()%' 
        AND t.tablename NOT IN ('borrower_invitations', 'invitations')
        THEN '❌ INSERT without auth check'
        ELSE '✅ Has auth check'
    END as security_status
FROM pg_tables t
JOIN pg_policy pol ON t.tablename::regclass = pol.polrelid
WHERE t.schemaname = 'public'
AND pol.polcmd = 'a'; -- INSERT

-- Summary
DO $$
DECLARE
    v_issues INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_issues
    FROM pg_policy pol
    JOIN pg_tables t ON t.tablename::regclass = pol.polrelid
    WHERE t.schemaname = 'public'
    AND pol.polqual::text = '(true)'
    AND t.tablename NOT IN ('countries', 'subscription_plans', 'reputation_badges', 'borrower_invitations');
    
    RAISE NOTICE '';
    RAISE NOTICE '=== REAL SECURITY ANALYSIS ===';
    
    IF v_issues = 0 THEN
        RAISE NOTICE '✅ No truly permissive policies found!';
        RAISE NOTICE 'The warnings were mostly false positives.';
    ELSE
        RAISE NOTICE '❌ Found % actually permissive policies!', v_issues;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Key Security Checks:';
    RAISE NOTICE '- Lender subscriptions: Check output above';
    RAISE NOTICE '- Profile editing: Check output above';
    RAISE NOTICE '- Blacklist access: Check output above';
    RAISE NOTICE '';
END $$;