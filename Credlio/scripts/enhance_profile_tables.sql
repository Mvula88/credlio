-- =====================================================
-- ENHANCE PROFILE TABLES FOR COMPLETE PROFILE MANAGEMENT
-- =====================================================

-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state_province VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS country_code VARCHAR(3),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add missing columns to borrower_profiles table
ALTER TABLE borrower_profiles
ADD COLUMN IF NOT EXISTS occupation VARCHAR(100),
ADD COLUMN IF NOT EXISTS employer_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS years_employed INTEGER,
ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS dependents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS education_level VARCHAR(100),
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS monthly_expenses DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS has_collateral BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS collateral_details TEXT,
ADD COLUMN IF NOT EXISTS credit_history_summary TEXT,
ADD COLUMN IF NOT EXISTS preferred_loan_tenure VARCHAR(50),
ADD COLUMN IF NOT EXISTS risk_tolerance VARCHAR(50) DEFAULT 'medium';

-- Create lender_profiles table for lender-specific information
CREATE TABLE IF NOT EXISTS lender_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  business_name VARCHAR(255),
  business_type VARCHAR(100), -- 'individual', 'company', 'institution'
  business_registration_number VARCHAR(100),
  business_address TEXT,
  business_phone VARCHAR(20),
  business_email VARCHAR(255),
  website_url TEXT,
  lending_since DATE,
  total_loans_given INTEGER DEFAULT 0,
  total_amount_lent DECIMAL(15,2) DEFAULT 0,
  average_interest_rate DECIMAL(5,2),
  default_loan_tenure VARCHAR(50),
  min_loan_amount DECIMAL(10,2),
  max_loan_amount DECIMAL(10,2),
  preferred_borrower_types TEXT[],
  lending_criteria TEXT,
  verification_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  verification_date TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES profiles(id),
  verification_documents JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profile settings table
CREATE TABLE IF NOT EXISTS profile_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  notification_preferences JSONB DEFAULT '{
    "email": {
      "loan_updates": true,
      "payment_reminders": true,
      "marketing": false,
      "security_alerts": true
    },
    "sms": {
      "payment_reminders": true,
      "security_alerts": true
    },
    "push": {
      "all": true
    }
  }',
  privacy_settings JSONB DEFAULT '{
    "profile_visibility": "registered_users",
    "show_contact_info": false,
    "allow_messages": true
  }',
  display_preferences JSONB DEFAULT '{
    "theme": "light",
    "language": "en",
    "currency": "USD",
    "date_format": "MM/DD/YYYY"
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_borrower_profiles_user ON borrower_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_lender_profiles_user ON lender_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_lender_profiles_business ON lender_profiles(business_name);

-- Enable RLS on new tables
ALTER TABLE lender_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own lender profile" ON lender_profiles;
DROP POLICY IF EXISTS "Users can update own lender profile" ON lender_profiles;
DROP POLICY IF EXISTS "Users can insert own lender profile" ON lender_profiles;
DROP POLICY IF EXISTS "Public can view verified lender profiles" ON lender_profiles;
DROP POLICY IF EXISTS "Users can manage own settings" ON profile_settings;

-- RLS Policies for lender_profiles
CREATE POLICY "Users can view own lender profile" ON lender_profiles
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own lender profile" ON lender_profiles
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own lender profile" ON lender_profiles
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid() AND role = 'lender'
    )
  );

-- Public can view verified lender profiles
CREATE POLICY "Public can view verified lender profiles" ON lender_profiles
  FOR SELECT USING (verification_status = 'verified');

-- RLS Policies for profile_settings
CREATE POLICY "Users can manage own settings" ON profile_settings
  FOR ALL USING (
    user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Create functions for profile management
CREATE OR REPLACE FUNCTION update_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_profiles_timestamp ON profiles;
DROP TRIGGER IF EXISTS update_borrower_profiles_timestamp ON borrower_profiles;
DROP TRIGGER IF EXISTS update_lender_profiles_timestamp ON lender_profiles;
DROP TRIGGER IF EXISTS update_profile_settings_timestamp ON profile_settings;

-- Add triggers to update timestamps
CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_timestamp();

CREATE TRIGGER update_borrower_profiles_timestamp
  BEFORE UPDATE ON borrower_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_timestamp();

CREATE TRIGGER update_lender_profiles_timestamp
  BEFORE UPDATE ON lender_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_timestamp();

CREATE TRIGGER update_profile_settings_timestamp
  BEFORE UPDATE ON profile_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_timestamp();

-- Function to update last seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET last_seen_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_last_seen TO authenticated;

-- Create view for complete user profile
CREATE OR REPLACE VIEW user_profile_complete AS
SELECT 
  p.*,
  CASE 
    WHEN p.role = 'borrower' THEN bp.id
    WHEN p.role = 'lender' THEN lp.id
  END as profile_id,
  bp.national_id,
  bp.employment_status,
  bp.monthly_income,
  bp.reputation_score,
  bp.occupation,
  bp.employer_name,
  lp.business_name,
  lp.business_type,
  lp.verification_status as lender_verification_status,
  lp.total_loans_given,
  lp.total_amount_lent,
  ps.notification_preferences,
  ps.privacy_settings,
  ps.display_preferences
FROM profiles p
LEFT JOIN borrower_profiles bp ON p.id = bp.user_id AND p.role = 'borrower'
LEFT JOIN lender_profiles lp ON p.id = lp.user_id AND p.role = 'lender'
LEFT JOIN profile_settings ps ON p.id = ps.user_id;

-- Grant access to the view
GRANT SELECT ON user_profile_complete TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Profile tables enhanced successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Enhancements added:';
  RAISE NOTICE '- Extended profiles table with avatar, address, verification fields';
  RAISE NOTICE '- Enhanced borrower_profiles with detailed financial info';
  RAISE NOTICE '- Created lender_profiles table for business information';
  RAISE NOTICE '- Added profile_settings for user preferences';
  RAISE NOTICE '- Created comprehensive RLS policies';
  RAISE NOTICE '- Added indexes for performance';
  RAISE NOTICE '- Created user_profile_complete view';
  RAISE NOTICE '';
  RAISE NOTICE 'All profile management backend is now ready!';
  RAISE NOTICE '';
END $$;