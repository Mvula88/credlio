-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profile_roles junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profile_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, role_id)
);

-- Insert default roles if they don't exist
INSERT INTO user_roles (role_name) 
VALUES ('borrower'), ('lender'), ('admin')
ON CONFLICT (role_name) DO NOTHING;

-- Set up RLS policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_roles ENABLE ROW LEVEL SECURITY;

-- Everyone can read roles
CREATE POLICY read_user_roles ON user_roles
  FOR SELECT USING (true);

-- Only the user themselves and admins can see their roles
CREATE POLICY read_user_profile_roles ON user_profile_roles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT auth_user_id FROM profiles WHERE id = user_profile_roles.profile_id
    ) OR 
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_profile_roles upr ON p.id = upr.profile_id
      JOIN user_roles ur ON upr.role_id = ur.id
      WHERE p.auth_user_id = auth.uid() AND ur.role_name = 'admin'
    )
  );

-- Only admins can insert/update/delete roles
CREATE POLICY admin_manage_user_roles ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_profile_roles upr ON p.id = upr.profile_id
      JOIN user_roles ur ON upr.role_id = ur.id
      WHERE p.auth_user_id = auth.uid() AND ur.role_name = 'admin'
    )
  );

-- Users can manage their own roles, and admins can manage all roles
CREATE POLICY manage_user_profile_roles ON user_profile_roles
  FOR ALL USING (
    auth.uid() IN (
      SELECT auth_user_id FROM profiles WHERE id = user_profile_roles.profile_id
    ) OR 
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_profile_roles upr ON p.id = upr.profile_id
      JOIN user_roles ur ON upr.role_id = ur.id
      WHERE p.auth_user_id = auth.uid() AND ur.role_name = 'admin'
    )
  );
