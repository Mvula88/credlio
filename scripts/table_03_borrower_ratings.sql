CREATE TABLE borrower_ratings (
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
