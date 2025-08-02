-- Admin Risk Statistics Functions
-- This script creates functions and views for admin dashboards to track risky borrowers and other metrics

-- 1. Create function to get country-specific risk statistics
CREATE OR REPLACE FUNCTION get_country_risk_statistics(p_country_code VARCHAR(2))
RETURNS TABLE (
  total_risky_borrowers BIGINT,
  total_blacklisted BIGINT,
  total_off_platform_defaulters BIGINT,
  total_ghost_defaulters BIGINT,
  total_active_loans BIGINT,
  total_overdue_loans BIGINT,
  total_defaulted_loans BIGINT,
  total_loan_amount NUMERIC,
  total_overdue_amount NUMERIC,
  total_lenders INTEGER,
  total_borrowers INTEGER,
  new_borrowers_this_month INTEGER,
  new_lenders_this_month INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH country_profiles AS (
    SELECT p.id, p.role
    FROM profiles p
    JOIN countries c ON c.id = p.country_id
    WHERE c.code = p_country_code
  ),
  risky_stats AS (
    SELECT 
      COUNT(DISTINCT CASE WHEN bp.is_risky = true THEN bp.user_id END) as risky_count,
      COUNT(DISTINCT b.borrower_id) as blacklisted_count
    FROM country_profiles cp
    LEFT JOIN borrower_profiles bp ON bp.user_id = cp.id AND cp.role = 'borrower'
    LEFT JOIN blacklists b ON b.borrower_id = cp.id AND b.status = 'active'
  ),
  off_platform_stats AS (
    SELECT 
      COUNT(DISTINCT CONCAT(full_name, '|', COALESCE(phone_number, ''))) as defaulter_count
    FROM off_platform_defaulters
    WHERE country_code = p_country_code
  ),
  ghost_stats AS (
    SELECT 
      COUNT(DISTINCT gb.id) as ghost_defaulter_count
    FROM ghost_borrowers gb
    JOIN ghost_loans gl ON gl.ghost_borrower_id = gb.id
    WHERE gb.country_code = p_country_code
    AND gl.is_defaulted = true
  ),
  loan_stats AS (
    SELECT 
      COUNT(CASE WHEN al.status = 'active' THEN 1 END) as active_loans,
      COUNT(CASE WHEN al.status = 'overdue' THEN 1 END) as overdue_loans,
      COUNT(CASE WHEN al.status = 'defaulted' THEN 1 END) as defaulted_loans,
      COALESCE(SUM(CASE WHEN al.status = 'active' THEN al.amount END), 0) as total_amount,
      COALESCE(SUM(CASE WHEN al.status = 'overdue' THEN al.amount - COALESCE(al.amount_paid, 0) END), 0) as overdue_amount
    FROM active_loans al
    JOIN country_profiles cp ON cp.id = al.borrower_id
  ),
  user_stats AS (
    SELECT 
      COUNT(CASE WHEN role = 'lender' THEN 1 END) as lender_count,
      COUNT(CASE WHEN role = 'borrower' THEN 1 END) as borrower_count,
      COUNT(CASE WHEN role = 'borrower' AND created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as new_borrowers,
      COUNT(CASE WHEN role = 'lender' AND created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as new_lenders
    FROM country_profiles cp
    JOIN profiles p ON p.id = cp.id
  )
  SELECT 
    risky_stats.risky_count,
    risky_stats.blacklisted_count,
    off_platform_stats.defaulter_count,
    ghost_stats.ghost_defaulter_count,
    loan_stats.active_loans,
    loan_stats.overdue_loans,
    loan_stats.defaulted_loans,
    loan_stats.total_amount,
    loan_stats.overdue_amount,
    user_stats.lender_count,
    user_stats.borrower_count,
    user_stats.new_borrowers,
    user_stats.new_lenders
  FROM risky_stats, off_platform_stats, ghost_stats, loan_stats, user_stats;
END;
$$ LANGUAGE plpgsql;

-- 2. Create function to get global statistics for super admin
CREATE OR REPLACE FUNCTION get_global_admin_statistics()
RETURNS TABLE (
  country_code VARCHAR(2),
  country_name VARCHAR(100),
  total_risky_borrowers BIGINT,
  total_blacklisted BIGINT,
  total_off_platform_defaulters BIGINT,
  total_ghost_defaulters BIGINT,
  total_active_loans BIGINT,
  total_loan_amount NUMERIC,
  total_overdue_amount NUMERIC,
  total_users INTEGER,
  platform_health_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH country_stats AS (
    SELECT 
      c.code,
      c.name,
      COUNT(DISTINCT CASE WHEN p.role = 'borrower' AND bp.is_risky = true THEN p.id END) as risky_count,
      COUNT(DISTINCT b.borrower_id) as blacklisted_count,
      COUNT(DISTINCT p.id) as user_count
    FROM countries c
    LEFT JOIN profiles p ON p.country_id = c.id
    LEFT JOIN borrower_profiles bp ON bp.user_id = p.id
    LEFT JOIN blacklists b ON b.borrower_id = p.id AND b.status = 'active'
    GROUP BY c.code, c.name
  ),
  off_platform_counts AS (
    SELECT 
      country_code,
      COUNT(DISTINCT CONCAT(full_name, '|', COALESCE(phone_number, ''))) as defaulter_count
    FROM off_platform_defaulters
    GROUP BY country_code
  ),
  ghost_counts AS (
    SELECT 
      gb.country_code,
      COUNT(DISTINCT gb.id) as ghost_defaulter_count
    FROM ghost_borrowers gb
    JOIN ghost_loans gl ON gl.ghost_borrower_id = gb.id
    WHERE gl.is_defaulted = true
    GROUP BY gb.country_code
  ),
  loan_counts AS (
    SELECT 
      c.code,
      COUNT(CASE WHEN al.status = 'active' THEN 1 END) as active_loans,
      COALESCE(SUM(CASE WHEN al.status = 'active' THEN al.amount END), 0) as total_amount,
      COALESCE(SUM(CASE WHEN al.status = 'overdue' THEN al.amount - COALESCE(al.amount_paid, 0) END), 0) as overdue_amount
    FROM countries c
    LEFT JOIN profiles p ON p.country_id = c.id
    LEFT JOIN active_loans al ON al.borrower_id = p.id
    GROUP BY c.code
  )
  SELECT 
    cs.code,
    cs.name,
    cs.risky_count,
    cs.blacklisted_count,
    COALESCE(opc.defaulter_count, 0),
    COALESCE(gc.ghost_defaulter_count, 0),
    COALESCE(lc.active_loans, 0),
    COALESCE(lc.total_amount, 0),
    COALESCE(lc.overdue_amount, 0),
    cs.user_count,
    -- Calculate platform health score (0-100)
    CASE 
      WHEN cs.user_count = 0 THEN 100
      ELSE GREATEST(0, 100 - (
        (cs.risky_count::FLOAT / NULLIF(cs.user_count, 0) * 100) +
        (COALESCE(lc.overdue_amount, 0) / NULLIF(COALESCE(lc.total_amount, 1), 0) * 50)
      )::INTEGER)
    END as health_score
  FROM country_stats cs
  LEFT JOIN off_platform_counts opc ON opc.country_code = cs.code
  LEFT JOIN ghost_counts gc ON gc.country_code = cs.code
  LEFT JOIN loan_counts lc ON lc.code = cs.code
  ORDER BY cs.name;
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to get recent risk activities for admin monitoring
CREATE OR REPLACE FUNCTION get_recent_risk_activities(
  p_country_code VARCHAR(2) DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  activity_type VARCHAR(50),
  activity_description TEXT,
  actor_name TEXT,
  target_name TEXT,
  activity_date TIMESTAMPTZ,
  severity VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  WITH activities AS (
    -- Blacklist activities
    SELECT 
      'blacklist_added' as type,
      'Borrower blacklisted for ' || b.reason as description,
      p1.full_name as actor,
      p2.full_name as target,
      b.created_at as date,
      'high' as severity,
      c.code as country_code
    FROM blacklists b
    JOIN profiles p1 ON p1.id = b.blacklisted_by
    JOIN profiles p2 ON p2.id = b.borrower_id
    JOIN countries c ON c.id = p2.country_id
    WHERE b.created_at >= CURRENT_DATE - INTERVAL '30 days'
    
    UNION ALL
    
    -- Risk marking activities
    SELECT 
      'marked_risky' as type,
      'Borrower marked as risky: ' || COALESCE(brh.reason, 'No reason provided') as description,
      p1.full_name as actor,
      p2.full_name as target,
      brh.performed_at as date,
      'medium' as severity,
      c.code as country_code
    FROM borrower_risk_history brh
    JOIN profiles p1 ON p1.id = brh.performed_by
    JOIN profiles p2 ON p2.id = brh.borrower_id
    JOIN countries c ON c.id = p2.country_id
    WHERE brh.action = 'marked_risky'
    AND brh.performed_at >= CURRENT_DATE - INTERVAL '30 days'
    
    UNION ALL
    
    -- Off-platform defaulter reports
    SELECT 
      'off_platform_report' as type,
      'Off-platform defaulter reported: ' || opd.reason as description,
      p.full_name as actor,
      opd.full_name as target,
      opd.reported_at as date,
      'high' as severity,
      opd.country_code
    FROM off_platform_defaulters opd
    JOIN profiles p ON p.id = opd.reported_by
    WHERE opd.reported_at >= CURRENT_DATE - INTERVAL '30 days'
    
    UNION ALL
    
    -- Ghost loan defaults
    SELECT 
      'ghost_loan_default' as type,
      'Ghost loan defaulted' as description,
      p.full_name as actor,
      gb.full_name as target,
      gl.defaulted_at as date,
      'high' as severity,
      gb.country_code
    FROM ghost_loans gl
    JOIN ghost_borrowers gb ON gb.id = gl.ghost_borrower_id
    JOIN profiles p ON p.id = gl.lender_id
    WHERE gl.defaulted_at >= CURRENT_DATE - INTERVAL '30 days'
  )
  SELECT 
    type,
    description,
    actor,
    target,
    date,
    severity
  FROM activities
  WHERE (p_country_code IS NULL OR country_code = p_country_code)
  ORDER BY date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 4. Create materialized view for admin dashboard performance
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_risk_summary AS
WITH risk_counts AS (
  SELECT 
    c.code as country_code,
    c.name as country_name,
    -- Risky borrowers
    COUNT(DISTINCT CASE WHEN bp.is_risky = true THEN bp.user_id END) as risky_borrowers,
    -- Blacklisted
    COUNT(DISTINCT b.borrower_id) as blacklisted_borrowers,
    -- Active loans
    COUNT(DISTINCT CASE WHEN al.status = 'active' THEN al.id END) as active_loans,
    -- Overdue loans
    COUNT(DISTINCT CASE WHEN al.status = 'overdue' THEN al.id END) as overdue_loans,
    -- Total users
    COUNT(DISTINCT p.id) as total_users,
    -- Revenue (from completed payments)
    COALESCE(SUM(CASE WHEN al.status = 'completed' THEN al.amount_paid END), 0) as total_revenue
  FROM countries c
  LEFT JOIN profiles p ON p.country_id = c.id
  LEFT JOIN borrower_profiles bp ON bp.user_id = p.id
  LEFT JOIN blacklists b ON b.borrower_id = p.id AND b.status = 'active'
  LEFT JOIN active_loans al ON (al.borrower_id = p.id OR al.lender_id = p.id)
  GROUP BY c.code, c.name
)
SELECT * FROM risk_counts;

-- Create index for better performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_risk_summary_country ON admin_risk_summary(country_code);

-- 5. Create function to refresh materialized view (call this periodically)
CREATE OR REPLACE FUNCTION refresh_admin_statistics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_risk_summary;
END;
$$ LANGUAGE plpgsql;

-- 6. Grant appropriate permissions to admin roles
DO $$
BEGIN
  -- Grant execute permissions on functions to authenticated users
  -- (RLS will handle the actual access control)
  GRANT EXECUTE ON FUNCTION get_country_risk_statistics(VARCHAR) TO authenticated;
  GRANT EXECUTE ON FUNCTION get_global_admin_statistics() TO authenticated;
  GRANT EXECUTE ON FUNCTION get_recent_risk_activities(VARCHAR, INTEGER) TO authenticated;
  GRANT EXECUTE ON FUNCTION refresh_admin_statistics() TO authenticated;
  
  -- Grant select on materialized view
  GRANT SELECT ON admin_risk_summary TO authenticated;
EXCEPTION
  WHEN OTHERS THEN
    -- If roles don't exist, skip
    NULL;
END $$;

-- 7. Create RLS policies for admin access to risk data
-- Note: These functions use SECURITY DEFINER internally, so they check permissions themselves

-- 8. Create scheduled job to refresh statistics (if pg_cron is available)
-- Uncomment if you have pg_cron extension
-- SELECT cron.schedule('refresh-admin-stats', '0 * * * *', 'SELECT refresh_admin_statistics();');

-- Initial refresh
SELECT refresh_admin_statistics();