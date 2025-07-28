-- Remove the expiry_date concept since blacklisted borrowers should remain until manually removed
ALTER TABLE IF EXISTS blacklisted_borrowers 
DROP COLUMN IF EXISTS expiry_date;

-- Add columns to track deregistration
ALTER TABLE IF EXISTS blacklisted_borrowers 
ADD COLUMN IF NOT EXISTS deregistered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deregistered_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS deregistration_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deregistration_reason TEXT;

-- Update the is_borrower_blacklisted function to consider deregistration status
CREATE OR REPLACE FUNCTION is_borrower_blacklisted(borrower_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blacklisted_borrowers 
    WHERE borrower_profile_id = borrower_id 
    AND is_active = TRUE
    AND deregistered = FALSE
  );
END;
$$ LANGUAGE plpgsql;

-- Create a function to deregister a borrower from the blacklist
CREATE OR REPLACE FUNCTION deregister_blacklisted_borrower(
  p_borrower_id UUID,
  p_deregistered_by UUID,
  p_deregistration_reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_lender BOOLEAN;
BEGIN
  -- Check if the user deregistering is an admin
  SELECT EXISTS (
    SELECT 1 FROM user_profile_roles upr
    JOIN user_roles ur ON upr.user_role_id = ur.id
    WHERE upr.profile_id = p_deregistered_by
    AND ur.role_name = 'super_admin'
  ) INTO v_is_admin;
  
  -- Check if the user deregistering is a lender
  SELECT EXISTS (
    SELECT 1 FROM user_profile_roles upr
    JOIN user_roles ur ON upr.user_role_id = ur.id
    WHERE upr.profile_id = p_deregistered_by
    AND ur.role_name = 'lender'
  ) INTO v_is_lender;
  
  -- Only allow admins or lenders to deregister
  IF v_is_admin OR v_is_lender THEN
    UPDATE blacklisted_borrowers
    SET 
      deregistered = TRUE,
      deregistered_by = p_deregistered_by,
      deregistration_date = NOW(),
      deregistration_reason = p_deregistration_reason
    WHERE borrower_profile_id = p_borrower_id
    AND deregistered = FALSE;
    
    RETURN FOUND;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policy for deregistration
CREATE POLICY deregister_blacklisted_borrower_policy ON blacklisted_borrowers
  FOR UPDATE
  USING (TRUE)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profile_roles upr
      JOIN user_roles ur ON upr.user_role_id = ur.id
      WHERE upr.profile_id = auth.uid()
      AND (ur.role_name = 'super_admin' OR ur.role_name = 'lender')
    )
  );
