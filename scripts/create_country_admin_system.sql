-- First, let's update the user_roles table to include country admin
INSERT INTO user_roles (role_name, description) VALUES 
('country_admin', 'Administrator for a specific country with regional management permissions')
ON CONFLICT (role_name) DO NOTHING;

-- Create country_admins table to manage which admin manages which country
CREATE TABLE IF NOT EXISTS country_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"can_manage_users": true, "can_view_analytics": true, "can_manage_blacklist": true, "can_approve_loans": false}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, country_id)
);

-- Enable RLS on country_admins
ALTER TABLE country_admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for country_admins
CREATE POLICY "Super admins can manage all country admins" ON country_admins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_profile_roles upr ON p.id = upr.profile_id
      JOIN user_roles ur ON upr.role_id = ur.id
      WHERE p.auth_user_id = auth.uid()
      AND ur.role_name = 'super_admin'
    )
  );

CREATE POLICY "Country admins can view their own assignments" ON country_admins
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Update the auth functions to include country admin checks
CREATE OR REPLACE FUNCTION auth.is_country_admin(target_country_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  -- If no country specified, check if user is any country admin
  IF target_country_id IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_profile_roles upr ON p.id = upr.profile_id
      JOIN user_roles ur ON upr.role_id = ur.id
      WHERE p.auth_user_id = auth.uid()
      AND ur.role_name = 'country_admin'
    );
  END IF;
  
  -- Check if user is admin for specific country
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    JOIN country_admins ca ON p.id = ca.profile_id
    WHERE p.auth_user_id = auth.uid()
    AND ca.country_id = target_country_id
    AND ca.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing auth functions
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
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_profile_roles upr ON p.id = upr.profile_id
    JOIN user_roles ur ON upr.role_id = ur.id
    WHERE p.auth_user_id = auth.uid()
    AND ur.role_name IN ('admin', 'super_admin', 'country_admin')
  );
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
    AND ur.role_name = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's admin countries
CREATE OR REPLACE FUNCTION auth.get_admin_countries()
RETURNS TABLE(country_id UUID, country_name TEXT, country_code TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.code
  FROM profiles p
  JOIN country_admins ca ON p.id = ca.profile_id
  JOIN countries c ON ca.country_id = c.id
  WHERE p.auth_user_id = auth.uid()
  AND ca.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to respect country admin boundaries
-- Users can only see data from their own country or countries they admin
CREATE OR REPLACE FUNCTION auth.can_access_country_data(target_country_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admins can access all countries
  IF auth.is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- Country admins can access their assigned countries
  IF auth.is_country_admin(target_country_id) THEN
    RETURN true;
  END IF;
  
  -- Users can access their own country data
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.country_id = target_country_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
