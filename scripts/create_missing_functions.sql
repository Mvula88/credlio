-- Create the missing auth.is_super_admin() function
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current user has super admin role
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_profile_roles upr ON p.id = upr.profile_id
    JOIN user_roles ur ON upr.role_id = ur.id
    WHERE p.auth_user_id = auth.uid()
    AND ur.role_name = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_profile_roles upr ON p.id = upr.profile_id
    JOIN user_roles ur ON upr.role_id = ur.id
    WHERE p.auth_user_id = auth.uid()
    AND ur.role_name IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has specific role
CREATE OR REPLACE FUNCTION auth.has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_profile_roles upr ON p.id = upr.profile_id
    JOIN user_roles ur ON upr.role_id = ur.id
    WHERE p.auth_user_id = auth.uid()
    AND ur.role_name = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
