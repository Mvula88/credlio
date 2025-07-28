-- Lender watchlist table policies
-- Lenders can only see their own watchlist
CREATE POLICY lender_watchlist_lender_select ON lender_watchlist
  FOR SELECT USING (
    lender_profile_id = auth.get_current_profile_id()
  );

-- Lenders can only modify their own watchlist
CREATE POLICY lender_watchlist_lender_all ON lender_watchlist
  USING (
    lender_profile_id = auth.get_current_profile_id()
  );

-- Country admins can see watchlists in their country
CREATE POLICY lender_watchlist_country_admin_select ON lender_watchlist
  FOR SELECT USING (
    auth.is_country_admin() AND
    country_id = auth.get_current_user_country_id()
  );

-- Super admins can see all watchlists
CREATE POLICY lender_watchlist_super_admin_select ON lender_watchlist
  FOR SELECT USING (auth.is_super_admin());
