-- Create a personal admin system where only you control everything
-- First, ensure you have the super_admin role
INSERT INTO user_roles (role_name, description) VALUES 
('super_admin', 'Full platform administrator with all permissions'),
('country_admin', 'Can view and manage specific country data')
ON CONFLICT (role_name) DO NOTHING;

-- Create admin_country_access table for you to switch between countries
CREATE TABLE IF NOT EXISTS admin_country_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('super_admin', 'country_admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, country_id, access_type)
);

-- Enable RLS
ALTER TABLE admin_country_access ENABLE ROW LEVEL SECURITY;

-- Only you can see and manage this table
CREATE POLICY "Only super admins can manage country access" ON admin_country_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_profile_roles upr ON p.id = upr.profile_id
      JOIN user_roles ur ON upr.role_id = ur.id
      WHERE p.auth_user_id = auth.uid()
      AND ur.role_name = 'super_admin'
    )
  );

-- Update auth functions for your personal control
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

-- Function to check if you can access a specific country
CREATE OR REPLACE FUNCTION auth.can_access_country(target_country_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admins (you) can access everything
  IF auth.is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- Check if you have specific country access
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    JOIN admin_country_access aca ON p.id = aca.profile_id
    WHERE p.auth_user_id = auth.uid()
    AND aca.country_id = target_country_id
    AND aca.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get your accessible countries
CREATE OR REPLACE FUNCTION auth.get_accessible_countries()
RETURNS TABLE(country_id UUID, country_name TEXT, country_code TEXT, access_type TEXT) AS $$
BEGIN
  -- If super admin, return all countries
  IF auth.is_super_admin() THEN
    RETURN QUERY
    SELECT c.id, c.name, c.code, 'super_admin'::TEXT
    FROM countries c
    ORDER BY c.name;
  ELSE
    -- Return only countries you have access to
    RETURN QUERY
    SELECT c.id, c.name, c.code, aca.access_type
    FROM profiles p
    JOIN admin_country_access aca ON p.id = aca.profile_id
    JOIN countries c ON aca.country_id = c.id
    WHERE p.auth_user_id = auth.uid()
    AND aca.is_active = true
    ORDER BY c.name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set your current country context (for country admin view)
CREATE OR REPLACE FUNCTION auth.set_country_context(target_country_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Only you can set country context
  IF NOT auth.is_super_admin() THEN
    RETURN false;
  END IF;
  
  -- Store in a session variable or handle in application
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to respect your access control
CREATE OR REPLACE FUNCTION auth.get_accessible_country_ids()
RETURNS UUID[] AS $$
DECLARE
  country_ids UUID[];
BEGIN
  -- Super admins get all countries
  IF auth.is_super_admin() THEN
    SELECT ARRAY(SELECT id FROM countries) INTO country_ids;
    RETURN country_ids;
  END IF;
  
  -- Get countries you have access to
  SELECT ARRAY(
    SELECT aca.country_id 
    FROM profiles p
    JOIN admin_country_access aca ON p.id = aca.profile_id
    WHERE p.auth_user_id = auth.uid()
    AND aca.is_active = true
  ) INTO country_ids;
  
  RETURN COALESCE(country_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
