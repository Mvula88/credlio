-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(3) NOT NULL UNIQUE,
  currency_code VARCHAR(3) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample countries
INSERT INTO countries (name, code, currency_code) VALUES
('Nigeria', 'NG', 'NGN'),
('Ghana', 'GH', 'GHS'),
('Kenya', 'KE', 'KES'),
('South Africa', 'ZA', 'ZAR'),
('Uganda', 'UG', 'UGX')
ON CONFLICT (code) DO NOTHING;

-- Create user roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO user_roles (name, description) VALUES
('borrower', 'Can request loans and make payments'),
('lender', 'Can offer loans and manage borrowers'),
('admin', 'Full system access and management')
ON CONFLICT (name) DO NOTHING;

-- Create profiles table
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
  verification_documents JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profile_roles junction table
CREATE TABLE IF NOT EXISTS user_profile_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  UNIQUE(profile_id, role_id)
);

-- Create loan_requests table
CREATE TABLE IF NOT EXISTS loan_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  borrower_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency_code VARCHAR(3) NOT NULL,
  purpose TEXT NOT NULL,
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  interest_rate DECIMAL(5,2),
  collateral_description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'funded', 'cancelled', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Create loan_offers table
CREATE TABLE IF NOT EXISTS loan_offers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  loan_request_id UUID NOT NULL REFERENCES loan_requests(id) ON DELETE CASCADE,
  lender_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  offered_amount DECIMAL(15,2) NOT NULL CHECK (offered_amount > 0),
  interest_rate DECIMAL(5,2) NOT NULL CHECK (interest_rate >= 0),
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  terms_conditions TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(loan_request_id, lender_profile_id)
);

-- Create loan_payments table
CREATE TABLE IF NOT EXISTS loan_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  loan_offer_id UUID NOT NULL REFERENCES loan_offers(id) ON DELETE CASCADE,
  borrower_profile_id UUID NOT NULL REFERENCES profiles(id),
  lender_profile_id UUID NOT NULL REFERENCES profiles(id),
  amount_due DECIMAL(15,2) NOT NULL CHECK (amount_due > 0),
  amount_paid DECIMAL(15,2) DEFAULT 0 CHECK (amount_paid >= 0),
  currency_code VARCHAR(3) NOT NULL,
  due_date DATE NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  payment_notes TEXT,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'pending_confirmation', 'completed', 'failed', 'overdue', 'reversed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blacklisted_borrowers table
CREATE TABLE IF NOT EXISTS blacklisted_borrowers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  borrower_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_by_profile_id UUID REFERENCES profiles(id),
  reason VARCHAR(100) NOT NULL,
  reason_category VARCHAR(50) NOT NULL CHECK (reason_category IN ('payment_default', 'fraud', 'identity_theft', 'multiple_defaults', 'breach_of_contract', 'other')),
  description TEXT NOT NULL,
  evidence_urls JSONB DEFAULT '[]',
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

-- Create borrower_invitations table
CREATE TABLE IF NOT EXISTS borrower_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lender_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitation_code VARCHAR(50) NOT NULL UNIQUE,
  borrower_name VARCHAR(255),
  borrower_phone VARCHAR(20),
  borrower_email VARCHAR(255),
  loan_amount DECIMAL(15,2),
  currency_code VARCHAR(3),
  custom_message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lender_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  borrower_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lender_profile_id, borrower_profile_id)
);

-- Create smart_tags table
CREATE TABLE IF NOT EXISTS smart_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_name VARCHAR(100) NOT NULL,
  tag_value VARCHAR(255),
  tag_type VARCHAR(50) NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  created_by VARCHAR(50) DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, tag_name)
);

-- Create reputation_badges table
CREATE TABLE IF NOT EXISTS reputation_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type VARCHAR(100) NOT NULL,
  badge_name VARCHAR(255) NOT NULL,
  description TEXT,
  criteria_met JSONB DEFAULT '{}',
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create audit_logs table
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

-- Enable Row Level Security on all tables
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Countries (public read)
CREATE POLICY "Countries are viewable by everyone" ON countries FOR SELECT USING (true);

-- User roles (public read)
CREATE POLICY "User roles are viewable by everyone" ON user_roles FOR SELECT USING (true);

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- User profile roles policies
CREATE POLICY "Users can view their own roles" ON user_profile_roles FOR SELECT USING (
  profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);

