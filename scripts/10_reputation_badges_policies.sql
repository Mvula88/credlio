-- Reputation badges table policies
-- Everyone can see reputation badges
CREATE POLICY reputation_badges_all_select ON reputation_badges
  FOR SELECT USING (true);

-- Only admins can modify reputation badges
CREATE POLICY reputation_badges_admin_all ON reputation_badges
  USING (
    auth.is_country_admin() OR auth.is_super_admin()
  );

-- User badges policies
-- Super admins can see all user badges
CREATE POLICY user_badges_super_admin_select ON user_badges
  FOR SELECT USING (auth.is_super_admin());

-- Country admins can see user badges in their country
CREATE POLICY user_badges_country_admin_select ON user_badges
  FOR SELECT USING (
    auth.is_country_admin() AND
    country_id = auth.get_current_user_country_id()
  );

-- Users can see their own badges
CREATE POLICY user_badges_user_select ON user_badges
  FOR SELECT USING (
    profile_id = auth.get_current_profile_id()
  );

-- Users can see badges of other users in their country
CREATE POLICY user_badges_country_users_select ON user_badges
  FOR SELECT USING (
    country_id = auth.get_current_user_country_id()
  );

-- Only admins can award badges manually
CREATE POLICY user_badges_admin_insert ON user_badges
  FOR INSERT WITH CHECK (
    (auth.is_country_admin() AND country_id = auth.get_current_user_country_id()) OR
    auth.is_super_admin()
  );

-- Only admins can revoke badges
CREATE POLICY user_badges_admin_delete ON user_badges
  FOR DELETE USING (
    (auth.is_country_admin() AND country_id = auth.get_current_user_country_id()) OR
    auth.is_super_admin()
  );
