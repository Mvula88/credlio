-- Clean up and create ONE unified admin system where you control everything
-- Drop the confusing tables first
DROP TABLE IF EXISTS country_admins CASCADE;
DROP TABLE IF EXISTS admin_country_access CASCADE;

-- Ensure user roles exist
INSERT INTO user_roles (role_name, description) VALUES 
('super_admin', 'Platform owner with full global access'),
('country_viewer', 'Can view specific country data (controlled by super admin)')
ON CONFLICT (role_name) DO NOTHING;

-- Create a simple country viewing preferences table (only for you)
CREATE TABLE IF NOT EXISTS admin_country_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_country_id UUID REFERENCES countries(id),
  view_mode TEXT NOT NULL DEFAULT 'global' CHECK (view_mode IN ('global', 'country_specific')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- Enable RLS
ALTER TABLE admin_country_preferences ENABLE ROW LEVEL SECURITY;

-- Only super admins (you) can manage preferences
CREATE POLICY "Only super admins can manage preferences" ON admin_country_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_profile_roles upr ON p.id = upr.profile_id
      JOIN user_roles ur ON upr.role_id = ur.id
      WHERE p.auth_user_id = auth.uid()
      AND ur.role_name = 'super_admin'
    )
  );

-- Simple auth functions
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_profile_roles upr ON p.id = upr.profile_id
    JOIN user_roles ur ON upr.role_id = ur.id
    WHERE p.auth_user_id = auth.uid()
    AND ur.role_name = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.is_super_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_profile_roles upr ON p.id = upr.profile_id
    JOIN user_roles ur ON upr.role_id = ur.id
    WHERE p.auth_user_id = auth.uid()
    AND ur.role_name = has_role.role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get your current view preference
CREATE OR REPLACE FUNCTION auth.get_admin_view_preference()
RETURNS TABLE(view_mode TEXT, country_id UUID, country_name TEXT, country_code TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(acp.view_mode, 'global') as view_mode,
    c.id as country_id,
    c.name as country_name,
    c.code as country_code
  FROM profiles p
  LEFT JOIN admin_country_preferences acp ON p.id = acp.profile_id
  LEFT JOIN countries c ON acp.preferred_country_id = c.id
  WHERE p.auth_user_id = auth.uid()
  AND auth.is_super_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
