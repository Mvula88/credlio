-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  price_nad DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_usd DECIMAL(10,2) NOT NULL DEFAULT 0,
  features TEXT[] NOT NULL DEFAULT '{}',
  has_marketplace_access BOOLEAN DEFAULT false,
  has_smart_matching BOOLEAN DEFAULT false,
  trial_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'trial', 'expired', 'cancelled')),
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, plan_id)
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price_nad, price_usd, features, has_marketplace_access, has_smart_matching, trial_days) VALUES
('Free Trial', 0, 0, ARRAY['View borrower profiles', 'Basic risk assessment', 'Limited to 5 borrowers per day'], false, false, 1),
('Basic', 180, 12, ARRAY['Unlimited borrower profiles', 'Advanced risk tools', 'Affordability calculator', 'Watchlist management'], false, false, 0),
('Premium', 250, 17, ARRAY['All Basic features', 'Marketplace access', 'Smart matching', 'Priority support', 'Advanced analytics'], true, true, 0)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read)
CREATE POLICY "Anyone can view subscription plans" ON subscription_plans
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

CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
  FOR UPDATE USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

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
