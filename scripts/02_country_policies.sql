-- Countries table policies
-- Super admins can see all countries
CREATE POLICY countries_super_admin_select ON countries
  FOR SELECT USING (auth.is_super_admin());

-- Country admins, lenders, and borrowers can only see their own country
CREATE POLICY countries_users_select ON countries
  FOR SELECT USING (
    id = auth.get_current_user_country_id()
  );

-- Only super admins can modify countries
CREATE POLICY countries_super_admin_all ON countries
  USING (auth.is_super_admin());
