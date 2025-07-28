-- Notifications table policies
-- Users can only see their own notifications
CREATE POLICY notifications_user_select ON notifications
  FOR SELECT USING (
    recipient_profile_id = auth.get_current_profile_id()
  );

-- Users can only update their own notifications (e.g., mark as read)
CREATE POLICY notifications_user_update ON notifications
  FOR UPDATE USING (
    recipient_profile_id = auth.get_current_profile_id()
  );

-- System can insert notifications for any user
CREATE POLICY notifications_system_insert ON notifications
  FOR INSERT WITH CHECK (true);

-- Super admins can see all notifications
CREATE POLICY notifications_super_admin_select ON notifications
  FOR SELECT USING (auth.is_super_admin());

-- Country admins can see notifications in their country
CREATE POLICY notifications_country_admin_select ON notifications
  FOR SELECT USING (
    auth.is_country_admin() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = notifications.recipient_profile_id
      AND profiles.country_id = auth.get_current_user_country_id()
    )
  );
