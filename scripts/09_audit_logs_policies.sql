-- Audit logs table policies
-- Super admins can see all audit logs
CREATE POLICY audit_logs_super_admin_select ON audit_logs
  FOR SELECT USING (auth.is_super_admin());

-- Country admins can see audit logs in their country
CREATE POLICY audit_logs_country_admin_select ON audit_logs
  FOR SELECT USING (
    auth.is_country_admin() AND
    country_id = auth.get_current_user_country_id()
  );

-- Users can see audit logs where they are the actor
CREATE POLICY audit_logs_actor_select ON audit_logs
  FOR SELECT USING (
    actor_profile_id = auth.get_current_profile_id()
  );

-- System can insert audit logs
CREATE POLICY audit_logs_system_insert ON audit_logs
  FOR INSERT WITH CHECK (true);

-- No one can update or delete audit logs
