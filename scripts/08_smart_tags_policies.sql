-- Smart tags table policies
-- Everyone can see smart tags
CREATE POLICY smart_tags_all_select ON smart_tags
  FOR SELECT USING (true);

-- Only admins can modify smart tags
CREATE POLICY smart_tags_admin_all ON smart_tags
  USING (
    auth.is_country_admin() OR auth.is_super_admin()
  );

-- Borrower smart tags policies
-- Super admins can see all borrower smart tags
CREATE POLICY borrower_smart_tags_super_admin_select ON borrower_smart_tags
  FOR SELECT USING (auth.is_super_admin());

-- Country admins can see borrower smart tags in their country
CREATE POLICY borrower_smart_tags_country_admin_select ON borrower_smart_tags
  FOR SELECT USING (
    auth.is_country_admin() AND
    country_id = auth.get_current_user_country_id()
  );

-- Lenders can see borrower smart tags in their country
CREATE POLICY borrower_smart_tags_lender_select ON borrower_smart_tags
  FOR SELECT USING (
    auth.user_has_role('lender') AND
    country_id = auth.get_current_user_country_id()
  );

-- Borrowers can see their own smart tags
CREATE POLICY borrower_smart_tags_borrower_select ON borrower_smart_tags
  FOR SELECT USING (
    borrower_profile_id = auth.get_current_profile_id()
  );

-- Only admins can assign smart tags manually
CREATE POLICY borrower_smart_tags_admin_insert ON borrower_smart_tags
  FOR INSERT WITH CHECK (
    ((auth.is_country_admin() AND country_id = auth.get_current_user_country_id()) OR
    auth.is_super_admin()) AND
    assigned_automatically = false
  );

-- System can assign smart tags automatically
CREATE POLICY borrower_smart_tags_system_insert ON borrower_smart_tags
  FOR INSERT WITH CHECK (
    assigned_automatically = true
  );
