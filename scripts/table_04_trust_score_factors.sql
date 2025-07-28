CREATE TABLE trust_score_factors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  factor_type VARCHAR(50) NOT NULL CHECK (factor_type IN ('payment_history', 'loan_completion', 'rating_received', 'time_on_platform', 'verification_status')),
  factor_value DECIMAL(5,2) NOT NULL,
  weight DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
