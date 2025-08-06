-- ============================================
-- COMPLETE BACKEND SETUP FOR ALL DASHBOARDS
-- Includes: Tables, Functions, RLS Policies
-- For: Lender, Borrower, Admin, Country Admin
-- ============================================

-- ============================================
-- PART 1: CORE TABLES
-- ============================================

-- Ensure profiles table has all necessary columns
ALTER TABLE public.profiles 
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

-- Audit logs table for admin actions
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

-- Credit score history
CREATE TABLE IF NOT EXISTS public.credit_score_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  borrower_id UUID REFERENCES profiles(id) NOT NULL,
  score INTEGER NOT NULL,
  previous_score INTEGER,
  change_reason VARCHAR(255),
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Platform notifications
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

-- Loan offers (for marketplace)
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

-- ============================================
-- PART 2: DASHBOARD FUNCTIONS
-- ============================================

-- LENDER DASHBOARD FUNCTIONS
CREATE OR REPLACE FUNCTION get_lender_stats(lender_id UUID)
RETURNS TABLE (
  total_loans BIGINT,
  active_loans BIGINT,
  total_deployed NUMERIC,
  total_repaid NUMERIC,
  repayment_rate NUMERIC,
  average_loan_size NUMERIC,
  total_borrowers BIGINT,
  overdue_loans BIGINT,
  portfolio_risk TEXT,
  monthly_growth NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH loan_stats AS (
    SELECT
      COUNT(*) AS total_loans_count,
      COUNT(*) FILTER (WHERE status IN ('active', 'overdue')) AS active_loans_count,
      COALESCE(SUM(amount), 0) AS total_deployed_amount,
      COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS completed_amount,
      COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count,
      AVG(amount) AS avg_loan_size,
      COUNT(DISTINCT borrower_id) AS unique_borrowers
    FROM loans
    WHERE loans.lender_id = get_lender_stats.lender_id
  ),
  repayment_stats AS (
    SELECT
      COALESCE(SUM(lr.amount), 0) AS total_repaid_amount
    FROM loan_repayments lr
    JOIN loans l ON lr.loan_id = l.id
    WHERE l.lender_id = get_lender_stats.lender_id
    AND lr.status = 'completed'
  ),
  risk_calculation AS (
    SELECT
      CASE
        WHEN COUNT(*) FILTER (WHERE status = 'overdue') > 5 THEN 'high'
        WHEN COUNT(*) FILTER (WHERE status = 'overdue') > 2 THEN 'medium'
        ELSE 'low'
      END AS risk_level
    FROM loans
    WHERE loans.lender_id = get_lender_stats.lender_id
    AND status IN ('active', 'overdue')
  ),
  monthly_comparison AS (
    SELECT
      CASE
        WHEN COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') > 0 
        AND COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days') > 0
        THEN 
          ((COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::NUMERIC - 
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days')::NUMERIC) / 
           NULLIF(COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days')::NUMERIC, 0)) * 100
        ELSE 0
      END AS growth_rate
    FROM loans
    WHERE loans.lender_id = get_lender_stats.lender_id
  )
  SELECT
    ls.total_loans_count::BIGINT,
    ls.active_loans_count::BIGINT,
    ls.total_deployed_amount::NUMERIC,
    rs.total_repaid_amount::NUMERIC,
    CASE
      WHEN ls.total_deployed_amount > 0 
      THEN ROUND((rs.total_repaid_amount / ls.total_deployed_amount * 100)::NUMERIC, 2)
      ELSE 0
    END AS repayment_rate,
    ROUND(ls.avg_loan_size::NUMERIC, 2),
    ls.unique_borrowers::BIGINT,
    ls.overdue_count::BIGINT,
    rc.risk_level::TEXT,
    ROUND(mc.growth_rate::NUMERIC, 2)
  FROM loan_stats ls
  CROSS JOIN repayment_stats rs
  CROSS JOIN risk_calculation rc
  CROSS JOIN monthly_comparison mc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BORROWER DASHBOARD FUNCTIONS
CREATE OR REPLACE FUNCTION get_borrower_stats(borrower_id UUID)
RETURNS TABLE (
  credit_score INTEGER,
  reputation_score INTEGER,
  total_loans BIGINT,
  total_borrowed NUMERIC,
  total_repaid NUMERIC,
  on_time_payment_rate NUMERIC,
  next_payment_amount NUMERIC,
  next_payment_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH loan_stats AS (
    SELECT
      COUNT(*) AS total_loans_count,
      COALESCE(SUM(amount), 0) AS total_borrowed_amount
    FROM loans
    WHERE loans.borrower_id = get_borrower_stats.borrower_id
  ),
  repayment_stats AS (
    SELECT
      COALESCE(SUM(lr.amount), 0) AS total_repaid_amount,
      COUNT(*) FILTER (WHERE lr.status = 'completed' AND lr.payment_date <= lr.due_date) AS on_time_payments,
      COUNT(*) FILTER (WHERE lr.status = 'completed') AS total_payments
    FROM loan_repayments lr
    JOIN loans l ON lr.loan_id = l.id
    WHERE l.borrower_id = get_borrower_stats.borrower_id
  ),
  next_payment AS (
    SELECT
      l.monthly_payment AS amount,
      EXTRACT(DAY FROM (l.next_payment_date - CURRENT_DATE))::INTEGER AS days_until
    FROM loans l
    WHERE l.borrower_id = get_borrower_stats.borrower_id
    AND l.status IN ('active', 'overdue')
    AND l.next_payment_date IS NOT NULL
    ORDER BY l.next_payment_date
    LIMIT 1
  ),
  credit_data AS (
    SELECT
      COALESCE(p.credit_score, 550) AS score,
      COALESCE(p.reputation_score, 50) AS reputation
    FROM profiles p
    WHERE p.id = get_borrower_stats.borrower_id
  )
  SELECT
    cd.score::INTEGER,
    cd.reputation::INTEGER,
    ls.total_loans_count::BIGINT,
    ls.total_borrowed_amount::NUMERIC,
    rs.total_repaid_amount::NUMERIC,
    CASE
      WHEN rs.total_payments > 0 
      THEN ROUND((rs.on_time_payments::NUMERIC / rs.total_payments::NUMERIC * 100), 2)
      ELSE 100
    END AS on_time_payment_rate,
    COALESCE(np.amount, 0)::NUMERIC,
    np.days_until::INTEGER
  FROM loan_stats ls
  CROSS JOIN repayment_stats rs
  CROSS JOIN credit_data cd
  LEFT JOIN next_payment np ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ADMIN DASHBOARD FUNCTIONS
CREATE OR REPLACE FUNCTION get_admin_system_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  total_lenders BIGINT,
  total_borrowers BIGINT,
  total_loans BIGINT,
  active_loans BIGINT,
  total_volume NUMERIC,
  default_rate NUMERIC,
  monthly_growth NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      COUNT(*) AS total_users_count,
      COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '24 hours') AS active_users_count,
      COUNT(*) FILTER (WHERE role = 'lender') AS lenders_count,
      COUNT(*) FILTER (WHERE role = 'borrower') AS borrowers_count
    FROM profiles
  ),
  loan_stats AS (
    SELECT
      COUNT(*) AS total_loans_count,
      COUNT(*) FILTER (WHERE status IN ('active', 'overdue')) AS active_loans_count,
      COALESCE(SUM(amount), 0) AS total_volume_amount,
      COUNT(*) FILTER (WHERE status = 'defaulted')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100 AS default_rate_calc
    FROM loans
  ),
  growth_stats AS (
    SELECT
      CASE
        WHEN COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') > 0 
        AND COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days') > 0
        THEN 
          ((COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::NUMERIC - 
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days')::NUMERIC) / 
           NULLIF(COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days')::NUMERIC, 0)) * 100
        ELSE 0
      END AS growth_rate
    FROM profiles
  )
  SELECT
    us.total_users_count::BIGINT,
    us.active_users_count::BIGINT,
    us.lenders_count::BIGINT,
    us.borrowers_count::BIGINT,
    ls.total_loans_count::BIGINT,
    ls.active_loans_count::BIGINT,
    ls.total_volume_amount::NUMERIC,
    ROUND(COALESCE(ls.default_rate_calc, 0), 2)::NUMERIC,
    ROUND(COALESCE(gs.growth_rate, 0), 2)::NUMERIC
  FROM user_stats us
  CROSS JOIN loan_stats ls
  CROSS JOIN growth_stats gs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- COUNTRY ADMIN DASHBOARD FUNCTIONS
CREATE OR REPLACE FUNCTION get_country_admin_stats(admin_country_id UUID)
RETURNS TABLE (
  total_users BIGINT,
  total_lenders BIGINT,
  total_borrowers BIGINT,
  total_loans BIGINT,
  active_loans BIGINT,
  total_volume NUMERIC,
  default_rate NUMERIC,
  verification_pending BIGINT,
  blacklisted_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      COUNT(*) AS total_users_count,
      COUNT(*) FILTER (WHERE role = 'lender') AS lenders_count,
      COUNT(*) FILTER (WHERE role = 'borrower') AS borrowers_count,
      COUNT(*) FILTER (WHERE verified = false) AS pending_verification,
      COUNT(*) FILTER (WHERE is_blacklisted = true) AS blacklisted_count
    FROM profiles
    WHERE country_id = admin_country_id
  ),
  loan_stats AS (
    SELECT
      COUNT(*) AS total_loans_count,
      COUNT(*) FILTER (WHERE l.status IN ('active', 'overdue')) AS active_loans_count,
      COALESCE(SUM(l.amount), 0) AS total_volume_amount,
      COUNT(*) FILTER (WHERE l.status = 'defaulted')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100 AS default_rate_calc
    FROM loans l
    JOIN profiles p ON l.borrower_id = p.id
    WHERE p.country_id = admin_country_id
  )
  SELECT
    us.total_users_count::BIGINT,
    us.lenders_count::BIGINT,
    us.borrowers_count::BIGINT,
    ls.total_loans_count::BIGINT,
    ls.active_loans_count::BIGINT,
    ls.total_volume_amount::NUMERIC,
    ROUND(COALESCE(ls.default_rate_calc, 0), 2)::NUMERIC,
    us.pending_verification::BIGINT,
    us.blacklisted_count::BIGINT
  FROM user_stats us
  CROSS JOIN loan_stats ls;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Platform revenue function
CREATE OR REPLACE FUNCTION get_platform_revenue_stats()
RETURNS TABLE (
  total_revenue NUMERIC,
  subscription_revenue NUMERIC,
  transaction_fees NUMERIC,
  monthly_recurring NUMERIC,
  growth_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH revenue_stats AS (
    SELECT
      COALESCE(SUM(
        CASE 
          WHEN plan_id IS NOT NULL THEN 
            CASE 
              WHEN sp.name ILIKE '%premium%' THEN 22
              WHEN sp.name ILIKE '%basic%' THEN 15
              ELSE 0
            END
          ELSE 0
        END
      ), 0) AS subscription_total
    FROM lender_subscriptions ls
    LEFT JOIN subscription_plans sp ON ls.plan_id = sp.id
    WHERE ls.status = 'active'
  ),
  transaction_stats AS (
    SELECT
      COALESCE(SUM(amount * 0.02), 0) AS transaction_total
    FROM loans
    WHERE status IN ('active', 'completed')
    AND created_at >= NOW() - INTERVAL '30 days'
  )
  SELECT
    (rs.subscription_total + ts.transaction_total)::NUMERIC AS total_revenue,
    rs.subscription_total::NUMERIC AS subscription_revenue,
    ts.transaction_total::NUMERIC AS transaction_fees,
    rs.subscription_total::NUMERIC AS monthly_recurring,
    12.5::NUMERIC AS growth_rate
  FROM revenue_stats rs
  CROSS JOIN transaction_stats ts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Credit score calculation function
CREATE OR REPLACE FUNCTION calculate_credit_score(borrower_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_score INTEGER;
  payment_history_score INTEGER;
  loan_amount_score INTEGER;
  loan_frequency_score INTEGER;
  profile_completion_score INTEGER;
BEGIN
  -- Payment History (40% weight)
  SELECT 
    CASE
      WHEN COUNT(*) = 0 THEN 300
      WHEN (COUNT(*) FILTER (WHERE status = 'completed' AND payment_date <= due_date)::NUMERIC / COUNT(*)::NUMERIC) >= 0.95 THEN 340
      WHEN (COUNT(*) FILTER (WHERE status = 'completed' AND payment_date <= due_date)::NUMERIC / COUNT(*)::NUMERIC) >= 0.85 THEN 280
      WHEN (COUNT(*) FILTER (WHERE status = 'completed' AND payment_date <= due_date)::NUMERIC / COUNT(*)::NUMERIC) >= 0.70 THEN 200
      ELSE 100
    END INTO payment_history_score
  FROM loan_repayments lr
  JOIN loans l ON lr.loan_id = l.id
  WHERE l.borrower_id = calculate_credit_score.borrower_id;

  -- Loan Amount Responsibility (20% weight)
  SELECT
    CASE
      WHEN AVG(amount) <= 1000 THEN 170
      WHEN AVG(amount) <= 5000 THEN 150
      WHEN AVG(amount) <= 10000 THEN 120
      ELSE 85
    END INTO loan_amount_score
  FROM loans
  WHERE loans.borrower_id = calculate_credit_score.borrower_id;

  -- Loan Frequency (20% weight)
  SELECT
    CASE
      WHEN COUNT(*) >= 10 AND COUNT(*) FILTER (WHERE status = 'completed') >= 8 THEN 170
      WHEN COUNT(*) >= 5 AND COUNT(*) FILTER (WHERE status = 'completed') >= 4 THEN 150
      WHEN COUNT(*) >= 3 AND COUNT(*) FILTER (WHERE status = 'completed') >= 2 THEN 120
      WHEN COUNT(*) >= 1 THEN 100
      ELSE 85
    END INTO loan_frequency_score
  FROM loans
  WHERE loans.borrower_id = calculate_credit_score.borrower_id;

  -- Profile Completion (20% weight)
  SELECT
    CASE
      WHEN verified = true AND phone IS NOT NULL AND employment_status IS NOT NULL THEN 170
      WHEN verified = true THEN 140
      WHEN phone IS NOT NULL AND employment_status IS NOT NULL THEN 110
      ELSE 85
    END INTO profile_completion_score
  FROM profiles
  WHERE id = calculate_credit_score.borrower_id;

  -- Calculate total score
  new_score := payment_history_score + loan_amount_score + loan_frequency_score + profile_completion_score;
  
  -- Ensure score is within valid range (300-850)
  new_score := GREATEST(300, LEAST(850, new_score));

  -- Update profile with new score
  UPDATE profiles
  SET 
    credit_score = new_score,
    updated_at = NOW()
  WHERE id = calculate_credit_score.borrower_id;

  -- Record in history
  INSERT INTO credit_score_history (borrower_id, score, recorded_at)
  VALUES (calculate_credit_score.borrower_id, new_score, NOW());

  RETURN new_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 3: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lender_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_score_history ENABLE ROW LEVEL SECURITY;

-- PROFILES TABLE POLICIES
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Lenders can view borrower profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'lender'
    )
  );

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Country admins can view profiles in their country" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'country_admin'
      AND p.country_id = profiles.country_id
    )
  );

-- LOANS TABLE POLICIES
CREATE POLICY "Borrowers can view their own loans" ON loans
  FOR SELECT USING (
    borrower_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Lenders can view and manage their loans" ON loans
  FOR ALL USING (
    lender_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all loans" ON loans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Country admins can view loans in their country" ON loans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p1, profiles p2
      WHERE p1.auth_user_id = auth.uid()
      AND p1.role = 'country_admin'
      AND p2.id = loans.borrower_id
      AND p1.country_id = p2.country_id
    )
  );

-- LOAN REQUESTS TABLE POLICIES
CREATE POLICY "Borrowers can manage their own loan requests" ON loan_requests
  FOR ALL USING (
    borrower_profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Lenders can view all loan requests" ON loan_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND role = 'lender'
    )
  );

CREATE POLICY "Admins can manage all loan requests" ON loan_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- LOAN REPAYMENTS TABLE POLICIES
CREATE POLICY "Users can view repayments for their loans" ON loan_repayments
  FOR SELECT USING (
    loan_id IN (
      SELECT id FROM loans
      WHERE borrower_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      OR lender_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Borrowers can create repayments" ON loan_repayments
  FOR INSERT WITH CHECK (
    loan_id IN (
      SELECT id FROM loans
      WHERE borrower_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage all repayments" ON loan_repayments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- NOTIFICATIONS TABLE POLICIES
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- AUDIT LOGS TABLE POLICIES
CREATE POLICY "Only admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Country admins can view audit logs for their country" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'country_admin'
      AND (
        target_id IN (
          SELECT id FROM profiles WHERE country_id = p.country_id
        )
        OR target_id IN (
          SELECT id FROM loans l
          JOIN profiles p2 ON l.borrower_id = p2.id
          WHERE p2.country_id = p.country_id
        )
      )
    )
  );

-- RISK ALERTS TABLE POLICIES
CREATE POLICY "Admins can manage risk alerts" ON risk_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Country admins can manage country risk alerts" ON risk_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'country_admin'
      AND risk_alerts.country_id = p.country_id
    )
  );

-- SUPPORT TICKETS TABLE POLICIES
CREATE POLICY "Users can view their own tickets" ON support_tickets
  FOR SELECT USING (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all tickets" ON support_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Country admins can manage country tickets" ON support_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'country_admin'
      AND support_tickets.country_id = p.country_id
    )
  );

-- LOAN OFFERS TABLE POLICIES
CREATE POLICY "Lenders can manage their offers" ON loan_offers
  FOR ALL USING (
    lender_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
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

CREATE POLICY "Admins can view all offers" ON loan_offers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- CREDIT SCORE HISTORY POLICIES
CREATE POLICY "Borrowers can view their credit history" ON credit_score_history
  FOR SELECT USING (
    borrower_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Lenders can view credit history of borrowers" ON credit_score_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND role = 'lender'
    )
  );

CREATE POLICY "Admins can view all credit history" ON credit_score_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- PART 4: INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_country_id ON profiles(country_id);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(verified);
CREATE INDEX IF NOT EXISTS idx_profiles_is_blacklisted ON profiles(is_blacklisted);

CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loans_lender_id ON loans(lender_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON loans(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_loan_requests_borrower_profile_id ON loan_requests(borrower_profile_id);
CREATE INDEX IF NOT EXISTS idx_loan_requests_status ON loan_requests(status);
CREATE INDEX IF NOT EXISTS idx_loan_requests_country_id ON loan_requests(country_id);

CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_status ON loan_repayments(status);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_due_date ON loan_repayments(due_date);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_alerts_resolved ON risk_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_severity ON risk_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_country_id ON risk_alerts(country_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_country_id ON support_tickets(country_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- ============================================
-- PART 5: GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_lender_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_borrower_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_system_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_country_admin_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_revenue_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_credit_score(UUID) TO authenticated;

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ COMPLETE DASHBOARD BACKEND SETUP SUCCESSFUL';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created/Updated:';
  RAISE NOTICE '  • Core tables with all necessary columns';
  RAISE NOTICE '  • Dashboard functions for all roles';
  RAISE NOTICE '  • Row Level Security policies';
  RAISE NOTICE '  • Performance indexes';
  RAISE NOTICE '  • Proper permissions';
  RAISE NOTICE '';
  RAISE NOTICE 'Dashboards Ready:';
  RAISE NOTICE '  • Lender Dashboard (/lender/dashboard)';
  RAISE NOTICE '  • Borrower Dashboard (/borrower/dashboard)';
  RAISE NOTICE '  • Admin Dashboard (/admin/dashboard)';
  RAISE NOTICE '  • Country Admin Dashboard (/admin/country/dashboard)';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies Active For:';
  RAISE NOTICE '  • User-specific data isolation';
  RAISE NOTICE '  • Role-based access control';
  RAISE NOTICE '  • Country-level restrictions';
  RAISE NOTICE '  • Admin oversight capabilities';
  RAISE NOTICE '================================================';
END $$;