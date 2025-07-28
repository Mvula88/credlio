CREATE TABLE borrower_appeals (
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
