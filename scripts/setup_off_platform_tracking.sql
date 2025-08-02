-- Setup for Off-Platform Defaulters and Ghost Borrower Tracking
-- This script creates tables for tracking borrowers outside the Credlio platform

-- 0. Create blacklists table if it doesn't exist
CREATE TABLE IF NOT EXISTS blacklists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  borrower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  blacklisted_by UUID REFERENCES profiles(id),
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('missed_payments', 'fraud', 'false_information', 'harassment', 'other')),
  evidence JSONB,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'expired')),
  auto_generated BOOLEAN DEFAULT FALSE,
  total_amount_defaulted DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for blacklists if not exists
CREATE INDEX IF NOT EXISTS idx_blacklists_borrower ON blacklists(borrower_id);
CREATE INDEX IF NOT EXISTS idx_blacklists_status ON blacklists(status);
CREATE INDEX IF NOT EXISTS idx_blacklists_blacklisted_by ON blacklists(blacklisted_by);

-- Enable RLS on blacklists if not already enabled
ALTER TABLE blacklists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Borrowers can view own blacklist entries" ON blacklists;
DROP POLICY IF EXISTS "Lenders can view all blacklist entries" ON blacklists;
DROP POLICY IF EXISTS "Lenders can create blacklist entries" ON blacklists;
DROP POLICY IF EXISTS "Lenders can update own blacklist entries" ON blacklists;

-- Create RLS policies for blacklists
CREATE POLICY "Borrowers can view own blacklist entries"
  ON blacklists FOR SELECT
  USING (borrower_id = auth.uid());

CREATE POLICY "Lenders can view all blacklist entries"
  ON blacklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lender'
    )
  );

CREATE POLICY "Lenders can create blacklist entries"
  ON blacklists FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lender'
      AND profiles.id = blacklisted_by
    )
  );

CREATE POLICY "Lenders can update own blacklist entries"
  ON blacklists FOR UPDATE
  USING (
    blacklisted_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lender'
    )
  );

-- 1. Create off_platform_defaulters table
CREATE TABLE IF NOT EXISTS off_platform_defaulters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  country_code VARCHAR(2) NOT NULL,
  loan_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  reported_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for searching by name and phone
  CONSTRAINT unique_report_per_lender UNIQUE(full_name, phone_number, reported_by)
);

-- Create indexes for performance
CREATE INDEX idx_off_platform_defaulters_country ON off_platform_defaulters(country_code);
CREATE INDEX idx_off_platform_defaulters_name ON off_platform_defaulters(LOWER(full_name));
CREATE INDEX idx_off_platform_defaulters_phone ON off_platform_defaulters(phone_number) WHERE phone_number IS NOT NULL;

-- 2. Create ghost_borrowers table for tracking offline borrowers
CREATE TABLE IF NOT EXISTS ghost_borrowers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  country_code VARCHAR(2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- This will be populated if/when the ghost borrower creates a real account
  linked_profile_id UUID REFERENCES profiles(id),
  linked_at TIMESTAMPTZ,
  
  -- Ensure unique ghost borrower per lender
  CONSTRAINT unique_ghost_per_lender UNIQUE(lender_id, full_name, phone_number)
);

-- 3. Create ghost_loans table for tracking loans to ghost borrowers
CREATE TABLE IF NOT EXISTS ghost_loans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ghost_borrower_id UUID REFERENCES ghost_borrowers(id) ON DELETE CASCADE,
  lender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Loan details
  loan_amount DECIMAL(10, 2) NOT NULL CHECK (loan_amount > 0),
  currency VARCHAR(3) DEFAULT 'USD',
  interest_rate DECIMAL(5, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  
  -- Dates
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid', 'overdue', 'defaulted')),
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  last_payment_date DATE,
  
  -- Risk tracking
  is_defaulted BOOLEAN DEFAULT FALSE,
  defaulted_at TIMESTAMPTZ,
  days_overdue INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create ghost_loan_payments table
CREATE TABLE IF NOT EXISTS ghost_loan_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ghost_loan_id UUID REFERENCES ghost_loans(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS on all tables
ALTER TABLE off_platform_defaulters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_loan_payments ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for off_platform_defaulters
-- Lenders can view all defaulters from their country
CREATE POLICY "Lenders view same country defaulters"
  ON off_platform_defaulters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN countries c ON c.id = p.country_id
      WHERE p.id = auth.uid() 
      AND p.role = 'lender'
      AND c.code = off_platform_defaulters.country_code
    )
  );

