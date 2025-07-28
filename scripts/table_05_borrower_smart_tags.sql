CREATE TABLE borrower_smart_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tag_name VARCHAR(100) NOT NULL,
  tag_category VARCHAR(50) NOT NULL CHECK (tag_category IN ('payment_behavior', 'experience_level', 'risk_level', 'communication')),
  auto_generated BOOLEAN DEFAULT TRUE,
  confidence_score DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
