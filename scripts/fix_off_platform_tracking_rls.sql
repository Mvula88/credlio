-- Fix and improve RLS policies for off-platform tracking tables
-- This script ensures proper security and country isolation

-- 1. Fix off_platform_defaulters policies
DROP POLICY IF EXISTS "Lenders view same country defaulters" ON off_platform_defaulters;
DROP POLICY IF EXISTS "Lenders can report defaulters" ON off_platform_defaulters;

-- Lenders can only view defaulters from their country
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

-- Lenders can only report defaulters with proper validation
CREATE POLICY "Lenders can report defaulters"
  ON off_platform_defaulters FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN countries c ON c.id = p.country_id
      WHERE p.id = auth.uid() 
      AND p.role = 'lender'
      AND p.id = reported_by
      -- Ensure they're reporting in their own country
      AND c.code = country_code
    )
  );

-- Lenders cannot update or delete reports (immutable audit trail)
CREATE POLICY "No updates allowed"
  ON off_platform_defaulters FOR UPDATE
  USING (false);

CREATE POLICY "No deletes allowed"
  ON off_platform_defaulters FOR DELETE
  USING (false);

-- 2. Fix ghost_borrowers policies
DROP POLICY IF EXISTS "Lenders view own ghost borrowers" ON ghost_borrowers;
DROP POLICY IF EXISTS "Lenders view defaulted ghost borrowers same country" ON ghost_borrowers;
DROP POLICY IF EXISTS "Lenders create ghost borrowers" ON ghost_borrowers;
DROP POLICY IF EXISTS "Lenders update own ghost borrowers" ON ghost_borrowers;

-- Lenders can view their own ghost borrowers
CREATE POLICY "Lenders view own ghost borrowers"
  ON ghost_borrowers FOR SELECT
  USING (
    lender_id = auth.uid() 
    OR 
    -- Other lenders can see defaulted ghost borrowers from same country
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
      AND c1.code = ghost_borrowers.country_code -- Extra safety
      AND gl.is_defaulted = true
    )
  );

-- Lenders can only create ghost borrowers for themselves in their country
CREATE POLICY "Lenders create ghost borrowers"
  ON ghost_borrowers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN countries c ON c.id = p.country_id
      WHERE p.id = auth.uid() 
      AND p.role = 'lender'
      AND p.id = lender_id
      AND c.code = country_code
    )
  );

-- Lenders can update only their own ghost borrowers (for linking to real profiles)
CREATE POLICY "Lenders update own ghost borrowers"
  ON ghost_borrowers FOR UPDATE
  USING (lender_id = auth.uid())
  WITH CHECK (lender_id = auth.uid());

-- No deletes allowed (audit trail)
CREATE POLICY "No ghost borrower deletes"
  ON ghost_borrowers FOR DELETE
  USING (false);

-- 3. Fix ghost_loans policies
DROP POLICY IF EXISTS "Lenders view own ghost loans" ON ghost_loans;
DROP POLICY IF EXISTS "Lenders view defaulted ghost loans same country" ON ghost_loans;
DROP POLICY IF EXISTS "Lenders manage own ghost loans" ON ghost_loans;

-- Lenders can view their own loans or defaulted loans from same country
CREATE POLICY "Lenders view ghost loans"
  ON ghost_loans FOR SELECT
  USING (
    lender_id = auth.uid()
    OR
    -- Other lenders can see defaulted loans from same country
    (is_defaulted = true AND EXISTS (
      SELECT 1 
      FROM profiles p1
      JOIN countries c1 ON c1.id = p1.country_id
      JOIN profiles p2 ON p2.id = ghost_loans.lender_id
      JOIN countries c2 ON c2.id = p2.country_id
      JOIN ghost_borrowers gb ON gb.id = ghost_loans.ghost_borrower_id
      WHERE p1.id = auth.uid() 
      AND p1.role = 'lender'
      AND c1.code = c2.code
      AND c1.code = gb.country_code
    ))
  );

-- Lenders can only create loans for their own ghost borrowers
CREATE POLICY "Lenders create ghost loans"
  ON ghost_loans FOR INSERT
  WITH CHECK (
    lender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM ghost_borrowers gb
      WHERE gb.id = ghost_borrower_id
      AND gb.lender_id = auth.uid()
    )
  );

-- Lenders can update only their own loans
CREATE POLICY "Lenders update own ghost loans"
  ON ghost_loans FOR UPDATE
  USING (lender_id = auth.uid())
  WITH CHECK (lender_id = auth.uid());