-- Lenders can report defaulters
CREATE POLICY "Lenders can report defaulters"
  ON off_platform_defaulters FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lender'
      AND profiles.id = reported_by
    )
  );

-- 7. Create RLS policies for ghost_borrowers
-- Lenders can view their own ghost borrowers
CREATE POLICY "Lenders view own ghost borrowers"
  ON ghost_borrowers FOR SELECT
  USING (lender_id = auth.uid());

-- Lenders from same country can view defaulted ghost borrowers
CREATE POLICY "Lenders view defaulted ghost borrowers same country"
  ON ghost_borrowers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p1
      JOIN countries c1 ON c1.id = p1.country_id
      JOIN profiles p2 ON p2.id = ghost_borrowers.lender_id
      JOIN countries c2 ON c2.id = p2.country_id
      JOIN ghost_loans gl ON gl.ghost_borrower_id = ghost_borrowers.id
      WHERE p1.id = auth.uid() 
      AND p1.role = 'lender'
      AND c1.code = c2.code
      AND c1.code = ghost_borrowers.country_code
      AND gl.is_defaulted = true
    )
  );

-- Lenders can create ghost borrowers
CREATE POLICY "Lenders create ghost borrowers"
  ON ghost_borrowers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lender'
      AND profiles.id = lender_id
    )
  );

-- Lenders can update their ghost borrowers
CREATE POLICY "Lenders update own ghost borrowers"
  ON ghost_borrowers FOR UPDATE
  USING (lender_id = auth.uid());

-- 8. Create RLS policies for ghost_loans
-- Similar pattern for ghost_loans
CREATE POLICY "Lenders view own ghost loans"
  ON ghost_loans FOR SELECT
  USING (lender_id = auth.uid());

CREATE POLICY "Lenders view defaulted ghost loans same country"
  ON ghost_loans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p1
      JOIN countries c1 ON c1.id = p1.country_id
      JOIN profiles p2 ON p2.id = ghost_loans.lender_id
      JOIN countries c2 ON c2.id = p2.country_id
      WHERE p1.id = auth.uid() 
      AND p1.role = 'lender'
      AND c1.code = c2.code
      AND ghost_loans.is_defaulted = true
    )
  );

CREATE POLICY "Lenders manage own ghost loans"
  ON ghost_loans FOR ALL
  USING (lender_id = auth.uid());

-- 9. Create RLS policies for ghost_loan_payments
CREATE POLICY "View payments for accessible loans"
  ON ghost_loan_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ghost_loans
      WHERE ghost_loans.id = ghost_loan_payments.ghost_loan_id
      AND ghost_loans.lender_id = auth.uid()
    )
  );

CREATE POLICY "Lenders record payments"
  ON ghost_loan_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ghost_loans
      WHERE ghost_loans.id = ghost_loan_id
      AND ghost_loans.lender_id = auth.uid()
    )
  );

-- 10. Create function to check and mark overdue ghost loans
CREATE OR REPLACE FUNCTION check_overdue_ghost_loans()
RETURNS void AS $$
BEGIN
  UPDATE ghost_loans
  SET 
    status = CASE 
      WHEN CURRENT_DATE > due_date + INTERVAL '30 days' THEN 'defaulted'
      WHEN CURRENT_DATE > due_date THEN 'overdue'
      ELSE status
    END,
    is_defaulted = (CURRENT_DATE > due_date + INTERVAL '30 days'),
    defaulted_at = CASE 
      WHEN CURRENT_DATE > due_date + INTERVAL '30 days' AND defaulted_at IS NULL 
      THEN NOW() 
      ELSE defaulted_at 
    END,
    days_overdue = GREATEST(0, CURRENT_DATE - due_date),
    updated_at = NOW()
  WHERE status IN ('active', 'overdue')
  AND CURRENT_DATE > due_date;
END;
$$ LANGUAGE plpgsql;