-- Loan requests policies
CREATE POLICY "Borrowers can manage their loan requests" ON loan_requests FOR ALL USING (
  borrower_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Lenders can view active loan requests" ON loan_requests FOR SELECT USING (
  status = 'active' AND EXISTS (
    SELECT 1 FROM user_profile_roles upr
    JOIN user_roles ur ON upr.role_id = ur.id
    JOIN profiles p ON upr.profile_id = p.id
    WHERE p.auth_user_id = auth.uid() AND ur.name = 'lender'
  )
);

-- Loan offers policies
CREATE POLICY "Lenders can manage their offers" ON loan_offers FOR ALL USING (
  lender_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Borrowers can view offers on their requests" ON loan_offers FOR SELECT USING (
  loan_request_id IN (
    SELECT id FROM loan_requests WHERE borrower_profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  )
);

-- Loan payments policies
CREATE POLICY "Borrowers can view their payments" ON loan_payments FOR SELECT USING (
  borrower_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Lenders can view their payments" ON loan_payments FOR SELECT USING (
  lender_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Borrowers can update their payments" ON loan_payments FOR UPDATE USING (
  borrower_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Lenders can update payment confirmations" ON loan_payments FOR UPDATE USING (
  lender_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);

-- Blacklisted borrowers policies
CREATE POLICY "Lenders can view blacklisted borrowers" ON blacklisted_borrowers FOR SELECT USING (
  NOT deregistered AND EXISTS (
    SELECT 1 FROM user_profile_roles upr
    JOIN user_roles ur ON upr.role_id = ur.id
    JOIN profiles p ON upr.profile_id = p.id
    WHERE p.auth_user_id = auth.uid() AND ur.name IN ('lender', 'admin')
  )
);
CREATE POLICY "Lenders can report borrowers" ON blacklisted_borrowers FOR INSERT WITH CHECK (
  reported_by_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);

-- Borrower invitations policies
CREATE POLICY "Lenders can manage their invitations" ON borrower_invitations FOR ALL USING (
  lender_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT USING (
  profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE USING (
  profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);

-- Create functions
CREATE OR REPLACE FUNCTION generate_payment_schedule(
  p_loan_offer_id UUID,
  p_amount DECIMAL,
  p_duration_months INTEGER,
  p_interest_rate DECIMAL
) RETURNS VOID AS $$
DECLARE
  monthly_payment DECIMAL;
  payment_date DATE;
  i INTEGER;
  borrower_id UUID;
  lender_id UUID;
  currency VARCHAR(3);
BEGIN
  -- Get borrower and lender IDs
  SELECT 
    lr.borrower_profile_id,
    lo.lender_profile_id,
    lr.currency_code
  INTO borrower_id, lender_id, currency
  FROM loan_offers lo
  JOIN loan_requests lr ON lo.loan_request_id = lr.id
  WHERE lo.id = p_loan_offer_id;

  -- Calculate monthly payment (simple interest)
  monthly_payment := (p_amount * (1 + (p_interest_rate / 100))) / p_duration_months;
  
  -- Generate payment schedule
  FOR i IN 1..p_duration_months LOOP
    payment_date := CURRENT_DATE + (i || ' months')::INTERVAL;
    
    INSERT INTO loan_payments (
      loan_offer_id,
      borrower_profile_id,
      lender_profile_id,
      amount_due,
      currency_code,
      due_date,
      status
    ) VALUES (
      p_loan_offer_id,
      borrower_id,
      lender_id,
      monthly_payment,
      currency,
      payment_date,
      'scheduled'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to accept loan offer
CREATE OR REPLACE FUNCTION accept_loan_offer(
  p_offer_id UUID,
  p_borrower_profile_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  offer_record RECORD;
BEGIN
  -- Get offer details
  SELECT lo.*, lr.amount, lr.duration_months
  INTO offer_record
  FROM loan_offers lo
  JOIN loan_requests lr ON lo.loan_request_id = lr.id
  WHERE lo.id = p_offer_id
    AND lr.borrower_profile_id = p_borrower_profile_id
    AND lo.status = 'pending';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Update offer status
  UPDATE loan_offers 
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = p_offer_id;

  -- Update loan request status
  UPDATE loan_requests 
  SET status = 'funded'
  WHERE id = offer_record.loan_request_id;

  -- Generate payment schedule
  PERFORM generate_payment_schedule(
    p_offer_id,
    offer_record.offered_amount,
    offer_record.duration_months,
    offer_record.interest_rate
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
