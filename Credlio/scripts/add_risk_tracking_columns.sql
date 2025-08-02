-- Add risk tracking columns to borrower_profiles table
-- This script adds the necessary columns for tracking risky borrowers

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

-- Create RLS policies for borrower_risk_history
DROP POLICY IF EXISTS "Borrowers can view own risk history" ON borrower_risk_history;
CREATE POLICY "Borrowers can view own risk history"
  ON borrower_risk_history FOR SELECT
  USING (borrower_id = auth.uid());

DROP POLICY IF EXISTS "Lenders can view risk history" ON borrower_risk_history;
CREATE POLICY "Lenders can view risk history"
  ON borrower_risk_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lender'
    )
  );

DROP POLICY IF EXISTS "System can insert risk history" ON borrower_risk_history;
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
BEGIN
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
BEGIN
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