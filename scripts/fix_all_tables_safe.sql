-- ============================================
-- SAFE FIX FOR ALL MISSING TABLES AND COLUMNS
-- This script checks before creating/altering
-- ============================================

-- ============================================
-- PART 1: FIX SUBSCRIPTION_PLANS TABLE
-- ============================================

-- Drop and recreate subscription_plans if it exists with wrong structure
DROP TABLE IF EXISTS public.subscription_plans CASCADE;

CREATE TABLE public.subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  tier INTEGER DEFAULT 1,
  features JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price, tier) 
VALUES 
  ('Basic', 'Basic plan with 10 credit reports per month', 15, 1),
  ('Premium', 'Premium plan with unlimited credit reports and marketplace access', 22, 2);

-- ============================================
-- PART 2: CREATE LOANS TABLE (IF NOT EXISTS)
-- ============================================

CREATE TABLE IF NOT EXISTS public.loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  borrower_id UUID REFERENCES profiles(id) NOT NULL,
  lender_id UUID REFERENCES profiles(id) NOT NULL,
  amount NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL,
  duration_months INTEGER NOT NULL,
  monthly_payment NUMERIC,
  status VARCHAR(50) DEFAULT 'active',
  purpose VARCHAR(255),
  terms TEXT,
  due_date DATE,
  next_payment_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PART 3: CREATE OTHER CORE TABLES
-- ============================================

-- Loan repayments
CREATE TABLE IF NOT EXISTS public.loan_repayments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID REFERENCES loans(id) NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  transaction_reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Loan requests
CREATE TABLE IF NOT EXISTS public.loan_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  borrower_profile_id UUID REFERENCES profiles(id) NOT NULL,
  amount NUMERIC NOT NULL,
  interest_rate NUMERIC,
  duration_months INTEGER NOT NULL,
  purpose VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  country_id UUID REFERENCES countries(id),
  currency_code VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Lender subscriptions (recreate with correct foreign key)
DROP TABLE IF EXISTS public.lender_subscriptions CASCADE;

CREATE TABLE public.lender_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lender_id UUID REFERENCES profiles(id) NOT NULL,
  plan_id UUID REFERENCES subscription_plans(id),
  status VARCHAR(50) DEFAULT 'active',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PART 4: ADD MISSING COLUMNS TO PROFILES
-- ============================================

DO $$
BEGIN
  -- Add columns one by one to avoid errors if they exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verified') THEN
    ALTER TABLE profiles ADD COLUMN verified BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_active_at') THEN
    ALTER TABLE profiles ADD COLUMN last_active_at TIMESTAMP DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'credit_score') THEN
    ALTER TABLE profiles ADD COLUMN credit_score INTEGER DEFAULT 550;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'reputation_score') THEN
    ALTER TABLE profiles ADD COLUMN reputation_score INTEGER DEFAULT 50;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_blacklisted') THEN
    ALTER TABLE profiles ADD COLUMN is_blacklisted BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'blacklisted_at') THEN
    ALTER TABLE profiles ADD COLUMN blacklisted_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'blacklisted_reason') THEN
    ALTER TABLE profiles ADD COLUMN blacklisted_reason TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_name') THEN
    ALTER TABLE profiles ADD COLUMN company_name VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'employment_status') THEN
    ALTER TABLE profiles ADD COLUMN employment_status VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'monthly_income') THEN
    ALTER TABLE profiles ADD COLUMN monthly_income NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_status') THEN
    ALTER TABLE profiles ADD COLUMN verification_status VARCHAR(50) DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_date') THEN
    ALTER TABLE profiles ADD COLUMN verification_date TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_loans_taken') THEN
    ALTER TABLE profiles ADD COLUMN total_loans_taken INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_loans_given') THEN
    ALTER TABLE profiles ADD COLUMN total_loans_given INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'default_count') THEN
    ALTER TABLE profiles ADD COLUMN default_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- PART 5: CREATE SUPPORT TABLES
-- ============================================

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,
  description TEXT,
  target_id UUID,
  target_type VARCHAR(50),
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Risk alerts
CREATE TABLE IF NOT EXISTS public.risk_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category VARCHAR(50),
  country_id UUID REFERENCES countries(id),
  user_id UUID REFERENCES profiles(id),
  loan_id UUID REFERENCES loans(id),
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  country_id UUID REFERENCES countries(id),
  category VARCHAR(50),
  subject VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(20) DEFAULT 'normal',
  assigned_to UUID REFERENCES profiles(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'normal',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Credit score history
CREATE TABLE IF NOT EXISTS public.credit_score_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  borrower_id UUID REFERENCES profiles(id) NOT NULL,
  score INTEGER NOT NULL,
  previous_score INTEGER,
  change_reason VARCHAR(255),
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Loan offers
CREATE TABLE IF NOT EXISTS public.loan_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_request_id UUID REFERENCES loan_requests(id),
  lender_id UUID REFERENCES profiles(id),
  offered_amount NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL,
  duration_months INTEGER NOT NULL,
  terms TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  v_tables_created INTEGER := 0;
  v_columns_added INTEGER := 0;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO v_tables_created
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('loans', 'loan_repayments', 'loan_requests', 'lender_subscriptions', 
                     'subscription_plans', 'audit_logs', 'risk_alerts', 'support_tickets',
                     'notifications', 'credit_score_history', 'loan_offers');
  
  -- Count profile columns
  SELECT COUNT(*) INTO v_columns_added
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('verified', 'credit_score', 'reputation_score', 'is_blacklisted');
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ DATABASE SETUP COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Tables created/verified: %', v_tables_created;
  RAISE NOTICE 'Key columns verified: %', v_columns_added;
  RAISE NOTICE '';
  RAISE NOTICE 'Ready for:';
  RAISE NOTICE '  • Dashboard functions setup';
  RAISE NOTICE '  • Admin user creation';
  RAISE NOTICE '  • RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Run simple_admin_setup.sql';
  RAISE NOTICE '================================================';
END $$;