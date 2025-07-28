-- Clean Admin System Setup
-- This creates a simple 2-role admin system: Super Admin and Country Admin
-- Only you control both roles

-- Drop existing admin tables if they exist
DROP TABLE IF EXISTS country_admins CASCADE;
DROP TABLE IF EXISTS admin_permissions CASCADE;
DROP TABLE IF EXISTS personal_admin_settings CASCADE;

-- Create user roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user profile roles junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profile_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES user_roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, role_id)
);

-- Create admin view settings table
CREATE TABLE IF NOT EXISTS admin_view_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    current_view TEXT DEFAULT 'super_admin' CHECK (current_view IN ('super_admin', 'country_admin')),
    selected_country_code TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the two admin roles
INSERT INTO user_roles (role_name, description) VALUES
('super_admin', 'Super Administrator - Full platform access')
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO user_roles (role_name, description) VALUES
('country_admin', 'Country Administrator - Country-specific access')
ON CONFLICT (role_name) DO NOTHING;

-- Create admin helper functions in public schema
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
    has_role BOOLEAN := FALSE;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT EXISTS(
        SELECT 1 
        FROM profiles p
        JOIN user_profile_roles upr ON p.id = upr.profile_id
        JOIN user_roles ur ON upr.role_id = ur.id
        WHERE p.auth_user_id = user_id 
        AND ur.role_name = 'super_admin'
    ) INTO has_role;
    
    RETURN has_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_country_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
    has_role BOOLEAN := FALSE;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT EXISTS(
        SELECT 1 
        FROM profiles p
        JOIN user_profile_roles upr ON p.id = upr.profile_id
        JOIN user_roles ur ON upr.role_id = ur.id
        WHERE p.auth_user_id = user_id 
        AND ur.role_name = 'country_admin'
    ) INTO has_role;
    
    RETURN has_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN public.is_super_admin() OR public.is_country_admin();
END;
$$;

-- Create function to get admin view settings
CREATE OR REPLACE FUNCTION public.get_admin_view_settings()
RETURNS TABLE(current_view TEXT, selected_country_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
    profile_id UUID;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL OR NOT public.is_admin() THEN
        RETURN;
    END IF;
    
    SELECT p.id INTO profile_id
    FROM profiles p
    WHERE p.auth_user_id = user_id;
    
    RETURN QUERY
    SELECT avs.current_view, avs.selected_country_code
    FROM admin_view_settings avs
    WHERE avs.profile_id = profile_id;
END;
$$;

-- Create function to update admin view settings
CREATE OR REPLACE FUNCTION public.update_admin_view_settings(
    new_view TEXT DEFAULT NULL,
    new_country_code TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
    profile_id UUID;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    SELECT p.id INTO profile_id
    FROM profiles p
    WHERE p.auth_user_id = user_id;
    
    INSERT INTO admin_view_settings (profile_id, current_view, selected_country_code)
    VALUES (profile_id, COALESCE(new_view, 'super_admin'), new_country_code)
    ON CONFLICT (profile_id) DO UPDATE SET
        current_view = COALESCE(new_view, admin_view_settings.current_view),
        selected_country_code = COALESCE(new_country_code, admin_view_settings.selected_country_code),
        updated_at = NOW();
END;
$$;

-- Enable RLS on admin tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_view_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin can view all roles" ON user_roles
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin can view all profile roles" ON user_profile_roles
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can view own admin settings" ON admin_view_settings
    FOR ALL USING (
        EXISTS(
            SELECT 1 FROM profiles p 
            WHERE p.id = admin_view_settings.profile_id 
            AND p.auth_user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON user_roles TO authenticated;
GRANT SELECT ON user_profile_roles TO authenticated;
GRANT ALL ON admin_view_settings TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Clean admin system setup completed successfully!';
    RAISE NOTICE 'Next step: Run assign_admin_role_fixed.sql to assign yourself admin roles';
END $$;
