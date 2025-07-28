-- Add country support to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id),
ADD COLUMN IF NOT EXISTS detected_country_code VARCHAR(3),
ADD COLUMN IF NOT EXISTS signup_ip_address INET;

-- Update subscription plans to be country-specific
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id);

-- Update existing subscription plans to be country-neutral
UPDATE subscription_plans SET country_id = NULL;
