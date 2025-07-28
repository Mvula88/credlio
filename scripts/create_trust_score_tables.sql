-- Step 1: Create trust_score_factors table
CREATE TABLE IF NOT EXISTS trust_score_factors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  factor_type VARCHAR(50) NOT NULL CHECK (factor_type IN ('payment_history', 'loan_completion', 'rating_received', 'time_on_platform', 'verification_status')),
  factor_value DECIMAL(5,2) NOT NULL,
  weight DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create borrower_ratings table
CREATE TABLE IF NOT EXISTS borrower_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  borrower_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lender_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  loan_offer_id UUID REFERENCES loan_offers(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(borrower_profile_id, lender_profile_id, loan_offer_id)
);

-- Step 3: Create borrower_smart_tags table
CREATE TABLE IF NOT EXISTS borrower_smart_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tag_name VARCHAR(100) NOT NULL,
  tag_category VARCHAR(50) NOT NULL CHECK (tag_category IN ('payment_behavior', 'experience_level', 'risk_level', 'communication')),
  auto_generated BOOLEAN DEFAULT TRUE,
  confidence_score DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create borrower_appeals table
CREATE TABLE IF NOT EXISTS borrower_appeals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  borrower_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  appeal_type VARCHAR(50) NOT NULL CHECK (appeal_type IN ('blacklist_appeal', 'loan_rejection_appeal', 'rating_dispute')),
  related_id UUID,
  appeal_reason TEXT NOT NULL,
  evidence_urls JSONB DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  admin_response TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Enable RLS
ALTER TABLE trust_score_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_smart_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_appeals ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS Policies
CREATE POLICY "trust_score_factors_own_data" ON trust_score_factors 
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "borrower_ratings_involved_parties" ON borrower_ratings 
  FOR ALL USING (
    borrower_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
    lender_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "borrower_smart_tags_viewable" ON borrower_smart_tags 
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid() AND p.role IN ('lender', 'admin')
    )
  );

CREATE POLICY "borrower_appeals_own_data" ON borrower_appeals 
  FOR ALL USING (
    borrower_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid() AND p.role = 'admin'
    )
  );