-- 11. Create function to link ghost borrower to real profile
CREATE OR REPLACE FUNCTION link_ghost_borrower_to_profile(
  p_ghost_borrower_id UUID,
  p_profile_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_phone_match BOOLEAN;
  v_email_match BOOLEAN;
BEGIN
  -- Check if phone or email matches
  SELECT 
    gb.phone_number = p.phone_number,
    gb.email = p.email
  INTO v_phone_match, v_email_match
  FROM ghost_borrowers gb, profiles p
  WHERE gb.id = p_ghost_borrower_id
  AND p.id = p_profile_id;

  -- If there's a match, link them
  IF v_phone_match OR v_email_match THEN
    UPDATE ghost_borrowers
    SET 
      linked_profile_id = p_profile_id,
      linked_at = NOW()
    WHERE id = p_ghost_borrower_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 12. Create view for unified risk data
CREATE OR REPLACE VIEW unified_risk_view AS
-- Blacklisted borrowers
SELECT 
  b.borrower_id as profile_id,
  p.full_name,
  p.phone_number,
  c.code as country_code,
  'blacklisted' as risk_type,
  b.reason as risk_reason,
  b.created_at as flagged_at,
  1 as report_count
FROM blacklists b
JOIN profiles p ON p.id = b.borrower_id
JOIN countries c ON c.id = p.country_id
WHERE b.status = 'active'

UNION ALL

-- Risky borrowers from borrower_profiles
SELECT 
  bp.user_id as profile_id,
  p.full_name,
  p.phone_number,
  c.code as country_code,
  'risky' as risk_type,
  'System flagged' as risk_reason,
  bp.risky_marked_at as flagged_at,
  1 as report_count
FROM borrower_profiles bp
JOIN profiles p ON p.id = bp.user_id
JOIN countries c ON c.id = p.country_id
WHERE bp.is_risky = true

UNION ALL

-- Off-platform defaulters (grouped)
SELECT 
  NULL as profile_id,
  opd.full_name,
  opd.phone_number,
  opd.country_code,
  'off_platform' as risk_type,
  STRING_AGG(DISTINCT opd.reason, ', ') as risk_reason,
  MIN(opd.reported_at) as flagged_at,
  COUNT(DISTINCT opd.reported_by) as report_count
FROM off_platform_defaulters opd
GROUP BY opd.full_name, opd.phone_number, opd.country_code

UNION ALL

-- Defaulted ghost borrowers
SELECT 
  gb.linked_profile_id as profile_id,
  gb.full_name,
  gb.phone_number,
  gb.country_code,
  'ghost_defaulted' as risk_type,
  'Ghost loan defaulted' as risk_reason,
  MIN(gl.defaulted_at) as flagged_at,
  COUNT(DISTINCT gl.id) as report_count
FROM ghost_borrowers gb
JOIN ghost_loans gl ON gl.ghost_borrower_id = gb.id
WHERE gl.is_defaulted = true
GROUP BY gb.id, gb.linked_profile_id, gb.full_name, gb.phone_number, gb.country_code;

-- 13. Create function to get risk summary for a person
CREATE OR REPLACE FUNCTION get_person_risk_summary(
  p_full_name TEXT,
  p_phone_number TEXT DEFAULT NULL,
  p_country_code VARCHAR(2) DEFAULT NULL
)
RETURNS TABLE (
  risk_type TEXT,
  report_count BIGINT,
  last_reported TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    urv.risk_type,
    COUNT(*) as report_count,
    MAX(urv.flagged_at) as last_reported
  FROM unified_risk_view urv
  WHERE LOWER(urv.full_name) = LOWER(p_full_name)
  AND (p_phone_number IS NULL OR urv.phone_number = p_phone_number)
  AND (p_country_code IS NULL OR urv.country_code = p_country_code)
  GROUP BY urv.risk_type;
END;
$$ LANGUAGE plpgsql;

-- 14. Add triggers to auto-update ghost loan status
CREATE OR REPLACE FUNCTION update_ghost_loan_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update amount paid
  UPDATE ghost_loans
  SET 
    amount_paid = (
      SELECT COALESCE(SUM(amount), 0)
      FROM ghost_loan_payments
      WHERE ghost_loan_id = NEW.ghost_loan_id
    ),
    last_payment_date = NEW.payment_date,
    updated_at = NOW()
  WHERE id = NEW.ghost_loan_id;
  
  -- Check if fully paid
  UPDATE ghost_loans
  SET status = 'paid'
  WHERE id = NEW.ghost_loan_id
  AND amount_paid >= total_amount;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ghost_loan_on_payment
AFTER INSERT ON ghost_loan_payments
FOR EACH ROW
EXECUTE FUNCTION update_ghost_loan_status();

-- Run the overdue check function (can be scheduled)
SELECT check_overdue_ghost_loans();