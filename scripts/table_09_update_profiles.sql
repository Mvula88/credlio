-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trust_score DECIMAL(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS signup_country_code VARCHAR(2),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'none' CHECK (subscription_status IN ('none', 'trial', 'basic', 'premium', 'expired'));
