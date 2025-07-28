CREATE TABLE subscription_plans (
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
