-- Loan requests table policies
-- Super admins can see all loan requests
CREATE POLICY loan_requests_super_admin_select ON loan_requests
  FOR SELECT USING (auth.is_super_admin());

-- Country admins can see all loan requests in their country
CREATE POLICY loan_requests_country_admin_select ON loan_requests
  FOR SELECT USING (
    auth.is_country_admin() AND
    country_id = auth.get_current_user_country_id()
  );

-- Borrowers can see their own loan requests
CREATE POLICY loan_requests_borrower_select ON loan_requests
  FOR SELECT USING (
    auth.user_has_role('borrower') AND
    borrower_profile_id = auth.get_current_profile_id()
  );

-- Lenders can see loan requests in their country that are in the marketplace
CREATE POLICY loan_requests_lender_select ON loan_requests
  FOR SELECT USING (
    auth.user_has_role('lender') AND
    country_id = auth.get_current_user_country_id() AND
    status = 'pending_lender_acceptance'
  );

-- Lenders can see loan requests they've funded
CREATE POLICY loan_requests_lender_funded_select ON loan_requests
  FOR SELECT USING (
    auth.user_has_role('lender') AND
    lender_profile_id = auth.get_current_profile_id()
  );

-- Borrowers can create loan requests
CREATE POLICY loan_requests_borrower_insert ON loan_requests
  FOR INSERT WITH CHECK (
    auth.user_has_role('borrower') AND
    borrower_profile_id = auth.get_current_profile_id() AND
    country_id = auth.get_current_user_country_id()
  );

-- Borrowers can update their own loan requests (only if status allows)
CREATE POLICY loan_requests_borrower_update ON loan_requests
  FOR UPDATE USING (
    auth.user_has_role('borrower') AND
    borrower_profile_id = auth.get_current_profile_id() AND
    status IN ('draft', 'pending_admin_approval')
  );

-- Lenders can update loan requests they're funding
CREATE POLICY loan_requests_lender_update ON loan_requests
  FOR UPDATE USING (
    auth.user_has_role('lender') AND
    lender_profile_id = auth.get_current_profile_id()
  );

-- Country admins can update loan requests in their country
CREATE POLICY loan_requests_country_admin_update ON loan_requests
  FOR UPDATE USING (
    auth.is_country_admin() AND
    country_id = auth.get_current_user_country_id()
  );

-- Super admins can do anything with loan requests
CREATE POLICY loan_requests_super_admin_all ON loan_requests
  USING (auth.is_super_admin());
