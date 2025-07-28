-- Function to check if user has marketplace access
CREATE OR REPLACE FUNCTION has_marketplace_access(user_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.profile_id = user_profile_id
    AND us.status IN ('active', 'trial')
    AND (us.expires_at IS NULL OR us.expires_at > NOW())
    AND sp.has_marketplace_access = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate trust score
CREATE OR REPLACE FUNCTION calculate_trust_score(user_profile_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_score DECIMAL(5,2) := 0;
  factor_record RECORD;
BEGIN
  FOR factor_record IN 
    SELECT factor_value, weight FROM trust_score_factors 
    WHERE profile_id = user_profile_id
  LOOP
    total_score := total_score + (factor_record.factor_value * factor_record.weight);
  END LOOP;
  
  -- Cap the score between 0 and 100
  total_score := GREATEST(0, LEAST(100, total_score));
  
  -- Update the profile with the calculated score
  UPDATE profiles SET trust_score = total_score WHERE id = user_profile_id;
  
  RETURN total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update average rating
CREATE OR REPLACE FUNCTION update_average_rating(user_profile_id UUID)
RETURNS VOID AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  rating_count INTEGER;
BEGIN
  SELECT AVG(rating), COUNT(*) 
  INTO avg_rating, rating_count
  FROM borrower_ratings 
  WHERE borrower_profile_id = user_profile_id;
  
  UPDATE profiles 
  SET average_rating = COALESCE(avg_rating, 0),
      total_ratings = COALESCE(rating_count, 0)
  WHERE id = user_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
