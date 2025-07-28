-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- Create base tables if they don't exist
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  currency_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  country_id UUID NOT NULL REFERENCES countries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profile_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, role_id)
);

-- Insert default roles
INSERT INTO user_roles (role_name, description) VALUES
  ('borrower', 'Can request loans'),
  ('lender', 'Can fund loans'),
  ('country_admin', 'Can manage users and loans for a specific country'),
  ('super_admin', 'Has full access to the system')
ON CONFLICT (role_name) DO NOTHING;

-- Insert some default countries
INSERT INTO countries (name, code, currency_code) VALUES
  ('United States', 'US', 'USD'),
  ('United Kingdom', 'GB', 'GBP'),
  ('Kenya', 'KE', 'KES'),
  ('Nigeria', 'NG', 'NGN'),
  ('South Africa', 'ZA', 'ZAR'),
  ('Ghana', 'GH', 'GHS')
ON CONFLICT (code) DO NOTHING;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_timestamp ON %I;
      CREATE TRIGGER set_timestamp
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE PROCEDURE trigger_set_timestamp();
    ', t, t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
