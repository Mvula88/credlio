-- ============================================
-- ADMIN SECURITY TABLES (Simplified - No OTP)
-- ============================================

-- Admin access logs table
CREATE TABLE IF NOT EXISTS public.admin_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email VARCHAR(255),
  access_type VARCHAR(50), -- portal_login, api_access, etc.
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX idx_admin_access_logs_email ON admin_access_logs(email);
CREATE INDEX idx_admin_access_logs_created ON admin_access_logs(created_at);
CREATE INDEX idx_admin_access_logs_success ON admin_access_logs(success);

-- RLS Policies (Disabled for now to avoid permission issues)
-- We'll rely on API-level security instead
ALTER TABLE admin_access_logs DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users (for development)
GRANT ALL ON admin_access_logs TO authenticated;
GRANT ALL ON admin_access_logs TO anon;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Create function to check admin role
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