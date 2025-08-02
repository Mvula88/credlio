-- =====================================================
-- SUBSCRIPTION CANCELLATION FUNCTIONS FOR STRIPE
-- =====================================================

-- Function to handle Stripe subscription created
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
BEGIN
  -- Get plan ID based on name
  SELECT id INTO v_plan_id
  FROM subscription_plans
  WHERE LOWER(name) = LOWER(p_plan_name);
  
  IF v_plan_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;
  
  -- Insert or update subscription
  INSERT INTO lender_subscriptions (
    lender_id,
    plan_id,
    stripe_subscription_id,
    stripe_customer_id,
    status,
    current_period_start,
    current_period_end,
    trial_end
  ) VALUES (
    p_lender_id,
    v_plan_id,
    p_stripe_subscription_id,
    p_stripe_customer_id,
    p_status,
    p_current_period_start,
    p_current_period_end,
    p_trial_end
  )
  ON CONFLICT (lender_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    trial_end = EXCLUDED.trial_end,
    updated_at = NOW();
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle Stripe subscription updated
CREATE OR REPLACE FUNCTION handle_stripe_subscription_updated(
  p_stripe_subscription_id TEXT,
  p_status TEXT,
  p_current_period_start TIMESTAMP WITH TIME ZONE,
  p_current_period_end TIMESTAMP WITH TIME ZONE,
  p_cancel_at_period_end BOOLEAN,
  p_trial_end TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS JSONB AS $$
BEGIN
  UPDATE lender_subscriptions
  SET 
    status = p_status,
    current_period_start = p_current_period_start,
    current_period_end = p_current_period_end,
    cancel_at_period_end = p_cancel_at_period_end,
    trial_end = p_trial_end,
    updated_at = NOW()
  WHERE stripe_subscription_id = p_stripe_subscription_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subscription not found');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle Stripe subscription deleted
CREATE OR REPLACE FUNCTION handle_stripe_subscription_deleted(
  p_stripe_subscription_id TEXT
) RETURNS JSONB AS $$
BEGIN
  UPDATE lender_subscriptions
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE stripe_subscription_id = p_stripe_subscription_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subscription not found');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get lender's active subscription details
CREATE OR REPLACE FUNCTION get_lender_subscription(p_lender_id UUID)
RETURNS TABLE (
  id UUID,
  plan_id UUID,
  plan_name VARCHAR,
  plan_price DECIMAL,
  status VARCHAR,
  stripe_subscription_id VARCHAR,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.id,
    ls.plan_id,
    sp.name as plan_name,
    sp.price_usd as plan_price,
    ls.status,
    ls.stripe_subscription_id,
    ls.current_period_start,
    ls.current_period_end,
    ls.cancel_at_period_end,
    ls.cancelled_at,
    sp.features
  FROM lender_subscriptions ls
  JOIN subscription_plans sp ON ls.plan_id = sp.id
  WHERE ls.lender_id = p_lender_id
  ORDER BY ls.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION handle_stripe_subscription_created TO service_role;
GRANT EXECUTE ON FUNCTION handle_stripe_subscription_updated TO service_role;
GRANT EXECUTE ON FUNCTION handle_stripe_subscription_deleted TO service_role;
GRANT EXECUTE ON FUNCTION get_lender_subscription TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Subscription cancellation functions added!';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '- handle_stripe_subscription_created()';
  RAISE NOTICE '- handle_stripe_subscription_updated()';
  RAISE NOTICE '- handle_stripe_subscription_deleted()';
  RAISE NOTICE '- get_lender_subscription()';
  RAISE NOTICE '';
  RAISE NOTICE 'These functions handle all Stripe webhook events for subscriptions';
  RAISE NOTICE 'including proper cancellation support.';
  RAISE NOTICE '';
END $$;