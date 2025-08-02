-- =====================================================
-- Add Lender-Borrower Relationship Tracking
-- =====================================================

-- First, drop tables if they exist to avoid conflicts
DROP TABLE IF EXISTS loan_payments CASCADE;
DROP TABLE IF EXISTS active_loans CASCADE;
DROP VIEW IF EXISTS lender_portfolio CASCADE;

-- Create active loans table to track lender-borrower relationships
CREATE TABLE IF NOT EXISTS active_loans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  borrower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  loan_request_id UUID REFERENCES loan_requests(id),
  amount DECIMAL(10,2) NOT NULL,
  interest_rate DECIMAL(5,2),
  duration_months INTEGER,
  start_date DATE DEFAULT CURRENT_DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'defaulted'
  total_amount_due DECIMAL(10,2),
  total_amount_paid DECIMAL(10,2) DEFAULT 0,
  last_payment_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lender_id, borrower_id, loan_request_id)
);

-- Create payment records table
CREATE TABLE IF NOT EXISTS loan_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  active_loan_id UUID REFERENCES active_loans(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50), -- 'cash', 'bank_transfer', 'mobile_money', etc
  receipt_number VARCHAR(100),
  notes TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add document checklist to active loans
ALTER TABLE active_loans
ADD COLUMN IF NOT EXISTS documents_verified JSONB DEFAULT '{
  "national_id": false,
  "proof_of_income": false,
  "collateral_docs": false,
  "guarantor_docs": false,
  "agreement_signed": false
}'::jsonb;

-- Create function to create active loan when offer is accepted
CREATE OR REPLACE FUNCTION create_active_loan(
  p_lender_id UUID,
  p_borrower_id UUID,
  p_loan_request_id UUID,
  p_amount DECIMAL,
  p_interest_rate DECIMAL DEFAULT 0,
  p_duration_months INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_loan_id UUID;
  v_expected_end_date DATE;
  v_total_amount_due DECIMAL;
BEGIN
  -- Calculate expected end date
  v_expected_end_date := CURRENT_DATE + (COALESCE(p_duration_months, 1) * INTERVAL '1 month')::interval;
  
  -- Calculate total amount due (principal + interest)
  v_total_amount_due := p_amount + (p_amount * COALESCE(p_interest_rate, 0) / 100);
  
  -- Create the active loan
  INSERT INTO active_loans (
    lender_id,
    borrower_id,
    loan_request_id,
    amount,
    interest_rate,
    duration_months,
    expected_end_date,
    total_amount_due
  )
  VALUES (
    p_lender_id,
    p_borrower_id,
    p_loan_request_id,
    p_amount,
    p_interest_rate,
    p_duration_months,
    v_expected_end_date,
    v_total_amount_due
  )
  RETURNING id INTO v_loan_id;
  
  -- Update loan request status
  UPDATE loan_requests 
  SET status = 'accepted' 
  WHERE id = p_loan_request_id;
  
  RETURN v_loan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record payment
CREATE OR REPLACE FUNCTION record_loan_payment(
  p_active_loan_id UUID,
  p_amount DECIMAL,
  p_payment_date DATE,
  p_payment_method VARCHAR DEFAULT 'cash',
  p_receipt_number VARCHAR DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_paid DECIMAL;
  v_total_due DECIMAL;
  v_borrower_id UUID;
BEGIN
  -- Insert payment record
  INSERT INTO loan_payments (
    active_loan_id,
    amount,
    payment_date,
    payment_method,
    receipt_number,
    notes,
    recorded_by
  )
  VALUES (
    p_active_loan_id,
    p_amount,
    p_payment_date,
    p_payment_method,
    p_receipt_number,
    p_notes,
    p_recorded_by
  );
  
  -- Update active loan totals
  UPDATE active_loans
  SET 
    total_amount_paid = total_amount_paid + p_amount,
    last_payment_date = p_payment_date,
    updated_at = NOW()
  WHERE id = p_active_loan_id
  RETURNING total_amount_paid, total_amount_due, borrower_id 
  INTO v_total_paid, v_total_due, v_borrower_id;
  
  -- Check if loan is fully paid
  IF v_total_paid >= v_total_due THEN
    UPDATE active_loans
    SET 
      status = 'completed',
      actual_end_date = p_payment_date
    WHERE id = p_active_loan_id;
    
    -- Auto-improve borrower if they were risky
    PERFORM mark_borrower_improved(
      v_borrower_id,
      'Automatic improvement: Successfully completed loan repayment',
      p_recorded_by
    );
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update document verification
CREATE OR REPLACE FUNCTION update_document_verification(
  p_active_loan_id UUID,
  p_document_type VARCHAR,
  p_is_verified BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE active_loans
  SET 
    documents_verified = jsonb_set(
      documents_verified,
      ARRAY[p_document_type],
      to_jsonb(p_is_verified)
    ),
    updated_at = NOW()
  WHERE id = p_active_loan_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create views for easier querying
CREATE OR REPLACE VIEW lender_portfolio AS
SELECT 
  al.*,
  b.full_name as borrower_name,
  b.email as borrower_email,
  b.phone_number as borrower_phone,
  bp.reputation_score,
  bp.is_risky,
  bp.was_risky_before,
  lr.purpose as loan_purpose,
  (al.total_amount_paid / NULLIF(al.total_amount_due, 0) * 100)::INTEGER as repayment_progress
FROM active_loans al
JOIN profiles b ON al.borrower_id = b.id
LEFT JOIN borrower_profiles bp ON bp.user_id = b.id
LEFT JOIN loan_requests lr ON al.loan_request_id = lr.id;

-- RLS Policies
ALTER TABLE active_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

-- Lenders can view their own active loans
CREATE POLICY "Lenders can view own active loans" ON active_loans
  FOR SELECT USING (
    lender_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Borrowers can view their own active loans
CREATE POLICY "Borrowers can view own active loans" ON active_loans
  FOR SELECT USING (
    borrower_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Lenders can create and update their active loans
CREATE POLICY "Lenders can manage own active loans" ON active_loans
  FOR ALL USING (
    lender_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Lenders can view and create payments for their loans
CREATE POLICY "Lenders can manage payments" ON loan_payments
  FOR ALL USING (
    active_loan_id IN (
      SELECT id FROM active_loans 
      WHERE lender_id IN (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Borrowers can view payments for their loans
CREATE POLICY "Borrowers can view payments" ON loan_payments
  FOR SELECT USING (
    active_loan_id IN (
      SELECT id FROM active_loans 
      WHERE borrower_id IN (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Create indexes for performance
CREATE INDEX idx_active_loans_lender ON active_loans(lender_id);
CREATE INDEX idx_active_loans_borrower ON active_loans(borrower_id);
CREATE INDEX idx_active_loans_status ON active_loans(status);
CREATE INDEX idx_loan_payments_active_loan ON loan_payments(active_loan_id);
CREATE INDEX idx_loan_payments_date ON loan_payments(payment_date);