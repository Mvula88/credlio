-- Create function to get admin system statistics
CREATE OR REPLACE FUNCTION get_admin_system_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  total_lenders BIGINT,
  total_borrowers BIGINT,
  total_loans BIGINT,
  active_loans BIGINT,
  total_volume NUMERIC,
  default_rate NUMERIC,
  monthly_growth NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      COUNT(*) AS total_users_count,
      COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '24 hours') AS active_users_count,
      COUNT(*) FILTER (WHERE role = 'lender') AS lenders_count,
      COUNT(*) FILTER (WHERE role = 'borrower') AS borrowers_count
    FROM profiles
  ),
  loan_stats AS (
    SELECT
      COUNT(*) AS total_loans_count,
      COUNT(*) FILTER (WHERE status IN ('active', 'overdue')) AS active_loans_count,
      COALESCE(SUM(amount), 0) AS total_volume_amount,
      COUNT(*) FILTER (WHERE status = 'defaulted')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100 AS default_rate_calc
    FROM loans
  ),
  growth_stats AS (
    SELECT
      CASE
        WHEN COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') > 0 
        AND COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days') > 0
        THEN 
          ((COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::NUMERIC - 
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days')::NUMERIC) / 
           NULLIF(COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days')::NUMERIC, 0)) * 100
        ELSE 0
      END AS growth_rate
    FROM profiles
  )
  SELECT
    us.total_users_count::BIGINT,
    us.active_users_count::BIGINT,
    us.lenders_count::BIGINT,
    us.borrowers_count::BIGINT,
    ls.total_loans_count::BIGINT,
    ls.active_loans_count::BIGINT,
    ls.total_volume_amount::NUMERIC,
    ROUND(COALESCE(ls.default_rate_calc, 0), 2)::NUMERIC,
    ROUND(COALESCE(gs.growth_rate, 0), 2)::NUMERIC
  FROM user_stats us
  CROSS JOIN loan_stats ls
  CROSS JOIN growth_stats gs;
END;
$$ LANGUAGE plpgsql;

-- Create function to get platform revenue statistics
CREATE OR REPLACE FUNCTION get_platform_revenue_stats()
RETURNS TABLE (
  total_revenue NUMERIC,
  subscription_revenue NUMERIC,
  transaction_fees NUMERIC,
  monthly_recurring NUMERIC,
  growth_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH revenue_stats AS (
    SELECT
      COALESCE(SUM(
        CASE 
          WHEN plan_id IS NOT NULL THEN 
            CASE 
              WHEN sp.name ILIKE '%premium%' THEN 22
              WHEN sp.name ILIKE '%basic%' THEN 15
              ELSE 0
            END
          ELSE 0
        END
      ), 0) AS subscription_total
    FROM lender_subscriptions ls
    LEFT JOIN subscription_plans sp ON ls.plan_id = sp.id
    WHERE ls.status = 'active'
  ),
  transaction_stats AS (
    SELECT
      COALESCE(SUM(amount * 0.02), 0) AS transaction_total -- 2% transaction fee
    FROM loans
    WHERE status IN ('active', 'completed')
    AND created_at >= NOW() - INTERVAL '30 days'
  )
  SELECT
    (rs.subscription_total + ts.transaction_total)::NUMERIC AS total_revenue,
    rs.subscription_total::NUMERIC AS subscription_revenue,
    ts.transaction_total::NUMERIC AS transaction_fees,
    rs.subscription_total::NUMERIC AS monthly_recurring,
    12.5::NUMERIC AS growth_rate -- Placeholder growth rate
  FROM revenue_stats rs
  CROSS JOIN transaction_stats ts;
END;
$$ LANGUAGE plpgsql;

-- Create function to get country-specific admin stats
CREATE OR REPLACE FUNCTION get_country_admin_stats(admin_country_id UUID)
RETURNS TABLE (
  total_users BIGINT,
  total_lenders BIGINT,
  total_borrowers BIGINT,
  total_loans BIGINT,
  active_loans BIGINT,
  total_volume NUMERIC,
  default_rate NUMERIC,
  verification_pending BIGINT,
  blacklisted_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      COUNT(*) AS total_users_count,
      COUNT(*) FILTER (WHERE role = 'lender') AS lenders_count,
      COUNT(*) FILTER (WHERE role = 'borrower') AS borrowers_count,
      COUNT(*) FILTER (WHERE verified = false) AS pending_verification,
      COUNT(*) FILTER (WHERE is_blacklisted = true) AS blacklisted_count
    FROM profiles
    WHERE country_id = admin_country_id
  ),
  loan_stats AS (
    SELECT
      COUNT(*) AS total_loans_count,
      COUNT(*) FILTER (WHERE l.status IN ('active', 'overdue')) AS active_loans_count,
      COALESCE(SUM(l.amount), 0) AS total_volume_amount,
      COUNT(*) FILTER (WHERE l.status = 'defaulted')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100 AS default_rate_calc
    FROM loans l
    JOIN profiles p ON l.borrower_id = p.id
    WHERE p.country_id = admin_country_id
  )
  SELECT
    us.total_users_count::BIGINT,
    us.lenders_count::BIGINT,
    us.borrowers_count::BIGINT,
    ls.total_loans_count::BIGINT,
    ls.active_loans_count::BIGINT,
    ls.total_volume_amount::NUMERIC,
    ROUND(COALESCE(ls.default_rate_calc, 0), 2)::NUMERIC,
    us.pending_verification::BIGINT,
    us.blacklisted_count::BIGINT
  FROM user_stats us
  CROSS JOIN loan_stats ls;
END;
$$ LANGUAGE plpgsql;

-- Create audit log function
CREATE OR REPLACE FUNCTION log_admin_action(
  admin_id UUID,
  action_type TEXT,
  action_description TEXT,
  target_id UUID DEFAULT NULL,
  metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    description,
    target_id,
    metadata,
    created_at
  ) VALUES (
    admin_id,
    action_type,
    action_description,
    target_id,
    metadata,
    NOW()
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,
  description TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category VARCHAR(50),
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_system_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_revenue_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_country_admin_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action(UUID, TEXT, TEXT, UUID, JSONB) TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_resolved ON risk_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_severity ON risk_alerts(severity);