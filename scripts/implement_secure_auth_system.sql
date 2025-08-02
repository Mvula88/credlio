-- =====================================================
-- SECURE AUTHENTICATION SYSTEM WITH ID VERIFICATION
-- =====================================================

-- 1. Add ID verification fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS national_id_hash TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS id_type TEXT CHECK (id_type IN ('national_id', 'passport')),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS id_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_national_id_hash ON profiles(national_id_hash);

-- 2. Create table for document verification (no document storage)
CREATE TABLE IF NOT EXISTS document_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  document_hash TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('bank_statement', 'national_id', 'passport', 'utility_bill', 'employment_letter')),
  verification_status TEXT NOT NULL CHECK (verification_status IN ('verified', 'failed', 'suspicious')),
  verification_flags JSONB DEFAULT '{}',
  verified_at TIMESTAMP DEFAULT NOW(),
  verified_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent same document being used multiple times
  UNIQUE(document_hash, document_type)
);

-- 3. Create table for tracking verification alerts
CREATE TABLE IF NOT EXISTS verification_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('duplicate_document', 'failed_verification', 'suspicious_pattern', 'multiple_accounts_attempt')),
  document_hash TEXT,
  user_id UUID REFERENCES profiles(id),
  related_user_id UUID REFERENCES profiles(id), -- For duplicate detection
  details JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create table for device tracking
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  last_used TIMESTAMP DEFAULT NOW(),
  is_trusted BOOLEAN DEFAULT FALSE,
  trusted_at TIMESTAMP,
  trusted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, device_fingerprint)
);

-- 5. Create table for login attempts tracking
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT,
  ip_address TEXT,
  device_fingerprint TEXT,
  success BOOLEAN DEFAULT FALSE,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Create table for duplicate account prevention
CREATE TABLE IF NOT EXISTS identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  national_id_hash TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  id_type TEXT NOT NULL,
  country_code TEXT NOT NULL,
  verified_profile_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- This ensures one ID = one account
  UNIQUE(national_id_hash)
);

-- 7. Function to generate unique username
CREATE OR REPLACE FUNCTION generate_unique_username(country_code TEXT)
RETURNS TEXT AS $$
DECLARE
  new_username TEXT;
  username_exists BOOLEAN;
  counter INT := 0;
BEGIN
  LOOP
    -- Generate username: CRD-COUNTRY-YEAR-RANDOM
    new_username := 'CRD-' || UPPER(country_code) || '-' || 
                    EXTRACT(YEAR FROM NOW())::TEXT || '-' || 
                    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
    
    -- Check if username exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE username = new_username) INTO username_exists;
    
    -- If unique, return it
    IF NOT username_exists THEN
      RETURN new_username;
    END IF;
    
    -- Safety counter to prevent infinite loop
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Could not generate unique username after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to check for duplicate identity
CREATE OR REPLACE FUNCTION check_duplicate_identity(
  p_national_id_hash TEXT,
  p_full_name TEXT,
  p_date_of_birth DATE
)
RETURNS TABLE(is_duplicate BOOLEAN, existing_user_id UUID, reason TEXT) AS $$
BEGIN
  -- Check exact ID match
  IF EXISTS(SELECT 1 FROM profiles WHERE national_id_hash = p_national_id_hash) THEN
    RETURN QUERY
    SELECT 
      TRUE,
      id,
      'Exact ID match found'::TEXT
    FROM profiles 
    WHERE national_id_hash = p_national_id_hash
    LIMIT 1;
    RETURN;
  END IF;
  
  -- Check name + DOB match (possible duplicate)
  IF EXISTS(
    SELECT 1 FROM profiles 
    WHERE LOWER(full_name) = LOWER(p_full_name) 
    AND date_of_birth = p_date_of_birth
  ) THEN
    RETURN QUERY
    SELECT 
      TRUE,
      id,
      'Same name and date of birth found'::TEXT
    FROM profiles 
    WHERE LOWER(full_name) = LOWER(p_full_name) 
    AND date_of_birth = p_date_of_birth
    LIMIT 1;
    RETURN;
  END IF;
  
  -- No duplicate found
  RETURN QUERY SELECT FALSE, NULL::UUID, 'No duplicate found'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 9. RLS Policies for new tables
ALTER TABLE document_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

-- Document verifications: Users can see their own, lenders can see their borrowers'
CREATE POLICY "Users can view own document verifications"
  ON document_verifications FOR SELECT
  USING (auth.uid() = (SELECT auth_user_id FROM profiles WHERE id = user_id));

CREATE POLICY "Lenders can view borrower document verifications"
  ON document_verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles lender
      WHERE lender.auth_user_id = auth.uid()
      AND lender.role = 'lender'
      AND EXISTS (
        SELECT 1 FROM loans
        WHERE lender_id = lender.id
        AND borrower_id = document_verifications.user_id
      )
    )
  );

-- Admins can view all
CREATE POLICY "Admins can view all document verifications"
  ON document_verifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'country_admin')
    )
  );

-- User devices: Only own devices
CREATE POLICY "Users can manage own devices"
  ON user_devices FOR ALL
  USING (auth.uid() = (SELECT auth_user_id FROM profiles WHERE id = user_id));

-- Verification alerts: Only admins
CREATE POLICY "Only admins can view verification alerts"
  ON verification_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'country_admin')
    )
  );

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_verifications_user_id ON document_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_document_verifications_hash ON document_verifications(document_hash);
CREATE INDEX IF NOT EXISTS idx_verification_alerts_user_id ON verification_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_identity_verifications_hash ON identity_verifications(national_id_hash);