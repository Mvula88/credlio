-- Add risk tracking columns to borrower_profiles table (SAFE VERSION)
-- This script safely adds the necessary columns for tracking risky borrowers

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS mark_borrower_risky(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS mark_borrower_improved(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS check_and_auto_improve_borrower(UUID);

-- Add columns to borrower_profiles if they don't exist
ALTER TABLE borrower_profiles 
ADD COLUMN IF NOT EXISTS is_risky BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS was_risky_before BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS risky_marked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS risky_marked_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS improved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS improved_by UUID REFERENCES profiles(id);

-- Create borrower_risk_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS borrower_risk_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  borrower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action VARCHAR(20) CHECK (action IN ('marked_risky', 'marked_improved')),
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_borrower_risk_history_borrower ON borrower_risk_history(borrower_id);
CREATE INDEX IF NOT EXISTS idx_borrower_profiles_risky ON borrower_profiles(is_risky);

-- Enable RLS on borrower_risk_history
ALTER TABLE borrower_risk_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Borrowers can view own risk history" ON borrower_risk_history;
DROP POLICY IF EXISTS "Lenders can view risk history" ON borrower_risk_history;
DROP POLICY IF EXISTS "Lenders can add risk history" ON borrower_risk_history;
DROP POLICY IF EXISTS "Lenders can update risk history" ON borrower_risk_history;
DROP POLICY IF EXISTS "System can insert risk history" ON borrower_risk_history;

-- Create RLS policies for borrower_risk_history
CREATE POLICY "Borrowers can view own risk history"
  ON borrower_risk_history FOR SELECT
  USING (borrower_id = auth.uid());

CREATE POLICY "Lenders can view risk history"
  ON borrower_risk_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lender'
    )
  );

CREATE POLICY "System can insert risk history"
  ON borrower_risk_history FOR INSERT
  WITH CHECK (true);

-- Create function to mark borrower as risky
CREATE OR REPLACE FUNCTION mark_borrower_risky(
  p_borrower_id UUID,
  p_reason TEXT,
  p_marked_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_profile_exists BOOLEAN;
BEGIN
  -- Check if borrower profile exists, if not create it
  SELECT EXISTS(
    SELECT 1 FROM borrower_profiles WHERE user_id = p_borrower_id
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    INSERT INTO borrower_profiles (user_id) VALUES (p_borrower_id);
  END IF;

  -- Update borrower_profiles
  UPDATE borrower_profiles
  SET 
    is_risky = true,
    was_risky_before = true,
    risky_marked_at = NOW(),
    risky_marked_by = p_marked_by
  WHERE user_id = p_borrower_id;

  -- Insert into history
  INSERT INTO borrower_risk_history (
    borrower_id,
    action,
    performed_by,
    reason
  ) VALUES (
    p_borrower_id,
    'marked_risky',
    p_marked_by,
    p_reason
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark borrower as improved
CREATE OR REPLACE FUNCTION mark_borrower_improved(
  p_borrower_id UUID,
  p_reason TEXT,
  p_marked_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_profile_exists BOOLEAN;
BEGIN
  -- Check if borrower profile exists
  SELECT EXISTS(
    SELECT 1 FROM borrower_profiles WHERE user_id = p_borrower_id
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    -- Nothing to improve if profile doesn't exist
    RETURN false;
  END IF;

  -- Update borrower_profiles
  UPDATE borrower_profiles
  SET 
    is_risky = false,
    improved_at = NOW(),
    improved_by = p_marked_by
  WHERE user_id = p_borrower_id;

  -- Insert into history
  INSERT INTO borrower_risk_history (
    borrower_id,
    action,
    performed_by,
    reason
  ) VALUES (
    p_borrower_id,
    'marked_improved',
    p_marked_by,
    p_reason
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check and auto-improve borrower
CREATE OR REPLACE FUNCTION check_and_auto_improve_borrower(p_loan_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_loan_record RECORD;
  v_is_fully_paid BOOLEAN;
BEGIN
  -- Get loan details
  SELECT 
    borrower_id,
    total_amount,
    amount_paid,
    (amount_paid >= total_amount) as fully_paid
  INTO v_loan_record
  FROM active_loans
  WHERE id = p_loan_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- If loan is fully paid and borrower is risky, mark as improved
  IF v_loan_record.fully_paid THEN
    UPDATE borrower_profiles bp
    SET 
      is_risky = false,
      improved_at = NOW(),
      improved_by = NULL -- System auto-improvement
    WHERE bp.user_id = v_loan_record.borrower_id
    AND bp.is_risky = true;

    -- Log the improvement if it happened
    IF FOUND THEN
      INSERT INTO borrower_risk_history (
        borrower_id,
        action,
        performed_by,
        reason
      ) VALUES (
        v_loan_record.borrower_id,
        'marked_improved',
        NULL,
        'Auto-improved: Loan fully repaid'
      );
      
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the blacklists table (if it doesn't exist)
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