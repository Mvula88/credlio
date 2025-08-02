-- =====================================================
-- COMPLETE CREDLIO SETUP - Credit Bureau Platform
-- =====================================================
-- This single script contains everything needed for Credlio
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to start fresh (WARNING: This will delete all data!)
DROP TABLE IF EXISTS reputation_events CASCADE;
DROP TABLE IF EXISTS credit_report_views CASCADE;
DROP TABLE IF EXISTS blacklist CASCADE;
DROP TABLE IF EXISTS loan_requests CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS borrower_profiles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS countries CASCADE;

-- =====================================================
-- BASIC TABLES
-- =====================================================

-- Countries table (only your target markets)
CREATE TABLE IF NOT EXISTS countries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(3) NOT NULL UNIQUE,
  currency_code VARCHAR(3) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert all 16 African countries
INSERT INTO countries (name, code, currency_code) VALUES
('Nigeria', 'NG', 'NGN'),
('Kenya', 'KE', 'KES'),
('Uganda', 'UG', 'UGX'),
('South Africa', 'ZA', 'ZAR'),
('Ghana', 'GH', 'GHS'),
('Tanzania', 'TZ', 'TZS'),
('Rwanda', 'RW', 'RWF'),
('Zambia', 'ZM', 'ZMW'),
('Namibia', 'NA', 'NAD'),
('Botswana', 'BW', 'BWP'),
('Malawi', 'MW', 'MWK'),
('Senegal', 'SN', 'XOF'),
('Ethiopia', 'ET', 'ETB'),
('Cameroon', 'CM', 'XAF'),
('Sierra Leone', 'SL', 'SLL'),
('Zimbabwe', 'ZW', 'ZWL')
ON CONFLICT (code) DO NOTHING;

-- User roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO user_roles (name, description) VALUES
('borrower', 'Can create credit profile and view reputation'),
('lender', 'Can access credit reports with subscription'),
('admin', 'Platform administrator')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- USER MANAGEMENT
-- =====================================================

-- User profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  country_id UUID REFERENCES countries(id),
  role VARCHAR(50) DEFAULT 'borrower', -- Using role name instead of role_id
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Borrower credit profiles
CREATE TABLE IF NOT EXISTS borrower_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  national_id VARCHAR(50),
  employment_status VARCHAR(50),
  monthly_income DECIMAL(10,2),
  reputation_score INTEGER DEFAULT 50,
  total_loans_requested INTEGER DEFAULT 0,
  loans_repaid INTEGER DEFAULT 0,
  loans_defaulted INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SUBSCRIPTION SYSTEM
-- =====================================================

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  features JSONB NOT NULL,
  reports_per_month INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO subscription_plans (name, price_usd, features, reports_per_month) VALUES
('Basic', 15.00, '{"reports": 10, "blacklist_access": true, "risk_assessment": true}', 10),
('Premium', 22.00, '{"reports": "unlimited", "blacklist_access": true, "risk_assessment": true, "smart_matching": true, "priority_support": true}', NULL)
ON CONFLICT DO NOTHING;

-- User subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  status VARCHAR(50) DEFAULT 'active',
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CREDIT BUREAU FEATURES
-- =====================================================

-- Loan requests (credit profiles, not actual loans)
CREATE TABLE IF NOT EXISTS loan_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  borrower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  purpose TEXT,
  duration_months INTEGER,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blacklist management
CREATE TABLE IF NOT EXISTS blacklist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  borrower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  evidence_url TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit report views tracking
CREATE TABLE IF NOT EXISTS credit_report_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  borrower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reputation events
CREATE TABLE IF NOT EXISTS reputation_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  borrower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  impact INTEGER NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_report_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Borrower profiles policies
CREATE POLICY "Borrowers can manage own profile" ON borrower_profiles
  FOR ALL USING (
    user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Subscribed lenders can view borrower profiles" ON borrower_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_subscriptions us ON us.user_id = p.id
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'lender'
      AND us.status = 'active'
      AND us.current_period_end > NOW()
    )
  );

-- Loan requests policies
CREATE POLICY "Borrowers can manage own loan requests" ON loan_requests
  FOR ALL USING (
    borrower_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Subscribed lenders can view loan requests" ON loan_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_subscriptions us ON us.user_id = p.id
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'lender'
      AND us.status = 'active'
      AND us.current_period_end > NOW()
    )
  );

-- Blacklist policies
CREATE POLICY "Lenders can create blacklist entries" ON blacklist
  FOR INSERT WITH CHECK (
    lender_id IN (
      SELECT id FROM profiles p
      WHERE p.auth_user_id = auth.uid() AND p.role = 'lender'
    )
  );

CREATE POLICY "Subscribed lenders can view blacklist" ON blacklist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_subscriptions us ON us.user_id = p.id
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'lender'
      AND us.status = 'active'
      AND us.current_period_end > NOW()
    )
  );

CREATE POLICY "Borrowers can view own blacklist entries" ON blacklist
  FOR SELECT USING (
    borrower_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Credit report views policies
CREATE POLICY "Lenders can log report views" ON credit_report_views
  FOR INSERT WITH CHECK (
    lender_id IN (
      SELECT id FROM profiles p
      WHERE p.auth_user_id = auth.uid() AND p.role = 'lender'
    )
  );

CREATE POLICY "Lenders can view own report history" ON credit_report_views
  FOR SELECT USING (
    lender_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- User subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Reputation events policies
CREATE POLICY "Lenders can create reputation events" ON reputation_events
  FOR INSERT WITH CHECK (
    created_by IN (
      SELECT id FROM profiles p
      WHERE p.auth_user_id = auth.uid() AND p.role = 'lender'
    )
  );

CREATE POLICY "Borrowers can view own reputation events" ON reputation_events
  FOR SELECT USING (
    borrower_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update reputation score
CREATE OR REPLACE FUNCTION update_reputation_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE borrower_profiles
  SET reputation_score = GREATEST(0, LEAST(100, 
    reputation_score + NEW.impact)),
    updated_at = NOW()
  WHERE user_id = NEW.borrower_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = (SELECT id FROM profiles WHERE auth_user_id = user_uuid)
    AND status = 'active'
    AND current_period_end > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (auth_user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Reputation score update trigger
CREATE TRIGGER reputation_event_trigger
AFTER INSERT ON reputation_events
FOR EACH ROW
EXECUTE FUNCTION update_reputation_score();

-- Auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX idx_loan_requests_borrower_id ON loan_requests(borrower_id);
CREATE INDEX idx_blacklist_borrower_id ON blacklist(borrower_id);
CREATE INDEX idx_credit_report_views_lender_borrower ON credit_report_views(lender_id, borrower_id);
CREATE INDEX idx_user_subscriptions_user_status ON user_subscriptions(user_id, status);

-- =====================================================
-- DEFAULT ADMIN USER (Optional)
-- =====================================================
-- Uncomment and modify this section to create a default admin
-- Make sure to change the email and password!

/*
-- Create admin user in auth.users first
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, role)
VALUES (
  'admin@credlio.com',
  crypt('your-secure-password', gen_salt('bf')),
  NOW(),
  'authenticated'
);

-- Then update their profile to admin role
UPDATE profiles 
SET role_id = (SELECT id FROM user_roles WHERE name = 'admin')
WHERE email = 'admin@credlio.com';
*/

-- =====================================================
-- DONE! Your Credlio database is ready.
-- =====================================================