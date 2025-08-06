-- Create function to get lender statistics
CREATE OR REPLACE FUNCTION get_lender_stats(lender_id UUID)
RETURNS TABLE (
  total_loans BIGINT,
  active_loans BIGINT,
  total_deployed NUMERIC,
  total_repaid NUMERIC,
  repayment_rate NUMERIC,
  average_loan_size NUMERIC,
  total_borrowers BIGINT,
  overdue_loans BIGINT,
  portfolio_risk TEXT,
  monthly_growth NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH loan_stats AS (
    SELECT
      COUNT(*) AS total_loans_count,
      COUNT(*) FILTER (WHERE status IN ('active', 'overdue')) AS active_loans_count,
      COALESCE(SUM(amount), 0) AS total_deployed_amount,
      COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS completed_amount,
      COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count,
      AVG(amount) AS avg_loan_size,
      COUNT(DISTINCT borrower_id) AS unique_borrowers
    FROM loans
    WHERE loans.lender_id = get_lender_stats.lender_id
  ),
  repayment_stats AS (
    SELECT
      COALESCE(SUM(lr.amount), 0) AS total_repaid_amount
    FROM loan_repayments lr
    JOIN loans l ON lr.loan_id = l.id
    WHERE l.lender_id = get_lender_stats.lender_id
    AND lr.status = 'completed'
  ),
  risk_calculation AS (
    SELECT
      CASE
        WHEN COUNT(*) FILTER (WHERE status = 'overdue') > 5 THEN 'high'
        WHEN COUNT(*) FILTER (WHERE status = 'overdue') > 2 THEN 'medium'
        ELSE 'low'
      END AS risk_level
    FROM loans
    WHERE loans.lender_id = get_lender_stats.lender_id
    AND status IN ('active', 'overdue')
  ),
  monthly_comparison AS (
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
    FROM loans
    WHERE loans.lender_id = get_lender_stats.lender_id
  )
  SELECT
    ls.total_loans_count::BIGINT,
    ls.active_loans_count::BIGINT,
    ls.total_deployed_amount::NUMERIC,
    rs.total_repaid_amount::NUMERIC,
    CASE
      WHEN ls.total_deployed_amount > 0 
      THEN ROUND((rs.total_repaid_amount / ls.total_deployed_amount * 100)::NUMERIC, 2)
      ELSE 0
    END AS repayment_rate,
    ROUND(ls.avg_loan_size::NUMERIC, 2),
    ls.unique_borrowers::BIGINT,
    ls.overdue_count::BIGINT,
    rc.risk_level::TEXT,
    ROUND(mc.growth_rate::NUMERIC, 2)
  FROM loan_stats ls
  CROSS JOIN repayment_stats rs
  CROSS JOIN risk_calculation rc
  CROSS JOIN monthly_comparison mc;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_lender_stats(UUID) TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_loans_lender_id ON loans(lender_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_status ON loan_repayments(status);