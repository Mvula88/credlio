-- ============================================
-- SIMPLE ADMIN SETUP (Without Logging)
-- Run this if you get permission errors
-- ============================================

-- Just create the function to check admin role
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = user_id 
    AND role IN ('admin', 'super_admin', 'country_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user TO anon;