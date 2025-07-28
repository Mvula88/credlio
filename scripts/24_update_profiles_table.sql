-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trust_score DECIMAL(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS signup_country_code TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('none', 'trial', 'basic', 'premium', 'expired'));

-- Function to calculate trust score
CREATE OR REPLACE FUNCTION calculate_trust_score(user_profile_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  score DECIMAL(5,2) := 0.0;
  payment_score DECIMAL(5,2) := 0.0;
  rating_score DECIMAL(5,2) := 0.0;
  experience_score DECIMAL(5,2) := 0.0;
BEGIN
  -- Payment history score (40% weight)
  SELECT COALESCE(
    (COUNT(CASE WHEN status = 'confirmed' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 40, 0
  ) INTO payment_score
  FROM loan_payments 
  WHERE borrower_profile_id = user_profile_id;
  
  -- Rating score (35% weight)
  SELECT COALESCE(AVG(rating) / 5.0 * 35, 0) INTO rating_score
  FROM borrower_ratings 
  WHERE borrower_profile_id = user_profile_id;
  
  -- Experience score (25% weight) - based on completed loans
  SELECT COALESCE(
    LEAST(COUNT(DISTINCT loan_offer_id) * 5, 25), 0
  ) INTO experience_score
  FROM loan_payments 
  WHERE borrower_profile_id = user_profile_id AND status = 'confirmed';
  
  score := payment_score + rating_score + experience_score;
  
  RETURN LEAST(score, 100.0);
END;
$$ LANGUAGE plpgsql;

-- Function to update trust scores
CREATE OR REPLACE FUNCTION update_trust_scores()
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET trust_score = calculate_trust_score(id)
  WHERE id IN (
    SELECT DISTINCT p.id 
    FROM profiles p
    JOIN user_profile_roles upr ON p.id = upr.profile_id
    JOIN user_roles ur ON upr.role_id = ur.id
    WHERE ur.role_name = 'borrower'
  );
END;
$$ LANGUAGE plpgsql;
