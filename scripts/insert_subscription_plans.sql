-- Insert default subscription plans
INSERT INTO subscription_plans (name, price_nad, price_usd, features, has_marketplace_access, has_smart_matching, trial_days) VALUES
('Free Trial', 0, 0, ARRAY['View borrower profiles', 'Basic risk assessment', 'Limited to 5 borrowers per day'], false, false, 1),
('Basic', 180, 12, ARRAY['Unlimited borrower profiles', 'Advanced risk tools', 'Affordability calculator', 'Watchlist management'], false, false, 0),
('Premium', 250, 17, ARRAY['All Basic features', 'Marketplace access', 'Smart matching', 'Priority support', 'Advanced analytics'], true, true, 0)
ON CONFLICT DO NOTHING;
