-- Trust score components and calculations
CREATE TABLE IF NOT EXISTS trust_score_factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  factor_type TEXT NOT NULL CHECK (factor_type IN ('payment_history', 'loan_completion', 'rating_received', 'time_on_platform', 'verification_status')),
  factor_value DECIMAL(5,2) NOT NULL,
  weight DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Borrower ratings and reviews
CREATE TABLE IF NOT EXISTS borrower_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrower_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lender_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  loan_offer_id UUID REFERENCES loan_offers(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(borrower_profile_id, lender_profile_id, loan_offer_id)
);

-- Smart tags for borrowers
CREATE TABLE IF NOT EXISTS borrower_smart_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_category TEXT NOT NULL CHECK (tag_category IN ('payment_behavior', 'experience_level', 'risk_level', 'communication')),
  auto_generated BOOLEAN DEFAULT TRUE,
  confidence_score DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Appeals system
CREATE TABLE IF NOT EXISTS borrower_appeals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrower_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appeal_type TEXT NOT NULL CHECK (appeal_type IN ('blacklist_appeal', 'loan_rejection_appeal', 'rating_dispute')),
  related_id UUID, -- Could be blacklist_id, loan_offer_id, or rating_id
  appeal_reason TEXT NOT NULL,
  evidence_urls JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  admin_response TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE trust_score_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_smart_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_appeals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trust_score_factors
CREATE POLICY "trust_score_factors_own_data" ON trust_score_factors 
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "trust_score_factors_lender_read" ON trust_score_factors 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_profile_roles upr ON p.id = upr.profile_id
      JOIN user_roles ur ON upr.role_id = ur.id
      WHERE p.auth_user_id = auth.uid() AND ur.role_name = 'lender'
    )
  );

-- RLS Policies for borrower_ratings
CREATE POLICY "borrower_ratings_involved_parties" ON borrower_ratings 
  FOR ALL USING (
    borrower_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
    lender_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- RLS Policies for borrower_smart_tags
CREATE POLICY "borrower_smart_tags_own_data" ON borrower_smart_tags 
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_profile_roles upr ON p.id = upr.profile_id
      JOIN user_roles ur ON upr.role_id = ur.id
      WHERE p.auth_user_id = auth.uid() AND ur.role_name IN ('lender', 'super_admin')
    )
  );

-- RLS Policies for borrower_appeals
CREATE POLICY "borrower_appeals_own_data" ON borrower_appeals 
  FOR ALL USING (
    borrower_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_profile_roles upr ON p.id = upr.profile_id
      JOIN user_roles ur ON upr.role_id = ur.id
      WHERE p.auth_user_id = auth.uid() AND ur.role_name = 'super_admin'
    )
  );
