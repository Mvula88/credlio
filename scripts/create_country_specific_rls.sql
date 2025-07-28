-- Update all existing RLS policies to include country isolation

-- Profiles: Users can only see profiles from their country
DROP POLICY IF EXISTS "profiles_country_isolation" ON profiles;
CREATE POLICY "profiles_country_isolation" ON profiles
  FOR SELECT USING (
    country_id = (
      SELECT country_id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Loan requests: Only see requests from same country
DROP POLICY IF EXISTS "loan_requests_country_isolation" ON loan_requests;
CREATE POLICY "loan_requests_country_isolation" ON loan_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p1, profiles p2 
      WHERE p1.auth_user_id = auth.uid() 
      AND p2.id = loan_requests.borrower_profile_id
      AND p1.country_id = p2.country_id
    )
  );

-- Blacklisted borrowers: Only see blacklists from same country
DROP POLICY IF EXISTS "blacklisted_borrowers_country_isolation" ON blacklisted_borrowers;
CREATE POLICY "blacklisted_borrowers_country_isolation" ON blacklisted_borrowers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p1, profiles p2 
      WHERE p1.auth_user_id = auth.uid() 
      AND p2.id = blacklisted_borrowers.borrower_profile_id
      AND p1.country_id = p2.country_id
    )
  );

-- Notifications: Only see own notifications
DROP POLICY IF EXISTS "notifications_own_only" ON notifications;
CREATE POLICY "notifications_own_only" ON notifications
  FOR SELECT USING (
    profile_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- Watchlist: Only see own watchlist
DROP POLICY IF EXISTS "watchlist_own_only" ON lender_watchlist;
CREATE POLICY "watchlist_own_only" ON lender_watchlist
  FOR SELECT USING (
    lender_profile_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );
