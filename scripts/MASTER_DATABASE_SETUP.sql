-- =====================================================
-- MASTER CREDLIO DATABASE SETUP
-- =====================================================
-- Complete setup script for Credlio credit bureau platform
-- This script creates all necessary tables, relationships, policies, and functions
-- Run this in your Supabase SQL Editor to set up the entire database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. CORE SYSTEM TABLES
-- =====================================================

-- Countries table (target markets)
CREATE TABLE IF NOT EXISTS countries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(3) NOT NULL UNIQUE,
  currency_code VARCHAR(3) NOT NULL,
  flag_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
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
('borrower', 'Can create loan requests and view their credit profile'),
('lender', 'Can access credit reports with subscription and make loan offers'),
('admin', 'Platform administrator with full access'),
('country_admin', 'Country-specific administrator'),
('super_admin', 'Super administrator with global access')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. USER MANAGEMENT
-- =====================================================

-- Main profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  country_id UUID REFERENCES countries(id),
  address TEXT,
  date_of_birth DATE,
  national_id VARCHAR(50),
  profile_picture_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  id_verified BOOLEAN DEFAULT FALSE,
  verification_documents JSONB DEFAULT '[]'::jsonb,
  online_status BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profile roles (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_profile_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID REFERENCES user_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  UNIQUE(profile_id, role_id)
);

-- Country admins table
CREATE TABLE IF NOT EXISTS country_admins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, country_id)
);

-- =====================================================
-- 3. LOAN SYSTEM TABLES
-- =====================================================

-- Loan requests
CREATE TABLE IF NOT EXISTS loan_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  borrower_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency_code VARCHAR(3) NOT NULL,
  purpose TEXT NOT NULL,
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  interest_rate DECIMAL(5,2),
  collateral_description TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Loan offers
CREATE TABLE IF NOT EXISTS loan_offers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  loan_request_id UUID REFERENCES loan_requests(id) ON DELETE CASCADE,
  lender_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  offered_amount DECIMAL(15,2) NOT NULL CHECK (offered_amount > 0),
  interest_rate DECIMAL(5,2) NOT NULL CHECK (interest_rate >= 0),
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  terms_conditions TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Active loans (when offers are accepted)
CREATE TABLE IF NOT EXISTS active_loans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  loan_offer_id UUID REFERENCES loan_offers(id) ON DELETE CASCADE,
  lender_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  borrower_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  principal_amount DECIMAL(15,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  total_amount_due DECIMAL(15,2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  duration_months INTEGER NOT NULL,
  start_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulted', 'cancelled')),
  amount_paid DECIMAL(15,2) DEFAULT 0,
  last_payment_date DATE,
  documents_verified JSONB DEFAULT '{
    "national_id": false,
    "proof_of_income": false,
    "collateral_docs": false,
    "guarantor_docs": false,
    "agreement_signed": false
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loan payments
CREATE TABLE IF NOT EXISTS loan_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  loan_offer_id UUID REFERENCES loan_offers(id) ON DELETE CASCADE,
  borrower_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lender_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount_due DECIMAL(15,2) NOT NULL,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  currency_code VARCHAR(3) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  payment_notes TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. RISK MANAGEMENT TABLES
-- =====================================================

-- Blacklisted borrowers
CREATE TABLE IF NOT EXISTS blacklisted_borrowers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  borrower_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_by_profile_id UUID REFERENCES profiles(id),
  reason TEXT NOT NULL,
  reason_category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  evidence_urls JSONB DEFAULT '[]'::jsonb,
  severity_level VARCHAR(20) DEFAULT 'medium' CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
  is_system_generated BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  deregistered BOOLEAN DEFAULT FALSE,
  deregistered_by UUID REFERENCES profiles(id),
  deregistered_at TIMESTAMP WITH TIME ZONE,
  deregistration_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Off-platform defaulters tracking
CREATE TABLE IF NOT EXISTS off_platform_defaulters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  country_code VARCHAR(2) NOT NULL,
  loan_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  reported_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_report_per_lender UNIQUE(full_name, phone_number, reported_by)
);

-- Ghost borrowers (offline lending tracking)
CREATE TABLE IF NOT EXISTS ghost_borrowers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  country_code VARCHAR(2) NOT NULL,
  linked_profile_id UUID REFERENCES profiles(id),
  linked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_ghost_per_lender UNIQUE(lender_id, full_name, phone_number)
);

-- Ghost loans
CREATE TABLE IF NOT EXISTS ghost_loans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ghost_borrower_id UUID REFERENCES ghost_borrowers(id) ON DELETE CASCADE,
  lender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  loan_amount DECIMAL(15,2) NOT NULL CHECK (loan_amount > 0),
  currency VARCHAR(3) DEFAULT 'USD',
  interest_rate DECIMAL(5,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid', 'overdue', 'defaulted')),
  amount_paid DECIMAL(15,2) DEFAULT 0,
  last_payment_date DATE,
  is_defaulted BOOLEAN DEFAULT FALSE,
  defaulted_at TIMESTAMP WITH TIME ZONE,
  days_overdue INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ghost loan payments
CREATE TABLE IF NOT EXISTS ghost_loan_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ghost_loan_id UUID REFERENCES ghost_loans(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Borrower risk history
CREATE TABLE IF NOT EXISTS borrower_risk_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  borrower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  risk_type VARCHAR(50) NOT NULL,
  previous_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  reason TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. INVITATION SYSTEM
-- =====================================================

-- Borrower invitations
CREATE TABLE IF NOT EXISTS borrower_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lender_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invitation_code VARCHAR(50) UNIQUE NOT NULL,
  borrower_name VARCHAR(255),
  borrower_phone VARCHAR(20),
  borrower_email VARCHAR(255),
  loan_amount DECIMAL(15,2),
  currency_code VARCHAR(3),
  custom_message TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. COMMUNICATION SYSTEM
-- =====================================================

-- Conversations for messaging
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_preview TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_conversation UNIQUE(participant1_id, participant2_id),
  CONSTRAINT different_participants CHECK (participant1_id != participant2_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message attachments
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. SUBSCRIPTION SYSTEM
-- =====================================================

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  features JSONB NOT NULL,
  reports_per_month INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO subscription_plans (name, price_usd, features, reports_per_month) VALUES
('Basic', 15.00, '{"reports": 10, "blacklist_access": true, "risk_assessment": true}', 10),
('Premium', 22.00, '{"reports": "unlimited", "blacklist_access": true, "risk_assessment": true, "smart_matching": true, "priority_support": true}', NULL)
ON CONFLICT DO NOTHING;

-- User subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trialing')),
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. TRACKING AND ANALYTICS
-- =====================================================

-- Watchlist for lenders to track specific borrowers
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lender_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  borrower_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lender_profile_id, borrower_profile_id)
);

-- Smart tags for AI-driven insights
CREATE TABLE IF NOT EXISTS smart_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tag_name VARCHAR(100) NOT NULL,
  tag_value TEXT,
  tag_type VARCHAR(50) NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reputation badges
CREATE TABLE IF NOT EXISTS reputation_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type VARCHAR(50) NOT NULL,
  badge_name VARCHAR(100) NOT NULL,
  description TEXT,
  criteria_met JSONB DEFAULT '{}'::jsonb,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. SECURITY AND ACCESS CONTROL
-- =====================================================

-- Blocked access attempts
CREATE TABLE IF NOT EXISTS blocked_access_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255),
  ip_address INET,
  country_code VARCHAR(2),
  reason TEXT NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Location verification logs
CREATE TABLE IF NOT EXISTS location_verification_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  ip_address INET,
  country_code VARCHAR(2),
  city TEXT,
  verification_method VARCHAR(50),
  is_allowed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE off_platform_defaulters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_risk_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 11. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Admin access to profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_profile_roles upr ON p.id = upr.profile_id
      JOIN user_roles ur ON upr.role_id = ur.id
      WHERE p.auth_user_id = auth.uid() 
      AND ur.name IN ('admin', 'super_admin', 'country_admin')
    )
  );

-- Loan requests policies
CREATE POLICY "Borrowers can manage own loan requests" ON loan_requests
  FOR ALL USING (
    borrower_profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Lenders can view loan requests" ON loan_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_profile_roles upr ON p.id = upr.profile_id
      JOIN user_roles ur ON upr.role_id = ur.id
      WHERE p.auth_user_id = auth.uid() 
      AND ur.name = 'lender'
    )
  );

-- Loan offers policies
CREATE POLICY "Lenders can manage own offers" ON loan_offers
  FOR ALL USING (
    lender_profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Borrowers can view offers on their requests" ON loan_offers
  FOR SELECT USING (
    loan_request_id IN (
      SELECT id FROM loan_requests 
      WHERE borrower_profile_id IN (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Active loans policies
CREATE POLICY "Lenders can view own active loans" ON active_loans
  FOR SELECT USING (
    lender_profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Borrowers can view own active loans" ON active_loans
  FOR SELECT USING (
    borrower_profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Loan payments policies
CREATE POLICY "Lenders can manage payments for their loans" ON loan_payments
  FOR ALL USING (
    lender_profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Borrowers can view payments for their loans" ON loan_payments
  FOR SELECT USING (
    borrower_profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Blacklisted borrowers policies
CREATE POLICY "Lenders can manage blacklist" ON blacklisted_borrowers
  FOR ALL USING (
    reported_by_profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Lenders can view blacklist" ON blacklisted_borrowers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_profile_roles upr ON p.id = upr.profile_id
      JOIN user_roles ur ON upr.role_id = ur.id
      WHERE p.auth_user_id = auth.uid() 
      AND ur.name = 'lender'
    )
  );

-- Notifications policies
CREATE POLICY "Users can manage own notifications" ON notifications
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Watchlist policies
CREATE POLICY "Lenders can manage own watchlist" ON watchlist
  FOR ALL USING (
    lender_profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Conversations policies
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT USING (
    auth.uid() IN (
      SELECT auth_user_id FROM profiles 
      WHERE id = participant1_id OR id = participant2_id
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND auth.uid() IN (
        SELECT auth_user_id FROM profiles 
        WHERE id = c.participant1_id OR id = c.participant2_id
      )
    )
  );

-- =====================================================
-- 12. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO profiles (auth_user_id, email)
  VALUES (NEW.id, NEW.email);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update conversation on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create active loan from accepted offer
CREATE OR REPLACE FUNCTION create_active_loan_from_offer()
RETURNS TRIGGER AS $$
DECLARE
  v_loan_request loan_requests%ROWTYPE;
  v_total_amount DECIMAL(15,2);
BEGIN
  -- Only proceed if offer was just accepted
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Get loan request details
    SELECT * INTO v_loan_request 
    FROM loan_requests 
    WHERE id = NEW.loan_request_id;
    
    -- Calculate total amount due
    v_total_amount := NEW.offered_amount * (1 + NEW.interest_rate / 100);
    
    -- Create active loan
    INSERT INTO active_loans (
      loan_offer_id,
      lender_profile_id,
      borrower_profile_id,
      principal_amount,
      interest_rate,
      total_amount_due,
      currency_code,
      duration_months,
      due_date
    ) VALUES (
      NEW.id,
      NEW.lender_profile_id,
      v_loan_request.borrower_profile_id,
      NEW.offered_amount,
      NEW.interest_rate,
      v_total_amount,
      v_loan_request.currency_code,
      NEW.duration_months,
      CURRENT_DATE + (NEW.duration_months * INTERVAL '1 month')
    );
    
    -- Update loan request status
    UPDATE loan_requests 
    SET status = 'accepted' 
    WHERE id = NEW.loan_request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 13. CREATE TRIGGERS
-- =====================================================

-- Auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update conversation on new message
CREATE TRIGGER update_conversation_after_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- Create active loan when offer is accepted
CREATE TRIGGER create_active_loan_on_offer_acceptance
  AFTER UPDATE ON loan_offers
  FOR EACH ROW EXECUTE FUNCTION create_active_loan_from_offer();

-- =====================================================
-- 14. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_country_id ON profiles(country_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Loan system indexes
CREATE INDEX IF NOT EXISTS idx_loan_requests_borrower ON loan_requests(borrower_profile_id);
CREATE INDEX IF NOT EXISTS idx_loan_requests_status ON loan_requests(status);
CREATE INDEX IF NOT EXISTS idx_loan_offers_request ON loan_offers(loan_request_id);
CREATE INDEX IF NOT EXISTS idx_loan_offers_lender ON loan_offers(lender_profile_id);
CREATE INDEX IF NOT EXISTS idx_active_loans_lender ON active_loans(lender_profile_id);
CREATE INDEX IF NOT EXISTS idx_active_loans_borrower ON active_loans(borrower_profile_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_lender ON loan_payments(lender_profile_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_borrower ON loan_payments(borrower_profile_id);

-- Risk management indexes
CREATE INDEX IF NOT EXISTS idx_blacklisted_borrowers_borrower ON blacklisted_borrowers(borrower_profile_id);
CREATE INDEX IF NOT EXISTS idx_blacklisted_borrowers_reporter ON blacklisted_borrowers(reported_by_profile_id);
CREATE INDEX IF NOT EXISTS idx_off_platform_defaulters_country ON off_platform_defaulters(country_code);
CREATE INDEX IF NOT EXISTS idx_off_platform_defaulters_name ON off_platform_defaulters(LOWER(full_name));

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- Subscription indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_profile ON user_subscriptions(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- =====================================================
-- 15. CREATE SAMPLE DATA
-- =====================================================

-- Insert sample roles for new users (will be created via trigger)
DO $$
BEGIN
  -- This will be handled by the application logic
  RAISE NOTICE 'Database setup complete. Sample data should be inserted via application logic.';
END $$;

-- =====================================================
-- 16. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- DATABASE SETUP COMPLETE
-- =====================================================

-- Create a completion log
CREATE TABLE IF NOT EXISTS setup_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  script_name VARCHAR(100),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO setup_log (script_name) VALUES ('MASTER_DATABASE_SETUP.sql');

-- Final message
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'CREDLIO DATABASE SETUP COMPLETE!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Tables created: %', (
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  );
  RAISE NOTICE 'Indexes created: %', (
    SELECT COUNT(*) FROM pg_indexes 
    WHERE schemaname = 'public'
  );
  RAISE NOTICE 'Functions created: %', (
    SELECT COUNT(*) FROM information_schema.routines 
    WHERE routine_schema = 'public'
  );
  RAISE NOTICE '==============================================';
END $$;