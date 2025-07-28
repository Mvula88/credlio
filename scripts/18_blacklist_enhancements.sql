-- Add additional fields to blacklisted_borrowers table if they don't exist
ALTER TABLE IF EXISTS blacklisted_borrowers 
ADD COLUMN IF NOT EXISTS reason_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS evidence_urls TEXT[],
ADD COLUMN IF NOT EXISTS system_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS severity_level VARCHAR(20) CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS verified_by_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_blacklisted_borrowers_country_active ON blacklisted_borrowers(country_id, is_active);

-- Create a function to automatically blacklist borrowers based on certain criteria
CREATE OR REPLACE FUNCTION auto_blacklist_borrowers() RETURNS TRIGGER AS $$
BEGIN
  -- Example logic: If a borrower has multiple failed payments, blacklist them
  IF (SELECT COUNT(*) FROM loan_payments 
      WHERE borrower_profile_id = NEW.borrower_profile_id 
      AND payment_status = 'failed') >= 3 THEN
    
    INSERT INTO blacklisted_borrowers (
      borrower_profile_id, 
      lender_profile_id,
      country_id, 
      reason, 
      is_active,
      reason_category,
      system_generated,
      severity_level
    ) VALUES (
      NEW.borrower_profile_id,
      NULL, -- System generated
      (SELECT country_id FROM profiles WHERE id = NEW.borrower_profile_id),
      'Automatically blacklisted due to multiple failed payments',
      TRUE,
      'payment_default',
      TRUE,
      'medium'
    )
    ON CONFLICT (borrower_profile_id, country_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic blacklisting
DROP TRIGGER IF EXISTS trg_auto_blacklist_borrowers ON loan_payments;
CREATE TRIGGER trg_auto_blacklist_borrowers
AFTER UPDATE OF payment_status ON loan_payments
FOR EACH ROW
WHEN (NEW.payment_status = 'failed')
EXECUTE FUNCTION auto_blacklist_borrowers();

-- Function to check if a borrower is blacklisted
CREATE OR REPLACE FUNCTION is_borrower_blacklisted(borrower_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blacklisted_borrowers 
    WHERE borrower_profile_id = borrower_id 
    AND is_active = TRUE
    AND (expiry_date IS NULL OR expiry_date > NOW())
  );
END;
$$ LANGUAGE plpgsql;