-- No deletes allowed
CREATE POLICY "No ghost loan deletes"
  ON ghost_loans FOR DELETE
  USING (false);

-- 4. Fix ghost_loan_payments policies
DROP POLICY IF EXISTS "View payments for accessible loans" ON ghost_loan_payments;
DROP POLICY IF EXISTS "Lenders record payments" ON ghost_loan_payments;

-- View payments only for loans you can access
CREATE POLICY "View accessible loan payments"
  ON ghost_loan_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ghost_loans gl
      WHERE gl.id = ghost_loan_payments.ghost_loan_id
      AND (
        gl.lender_id = auth.uid()
        OR
        -- For defaulted loans visible to same country
        (gl.is_defaulted = true AND EXISTS (
          SELECT 1 
          FROM profiles p1
          JOIN countries c1 ON c1.id = p1.country_id
          JOIN profiles p2 ON p2.id = gl.lender_id
          JOIN countries c2 ON c2.id = p2.country_id
          JOIN ghost_borrowers gb ON gb.id = gl.ghost_borrower_id
          WHERE p1.id = auth.uid() 
          AND p1.role = 'lender'
          AND c1.code = c2.code
          AND c1.code = gb.country_code
        ))
      )
    )
  );

-- Only record payments for your own loans
CREATE POLICY "Lenders record own loan payments"
  ON ghost_loan_payments FOR INSERT
  WITH CHECK (
    recorded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM ghost_loans
      WHERE ghost_loans.id = ghost_loan_id
      AND ghost_loans.lender_id = auth.uid()
    )
  );

-- No updates or deletes (immutable payment history)
CREATE POLICY "No payment updates"
  ON ghost_loan_payments FOR UPDATE
  USING (false);

CREATE POLICY "No payment deletes"
  ON ghost_loan_payments FOR DELETE
  USING (false);

-- 5. Additional security function to validate country consistency
CREATE OR REPLACE FUNCTION validate_country_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- For off_platform_defaulters
  IF TG_TABLE_NAME = 'off_platform_defaulters' THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles p
      JOIN countries c ON c.id = p.country_id
      WHERE p.id = NEW.reported_by
      AND c.code = NEW.country_code
    ) THEN
      RAISE EXCEPTION 'Reporter must be from the same country as the report';
    END IF;
  END IF;

  -- For ghost_borrowers
  IF TG_TABLE_NAME = 'ghost_borrowers' THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles p
      JOIN countries c ON c.id = p.country_id
      WHERE p.id = NEW.lender_id
      AND c.code = NEW.country_code
    ) THEN
      RAISE EXCEPTION 'Lender must be from the same country as the ghost borrower';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for country validation
DROP TRIGGER IF EXISTS validate_off_platform_country ON off_platform_defaulters;
CREATE TRIGGER validate_off_platform_country
  BEFORE INSERT ON off_platform_defaulters
  FOR EACH ROW EXECUTE FUNCTION validate_country_consistency();

DROP TRIGGER IF EXISTS validate_ghost_borrower_country ON ghost_borrowers;
CREATE TRIGGER validate_ghost_borrower_country
  BEFORE INSERT ON ghost_borrowers
  FOR EACH ROW EXECUTE FUNCTION validate_country_consistency();

-- 6. Create audit log for all risk-related actions
CREATE TABLE IF NOT EXISTS risk_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id),
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE risk_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins view audit logs"
  ON risk_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- System can insert audit logs
CREATE POLICY "System inserts audit logs"
  ON risk_audit_log FOR INSERT
  WITH CHECK (true);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION log_risk_action()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO risk_audit_log (
    actor_id,
    action,
    table_name,
    record_id,
    details
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to all risk tables
CREATE TRIGGER audit_off_platform_defaulters
  AFTER INSERT OR UPDATE OR DELETE ON off_platform_defaulters
  FOR EACH ROW EXECUTE FUNCTION log_risk_action();

CREATE TRIGGER audit_ghost_borrowers
  AFTER INSERT OR UPDATE OR DELETE ON ghost_borrowers
  FOR EACH ROW EXECUTE FUNCTION log_risk_action();

CREATE TRIGGER audit_ghost_loans
  AFTER INSERT OR UPDATE OR DELETE ON ghost_loans
  FOR EACH ROW EXECUTE FUNCTION log_risk_action();

CREATE TRIGGER audit_blacklists
  AFTER INSERT OR UPDATE OR DELETE ON blacklists
  FOR EACH ROW EXECUTE FUNCTION log_risk_action();