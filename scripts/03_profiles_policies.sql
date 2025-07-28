-- Profiles table policies
-- Super admins can see all profiles
CREATE POLICY profiles_super_admin_select ON profiles
  FOR SELECT USING (auth.is_super_admin());

-- Country admins can see all profiles in their country
CREATE POLICY profiles_country_admin_select ON profiles
  FOR SELECT USING (
    auth.is_country_admin() AND
    country_id = auth.get_current_user_country_id()
  );

-- Users can see their own profile
CREATE POLICY profiles_self_select ON profiles
  FOR SELECT USING (
    id = auth.get_current_profile_id()
  );

-- Lenders can see borrower profiles in their country
CREATE POLICY profiles_lender_select_borrowers ON profiles
  FOR SELECT USING (
    auth.user_has_role('lender') AND
    country_id = auth.get_current_user_country_id() AND
    EXISTS (
      SELECT 1 FROM user_profile_roles upr
      JOIN user_roles ur ON upr.role_id = ur.id
      WHERE upr.profile_id = profiles.id
      AND ur.role_name = 'borrower'
    )
  );

-- Users can update their own profile
CREATE POLICY profiles_self_update ON profiles
  FOR UPDATE USING (
    id = auth.get_current_profile_id()
  );

-- Country admins can update profiles in their country
CREATE POLICY profiles_country_admin_update ON profiles
  FOR UPDATE USING (
    auth.is_country_admin() AND
    country_id = auth.get_current_user_country_id()
  );

-- Super admins can do anything with profiles
CREATE POLICY profiles_super_admin_all ON profiles
  USING (auth.is_super_admin());
