-- Add RLS policies using the CORRECT column names

-- 1. NOTIFICATIONS - uses profile_id not user_id
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (profile_id = auth.uid());

-- 2. LOAN_OFFERS - uses lender_profile_id
DROP POLICY IF EXISTS "Borrowers can view offers" ON loan_offers;
DROP POLICY IF EXISTS "Lenders can manage offers" ON loan_offers;

-- Borrowers can see offers for their loan requests
CREATE POLICY "Borrowers can view offers"
  ON loan_offers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loan_requests lr
      WHERE lr.id = loan_offers.loan_request_id
      AND lr.borrower_id = auth.uid()
    )
  );

-- Lenders can manage their own offers
CREATE POLICY "Lenders can manage offers"
  ON loan_offers FOR ALL
  USING (lender_profile_id = auth.uid());

-- 3. BORROWER_INVITATIONS - uses lender_profile_id
DROP POLICY IF EXISTS "Public can view valid invitations" ON borrower_invitations;
DROP POLICY IF EXISTS "Lenders can manage invitations" ON borrower_invitations;

-- Anyone can view invitations (needed for signup with invitation code)
CREATE POLICY "Public can view valid invitations"
  ON borrower_invitations FOR SELECT
  USING (true);

-- Lenders can manage their own invitations
CREATE POLICY "Lenders can manage invitations"
  ON borrower_invitations FOR ALL
  USING (lender_profile_id = auth.uid());

-- 4. WATCHLIST - uses lender_profile_id and borrower_profile_id
DROP POLICY IF EXISTS "Lenders can view watchlist" ON watchlist;
DROP POLICY IF EXISTS "Lenders can manage watchlist" ON watchlist;

-- Lenders can view and manage their watchlist
CREATE POLICY "Lenders can view watchlist"
  ON watchlist FOR SELECT
  USING (lender_profile_id = auth.uid());

CREATE POLICY "Lenders can manage watchlist"
  ON watchlist FOR ALL
  USING (lender_profile_id = auth.uid());

-- 5. Verify all policies were created successfully
SELECT 
    t.tablename,
    COUNT(pol.polname) as policy_count,
    CASE 
        WHEN COUNT(pol.polname) = 0 THEN '❌ Still missing policies!'
        ELSE '✅ Has ' || COUNT(pol.polname) || ' policies'
    END as status,
    string_agg(pol.polname, ', ' ORDER BY pol.polname) as policy_names
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
LEFT JOIN pg_policy pol ON c.oid = pol.polrelid
WHERE t.schemaname = 'public'
AND t.tablename IN ('notifications', 'loan_offers', 'borrower_invitations', 'watchlist')
GROUP BY t.tablename
ORDER BY t.tablename;

-- 6. Show final summary of all important tables
SELECT '=== FINAL RLS STATUS ===' as info;
SELECT 
    t.tablename,
    CASE 
        WHEN c.relrowsecurity = true THEN '✅ RLS ON'
        ELSE '❌ RLS OFF'
    END as rls_enabled,
    COUNT(pol.polname) as policies,
    CASE 
        WHEN c.relrowsecurity = true AND COUNT(pol.polname) = 0 THEN '❌ BROKEN - Has RLS but no policies!'
        WHEN c.relrowsecurity = true AND COUNT(pol.polname) > 0 THEN '✅ Secured'
        ELSE '➖ No RLS'
    END as security_status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
LEFT JOIN pg_policy pol ON c.oid = pol.polrelid
WHERE t.schemaname = 'public'
AND t.tablename IN (
    'profiles', 'borrower_profiles', 'loan_requests', 'loan_offers',
    'notifications', 'borrower_invitations', 'subscription_plans',
    'smart_tags', 'reputation_badges', 'watchlist', 'blacklisted_borrowers',
    'active_loans', 'borrower_risk_history'
)
GROUP BY t.tablename, c.relrowsecurity
ORDER BY 
    CASE 
        WHEN c.relrowsecurity = true AND COUNT(pol.polname) = 0 THEN 0
        WHEN c.relrowsecurity = false THEN 1
        ELSE 2
    END,
    t.tablename;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Policies added using correct column names!';
    RAISE NOTICE '';
    RAISE NOTICE 'Key mappings used:';
    RAISE NOTICE '- notifications: profile_id (not user_id)';
    RAISE NOTICE '- loan_offers: lender_profile_id (not lender_id)';
    RAISE NOTICE '- borrower_invitations: lender_profile_id';
    RAISE NOTICE '- watchlist: lender_profile_id & borrower_profile_id';
END $$;