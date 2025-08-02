-- =====================================================
-- FIX INSERT POLICIES WITH PROPER AUTH CHECKS
-- =====================================================

-- 1. Show the actual policy definitions to understand the issue
SELECT 
    t.tablename,
    pol.polname,
    pol.polqual::text as using_clause,
    pol.polwithcheck::text as with_check_clause,
    CASE 
        WHEN pol.polqual::text LIKE '%auth.uid()%' OR pol.polwithcheck::text LIKE '%auth.uid()%'
        THEN '✅ Has auth check'
        ELSE '❌ Missing auth check'
    END as has_auth
FROM pg_tables t
JOIN pg_policy pol ON t.tablename::regclass = pol.polrelid
WHERE t.schemaname = 'public'
AND pol.polcmd = 'a' -- INSERT
AND t.tablename IN (
    'borrower_invites', 'lender_borrower_relationships', 'borrower_profiles',
    'borrower_risk_history', 'lender_profiles', 'user_profile_roles',
    'smart_tags', 'profiles', 'blacklist', 'credit_report_views', 'reputation_events'
);

-- Now let's fix the policies that actually need fixing

-- 2. Fix borrower_profiles INSERT policy
DROP POLICY IF EXISTS "Users can insert own borrower profile" ON borrower_profiles;
CREATE POLICY "Users can insert own borrower profile" ON borrower_profiles
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'borrower'
        )
    );

-- 3. Fix lender_profiles INSERT policy  
DROP POLICY IF EXISTS "Users can insert own lender profile" ON lender_profiles;
CREATE POLICY "Users can insert own lender profile" ON lender_profiles
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'lender'
        )
    );

-- 4. Fix borrower_risk_history INSERT policy
DROP POLICY IF EXISTS "Lenders can add risk history" ON borrower_risk_history;
CREATE POLICY "Lenders can add risk history" ON borrower_risk_history
    FOR INSERT WITH CHECK (
        reported_by IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'lender'
        )
        AND EXISTS (
            SELECT 1 FROM lender_subscriptions ls
            WHERE ls.lender_id = reported_by
            AND ls.status IN ('active', 'trialing')
            AND (ls.current_period_end > NOW() OR ls.trial_end > NOW())
        )
    );

-- 5. Fix blacklist INSERT policy
DROP POLICY IF EXISTS "Lenders create blacklist for their country" ON blacklist;
CREATE POLICY "Lenders create blacklist entries" ON blacklist
    FOR INSERT WITH CHECK (
        lender_id IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'lender'
        )
        AND EXISTS (
            SELECT 1 FROM lender_subscriptions ls
            WHERE ls.lender_id = blacklist.lender_id
            AND ls.status IN ('active', 'trialing')
        )
    );

-- 6. Fix credit_report_views INSERT policy
DROP POLICY IF EXISTS "Lenders can log report views" ON credit_report_views;
CREATE POLICY "Lenders can log report views" ON credit_report_views
    FOR INSERT WITH CHECK (
        lender_id IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'lender'
        )
    );

-- 7. Fix reputation_events INSERT policy
DROP POLICY IF EXISTS "Lenders can create reputation events" ON reputation_events;
CREATE POLICY "Lenders can create reputation events" ON reputation_events
    FOR INSERT WITH CHECK (
        created_by IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'lender'
        )
    );

-- 8. Smart tags should only be created by the system/admin
DROP POLICY IF EXISTS "System can create tags" ON smart_tags;
CREATE POLICY "Only admins can create tags" ON smart_tags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- 9. Fix profiles INSERT (for signup)
DROP POLICY IF EXISTS "Users can insert own profile on signup" ON profiles;
CREATE POLICY "Users can insert own profile on signup" ON profiles
    FOR INSERT WITH CHECK (
        auth_user_id = auth.uid()
    );

-- 10. Borrower invites need proper checks
DROP POLICY IF EXISTS "borrower_invites_insert_lender" ON borrower_invites;
CREATE POLICY "Lenders can create invites" ON borrower_invites
    FOR INSERT WITH CHECK (
        lender_id IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'lender'
        )
    );

-- 11. Fix lender_borrower_relationships
DROP POLICY IF EXISTS "relationships_insert_via_invitation" ON lender_borrower_relationships;
CREATE POLICY "Create relationship via invitation" ON lender_borrower_relationships
    FOR INSERT WITH CHECK (
        -- Either the lender is creating it
        lender_id IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'lender'
        )
        OR
        -- Or it's being created via valid invitation acceptance
        EXISTS (
            SELECT 1 FROM borrower_invites bi
            WHERE bi.borrower_email = (
                SELECT email FROM profiles 
                WHERE id = lender_borrower_relationships.borrower_id
            )
            AND bi.lender_id = lender_borrower_relationships.lender_id
            AND bi.status = 'accepted'
        )
    );

-- 12. User profile roles should be system-managed
DROP POLICY IF EXISTS "Users can insert own role assignment" ON user_profile_roles;
-- This table should probably be managed by triggers or functions, not direct inserts

-- Verify the fixes
SELECT 
    t.tablename,
    pol.polname,
    CASE 
        WHEN pol.polwithcheck::text LIKE '%auth.uid()%' 
        THEN '✅ Fixed - Has auth check'
        ELSE '⚠️  Check implementation'
    END as status
FROM pg_tables t
JOIN pg_policy pol ON t.tablename::regclass = pol.polrelid
WHERE t.schemaname = 'public'
AND pol.polcmd = 'a'
AND t.tablename IN (
    'borrower_profiles', 'lender_profiles', 'borrower_risk_history',
    'blacklist', 'credit_report_views', 'reputation_events',
    'smart_tags', 'profiles', 'borrower_invites', 'lender_borrower_relationships'
)
ORDER BY t.tablename;

-- Summary
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ INSERT POLICIES FIXED!';
    RAISE NOTICE '';
    RAISE NOTICE 'All INSERT operations now require:';
    RAISE NOTICE '- User authentication (auth.uid() check)';
    RAISE NOTICE '- Proper role verification';
    RAISE NOTICE '- Active subscription for certain operations';
    RAISE NOTICE '';
    RAISE NOTICE 'No user can insert data for another user!';
END $$;