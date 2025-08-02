-- =====================================================
-- FIX SUBSCRIPTION TABLES AND ADD CANCELLATION SUPPORT
-- =====================================================

-- Drop old conflicting tables if they exist
DROP TABLE IF EXISTS lender_subscriptions CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;

-- Update subscription_plans table with new pricing
UPDATE subscription_plans 
SET price_usd = 12.99 
WHERE name = 'Basic';

UPDATE subscription_plans 
SET price_usd = 19.99 
WHERE name = 'Premium';

-- Create the proper lender_subscriptions table
CREATE TABLE IF NOT EXISTS lender_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid', 'trialing')),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lender_id)
);

-- Add indexes for better performance
CREATE INDEX idx_lender_subscriptions_lender_id ON lender_subscriptions(lender_id);
CREATE INDEX idx_lender_subscriptions_status ON lender_subscriptions(status);
CREATE INDEX idx_lender_subscriptions_stripe_subscription ON lender_subscriptions(stripe_subscription_id);

-- Enable RLS on lender_subscriptions
ALTER TABLE lender_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lender_subscriptions
-- Lenders can view their own subscription
CREATE POLICY "Lenders can view own subscription" ON lender_subscriptions
  FOR SELECT USING (
    lender_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Lenders can update their own subscription (for cancel_at_period_end)
CREATE POLICY "Lenders can update own subscription" ON lender_subscriptions
  FOR UPDATE USING (
    lender_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- System/webhook can insert subscriptions
CREATE POLICY "Service role can manage subscriptions" ON lender_subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create a function to handle subscription cancellation
CREATE OR REPLACE FUNCTION cancel_subscription_at_period_end(p_lender_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_subscription RECORD;
  v_result JSONB;
BEGIN
  -- Get the current subscription
  SELECT * INTO v_subscription
  FROM lender_subscriptions
  WHERE lender_id = p_lender_id
  AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active subscription found'
    );
  END IF;
  
  -- Update the subscription to cancel at period end
  UPDATE lender_subscriptions
  SET 
    cancel_at_period_end = true,
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE lender_id = p_lender_id
  AND status = 'active';
  
  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription.stripe_subscription_id,
    'current_period_end', v_subscription.current_period_end
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cancel_subscription_at_period_end TO authenticated;

-- Create a view for subscription details with plan info
CREATE OR REPLACE VIEW subscription_details AS
SELECT 
  ls.*,
  sp.name as plan_name,
  sp.price_usd as plan_price,
  sp.features as plan_features,
  p.full_name as lender_name,
  p.email as lender_email
FROM lender_subscriptions ls
JOIN subscription_plans sp ON ls.plan_id = sp.id
JOIN profiles p ON ls.lender_id = p.id;

-- Grant access to the view
GRANT SELECT ON subscription_details TO authenticated;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lender_subscriptions_updated_at
  BEFORE UPDATE ON lender_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Subscription tables fixed and cancellation support added!';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '- Created lender_subscriptions table with proper structure';
  RAISE NOTICE '- Added cancel_at_period_end and cancelled_at columns';
  RAISE NOTICE '- Updated subscription plan prices (Basic: $12.99, Premium: $19.99)';
  RAISE NOTICE '- Added RLS policies for secure access';
  RAISE NOTICE '- Created cancel_subscription_at_period_end function';
  RAISE NOTICE '- Added subscription_details view for easy access';
  RAISE NOTICE '';
END $$;