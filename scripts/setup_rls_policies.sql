-- Enable RLS on all new tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_score_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_smart_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read)
CREATE POLICY "Anyone can view active subscription plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- RLS Policies for borrower_ratings
CREATE POLICY "Users can view ratings for borrowers in same country" ON borrower_ratings
  FOR SELECT USING (
    borrower_profile_id IN (
      SELECT p1.id FROM profiles p1
      JOIN profiles p2 ON p1.country = p2.country
      WHERE p2.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Lenders can rate borrowers" ON borrower_ratings
  FOR INSERT WITH CHECK (
    lender_profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid() AND role = 'lender'
    )
  );

-- RLS Policies for trust_score_factors
CREATE POLICY "Users can view own trust score factors" ON trust_score_factors
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- RLS Policies for borrower_smart_tags
CREATE POLICY "Users can view smart tags for borrowers in same country" ON borrower_smart_tags
  FOR SELECT USING (
    profile_id IN (
      SELECT p1.id FROM profiles p1
      JOIN profiles p2 ON p1.country = p2.country
      WHERE p2.auth_user_id = auth.uid()
    )
  );

-- RLS Policies for borrower_appeals
CREATE POLICY "Borrowers can view own appeals" ON borrower_appeals
  FOR SELECT USING (
    borrower_profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Borrowers can create appeals" ON borrower_appeals
  FOR INSERT WITH CHECK (
    borrower_profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid() AND role = 'borrower'
    )
  );

-- RLS Policies for whatsapp_preferences
CREATE POLICY "Users can manage own WhatsApp preferences" ON whatsapp_preferences
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- RLS Policies for whatsapp_message_log
CREATE POLICY "Users can view own WhatsApp messages" ON whatsapp_message_log
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );
