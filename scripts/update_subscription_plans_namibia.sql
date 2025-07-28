-- Update subscription plans table to focus on Namibia
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10,2) DEFAULT 0;

-- Update existing plans with correct Namibian pricing
UPDATE subscription_plans SET 
  price_usd = CASE 
    WHEN name = 'Basic' THEN 12.00
    WHEN name = 'Premium' THEN 17.00
    ELSE 0
  END
WHERE name IN ('Basic', 'Premium');

-- Ensure Namibian pricing is correct
UPDATE subscription_plans SET 
  price_nad = CASE 
    WHEN name = 'Basic' THEN 180.00
    WHEN name = 'Premium' THEN 250.00
    ELSE 0
  END
WHERE name IN ('Basic', 'Premium');
