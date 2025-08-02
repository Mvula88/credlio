-- =====================================================
-- ADD TRIAL PERIOD SUPPORT TO SUBSCRIPTION SYSTEM
-- =====================================================

-- Add trial-related columns to lender_subscriptions if they don't exist
ALTER TABLE lender_subscriptions 
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE;

-- Update the subscription creation function to handle trials
CREATE OR REPLACE FUNCTION handle_stripe_subscription_created(
  p_stripe_subscription_id TEXT,
  p_stripe_customer_id TEXT,
  p_lender_id UUID,
  p_plan_name TEXT,
  p_status TEXT,
  p_current_period_start TIMESTAMP WITH TIME ZONE,
  p_current_period_end TIMESTAMP WITH TIME ZONE,
  p_trial_end TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_plan_id UUID;
  v_is_trial BOOLEAN;
BEGIN
  -- Get plan ID based on name (handle both tier naming conventions)
  SELECT id INTO v_plan_id
  FROM subscription_plans
  WHERE LOWER(name) = LOWER(p_plan_name)
     OR (LOWER(p_plan_name) = 'tier_1' AND LOWER(name) = 'basic')
     OR (LOWER(p_plan_name) = 'tier_2' AND LOWER(name) = 'premium');
  
  IF v_plan_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found: ' || p_plan_name);
  END IF;
  
  -- Check if this is a trial
  v_is_trial := (p_status = 'trialing');
  
  -- Insert or update subscription
  INSERT INTO lender_subscriptions (
    lender_id,
    plan_id,
    stripe_subscription_id,
    stripe_customer_id,
    status,
    current_period_start,
    current_period_end,
    trial_start,
    trial_end,
    is_trial
  ) VALUES (
    p_lender_id,
    v_plan_id,
    p_stripe_subscription_id,
    p_stripe_customer_id,
    p_status,
    p_current_period_start,
    p_current_period_end,
    CASE WHEN v_is_trial THEN NOW() ELSE NULL END,
    p_trial_end,
    v_is_trial
  )
  ON CONFLICT (lender_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    trial_start = EXCLUDED.trial_start,
    trial_end = EXCLUDED.trial_end,
    is_trial = EXCLUDED.is_trial,
    updated_at = NOW();
  
  RETURN jsonb_build_object('success', true, 'is_trial', v_is_trial);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the subscription update function to handle trial to active transition
CREATE OR REPLACE FUNCTION handle_stripe_subscription_updated(
  p_stripe_subscription_id TEXT,
  p_status TEXT,
  p_current_period_start TIMESTAMP WITH TIME ZONE,
  p_current_period_end TIMESTAMP WITH TIME ZONE,
  p_cancel_at_period_end BOOLEAN,
  p_trial_end TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_old_status TEXT;
  v_is_trial BOOLEAN;
BEGIN
  -- Get the old status
  SELECT status INTO v_old_status
  FROM lender_subscriptions
  WHERE stripe_subscription_id = p_stripe_subscription_id;
  
  -- Check if this is still a trial
  v_is_trial := (p_status = 'trialing');
  
  UPDATE lender_subscriptions
  SET 
    status = p_status,
    current_period_start = p_current_period_start,
    current_period_end = p_current_period_end,
    cancel_at_period_end = p_cancel_at_period_end,
    trial_end = p_trial_end,
    is_trial = v_is_trial,
    updated_at = NOW()
  WHERE stripe_subscription_id = p_stripe_subscription_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subscription not found');
  END IF;
  
  -- Log trial to active transition
  IF v_old_status = 'trialing' AND p_status = 'active' THEN
    -- You can add notification logic here if needed
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Trial converted to active subscription'
    );
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view to easily see trial subscriptions
CREATE OR REPLACE VIEW trial_subscriptions AS
SELECT 
  ls.*,
  sp.name as plan_name,
  sp.price_usd as plan_price,
  p.email as lender_email,
  CASE 
    WHEN ls.is_trial AND ls.trial_end > NOW() THEN 'Active Trial'
    WHEN ls.is_trial AND ls.trial_end <= NOW() THEN 'Trial Expired'
    WHEN ls.status = 'active' AND ls.trial_end IS NOT NULL THEN 'Converted from Trial'
    ELSE 'Direct Subscription'
  END as subscription_type,
  CASE 
    WHEN ls.is_trial THEN 
      EXTRACT(EPOCH FROM (ls.trial_end - NOW())) / 3600
    ELSE NULL
  END as hours_remaining_in_trial
FROM lender_subscriptions ls
JOIN subscription_plans sp ON ls.plan_id = sp.id
JOIN profiles p ON ls.lender_id = p.id
WHERE ls.is_trial = true OR ls.trial_end IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON trial_subscriptions TO authenticated;

-- Function to check if a user is in trial
CREATE OR REPLACE FUNCTION is_user_in_trial(p_lender_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_trial BOOLEAN;
BEGIN
  SELECT is_trial INTO v_is_trial
  FROM lender_subscriptions
  WHERE lender_id = p_lender_id
  AND status IN ('trialing', 'active')
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_is_trial, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_user_in_trial TO authenticated;

-- Update webhook handling in your stripe webhook route to pass trial_end
-- The webhook should now pass trial_end when calling these functions

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Trial period support added to subscription system!';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '- Added trial_start, trial_end, is_trial columns';
  RAISE NOTICE '- Updated subscription creation to handle trials';
  RAISE NOTICE '- Added trial status tracking';
  RAISE NOTICE '- Created trial_subscriptions view';
  RAISE NOTICE '- Added is_user_in_trial() function';
  RAISE NOTICE '';
  RAISE NOTICE 'The system now properly tracks 1-day free trials!';
  RAISE NOTICE '';
END $$;