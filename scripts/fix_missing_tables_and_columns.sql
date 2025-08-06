-- ============================================
-- FIX MISSING TABLES AND COLUMNS
-- Run this BEFORE running the other scripts
-- ============================================

-- ============================================
-- PART 1: CREATE LOANS TABLE IF NOT EXISTS
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
-- PART 2: CREATE LOAN_REPAYMENTS TABLE
-- ============================================

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

-- ============================================
-- PART 3: CREATE LOAN_REQUESTS TABLE
-- ============================================

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

-- ============================================
-- PART 4: CREATE LENDER_SUBSCRIPTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.lender_subscriptions (
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
-- PART 5: CREATE SUBSCRIPTION_PLANS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
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
  ('Premium', 'Premium plan with unlimited credit reports and marketplace access', 22, 2)
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 6: ADD MISSING COLUMNS TO PROFILES
-- ============================================

-- Add all potentially missing columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS credit_score INTEGER DEFAULT 550,
ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS blacklisted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS blacklisted_reason TEXT,
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS monthly_income NUMERIC,
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS total_loans_taken INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_loans_given INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_count INTEGER DEFAULT 0;

-- ============================================
-- PART 7: CREATE SUPPORT TABLES
-- ============================================

-- Audit logs table
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

-- Risk alerts table
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

-- Support tickets table
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

-- Notifications table
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

-- Loan offers table
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
-- PART 8: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loans_lender_id ON loans(lender_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loan_requests_borrower_profile_id ON loan_requests(borrower_profile_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(verified);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  v_loans_exists BOOLEAN;
  v_verified_exists BOOLEAN;
  v_tables_count INTEGER;
BEGIN
  -- Check if loans table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'loans'
  ) INTO v_loans_exists;
  
  -- Check if verified column exists
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'verified'
  ) INTO v_verified_exists;
  
  -- Count total tables
  SELECT COUNT(*) INTO v_tables_count
  FROM information_schema.tables 
  WHERE table_schema = 'public';
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ TABLE AND COLUMN FIX COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Loans table exists: %', v_loans_exists;
  RAISE NOTICE 'Verified column exists: %', v_verified_exists;
  RAISE NOTICE 'Total tables in database: %', v_tables_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Created/Updated:';
  RAISE NOTICE '  • loans table';
  RAISE NOTICE '  • loan_repayments table';
  RAISE NOTICE '  • loan_requests table';
  RAISE NOTICE '  • lender_subscriptions table';
  RAISE NOTICE '  • subscription_plans table';
  RAISE NOTICE '  • audit_logs table';
  RAISE NOTICE '  • risk_alerts table';
  RAISE NOTICE '  • support_tickets table';
  RAISE NOTICE '  • notifications table';
  RAISE NOTICE '  • credit_score_history table';
  RAISE NOTICE '  • loan_offers table';
  RAISE NOTICE '  • All missing columns in profiles';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now run:';
  RAISE NOTICE '  1. complete_dashboard_backend.sql';
  RAISE NOTICE '  2. setup_admin_users.sql';
  RAISE NOTICE '================================================';
END $$;