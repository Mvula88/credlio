-- Blacklisted borrowers table policies
-- Super admins can see all blacklisted borrowers
CREATE POLICY blacklisted_borrowers_super_admin_select ON blacklisted_borrowers
  FOR SELECT USING (auth.is_super_admin());

-- Country admins can see all blacklisted borrowers in their country
CREATE POLICY blacklisted_borrowers_country_admin_select ON blacklisted_borrowers
  FOR SELECT USING (
    auth.is_country_admin() AND
    country_id = auth.get_current_user_country_id()
  );

-- Lenders can see blacklisted borrowers they reported
CREATE POLICY blacklisted_borrowers_lender_select ON blacklisted_borrowers
  FOR SELECT USING (
    auth.user_has_role('lender') AND
    lender_profile_id = auth.get_current_profile_id()
  );

-- Lenders can see if a borrower is blacklisted in their country
CREATE POLICY blacklisted_borrowers_lender_country_select ON blacklisted_borrowers
  FOR SELECT USING (
    auth.user_has_role('lender') AND
    country_id = auth.get_current_user_country_id() AND
    is_active = true
  );

-- Lenders can create blacklist reports
CREATE POLICY blacklisted_borrowers_lender_insert ON blacklisted_borrowers
  FOR INSERT WITH CHECK (
    auth.user_has_role('lender') AND
    lender_profile_id = auth.get_current_profile_id() AND
    country_id = auth.get_current_user_country_id()
  );

-- Only admins can update blacklist status
CREATE POLICY blacklisted_borrowers_admin_update ON blacklisted_borrowers
  FOR UPDATE USING (
    (auth.is_country_admin() AND country_id = auth.get_current_user_country_id()) OR
    auth.is_super_admin()
  );
