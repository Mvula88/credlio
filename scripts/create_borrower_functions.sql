-- Create function to get borrower statistics
CREATE OR REPLACE FUNCTION get_borrower_stats(borrower_id UUID)
RETURNS TABLE (
  credit_score INTEGER,
  reputation_score INTEGER,
  total_loans BIGINT,
  total_borrowed NUMERIC,
  total_repaid NUMERIC,
  on_time_payment_rate NUMERIC,
  next_payment_amount NUMERIC,
  next_payment_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH loan_stats AS (
    SELECT
      COUNT(*) AS total_loans_count,
      COALESCE(SUM(amount), 0) AS total_borrowed_amount
    FROM loans
    WHERE loans.borrower_id = get_borrower_stats.borrower_id
  ),
  repayment_stats AS (
    SELECT
      COALESCE(SUM(lr.amount), 0) AS total_repaid_amount,
      COUNT(*) FILTER (WHERE lr.status = 'completed' AND lr.payment_date <= lr.due_date) AS on_time_payments,
      COUNT(*) FILTER (WHERE lr.status = 'completed') AS total_payments
    FROM loan_repayments lr
    JOIN loans l ON lr.loan_id = l.id
    WHERE l.borrower_id = get_borrower_stats.borrower_id
  ),
  next_payment AS (
    SELECT
      l.monthly_payment AS amount,
      EXTRACT(DAY FROM (l.next_payment_date - CURRENT_DATE))::INTEGER AS days_until
    FROM loans l
    WHERE l.borrower_id = get_borrower_stats.borrower_id
    AND l.status IN ('active', 'overdue')
    AND l.next_payment_date IS NOT NULL
    ORDER BY l.next_payment_date
    LIMIT 1
  ),
  credit_data AS (
    SELECT
      COALESCE(p.credit_score, 550) AS score,
      COALESCE(p.reputation_score, 50) AS reputation
    FROM profiles p
    WHERE p.id = get_borrower_stats.borrower_id
  )
  SELECT
    cd.score::INTEGER,
    cd.reputation::INTEGER,
    ls.total_loans_count::BIGINT,
    ls.total_borrowed_amount::NUMERIC,
    rs.total_repaid_amount::NUMERIC,
    CASE
      WHEN rs.total_payments > 0 
      THEN ROUND((rs.on_time_payments::NUMERIC / rs.total_payments::NUMERIC * 100), 2)
      ELSE 100
    END AS on_time_payment_rate,
    COALESCE(np.amount, 0)::NUMERIC,
    np.days_until::INTEGER
  FROM loan_stats ls
  CROSS JOIN repayment_stats rs
  CROSS JOIN credit_data cd
  LEFT JOIN next_payment np ON true;
END;
$$ LANGUAGE plpgsql;

-- Create function to get borrower credit score
CREATE OR REPLACE FUNCTION get_borrower_credit_score(borrower_id UUID)
RETURNS TABLE (
  credit_score INTEGER,
  reputation_score INTEGER,
  score_trend TEXT,
  last_updated TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  WITH current_score AS (
    SELECT
      COALESCE(p.credit_score, 550) AS score,
      COALESCE(p.reputation_score, 50) AS reputation,
      p.updated_at
    FROM profiles p
    WHERE p.id = get_borrower_credit_score.borrower_id
  ),
  score_history AS (
    SELECT
      csh.score AS prev_score
    FROM credit_score_history csh
    WHERE csh.borrower_id = get_borrower_credit_score.borrower_id
    ORDER BY csh.recorded_at DESC
    LIMIT 1 OFFSET 1
  )
  SELECT
    cs.score::INTEGER,
    cs.reputation::INTEGER,
    CASE
      WHEN sh.prev_score IS NULL THEN 'stable'
      WHEN cs.score > sh.prev_score THEN 'improving'
      WHEN cs.score < sh.prev_score THEN 'declining'
      ELSE 'stable'
    END AS score_trend,
    cs.updated_at::TIMESTAMP
  FROM current_score cs
  LEFT JOIN score_history sh ON true;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate credit score (can be called periodically)
CREATE OR REPLACE FUNCTION calculate_credit_score(borrower_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_score INTEGER;
  payment_history_score INTEGER;
  loan_amount_score INTEGER;
  loan_frequency_score INTEGER;
  profile_completion_score INTEGER;
BEGIN
  -- Payment History (40% weight)
  SELECT 
    CASE
      WHEN COUNT(*) = 0 THEN 300  -- Base score for new borrowers
      WHEN (COUNT(*) FILTER (WHERE status = 'completed' AND payment_date <= due_date)::NUMERIC / COUNT(*)::NUMERIC) >= 0.95 THEN 340
      WHEN (COUNT(*) FILTER (WHERE status = 'completed' AND payment_date <= due_date)::NUMERIC / COUNT(*)::NUMERIC) >= 0.85 THEN 280
      WHEN (COUNT(*) FILTER (WHERE status = 'completed' AND payment_date <= due_date)::NUMERIC / COUNT(*)::NUMERIC) >= 0.70 THEN 200
      ELSE 100
    END INTO payment_history_score
  FROM loan_repayments lr
  JOIN loans l ON lr.loan_id = l.id
  WHERE l.borrower_id = calculate_credit_score.borrower_id;

  -- Loan Amount Responsibility (20% weight)
  SELECT
    CASE
      WHEN AVG(amount) <= 1000 THEN 170
      WHEN AVG(amount) <= 5000 THEN 150
      WHEN AVG(amount) <= 10000 THEN 120
      ELSE 85
    END INTO loan_amount_score
  FROM loans
  WHERE loans.borrower_id = calculate_credit_score.borrower_id;

  -- Loan Frequency (20% weight)
  SELECT
    CASE
      WHEN COUNT(*) >= 10 AND COUNT(*) FILTER (WHERE status = 'completed') >= 8 THEN 170
      WHEN COUNT(*) >= 5 AND COUNT(*) FILTER (WHERE status = 'completed') >= 4 THEN 150
      WHEN COUNT(*) >= 3 AND COUNT(*) FILTER (WHERE status = 'completed') >= 2 THEN 120
      WHEN COUNT(*) >= 1 THEN 100
      ELSE 85
    END INTO loan_frequency_score
  FROM loans
  WHERE loans.borrower_id = calculate_credit_score.borrower_id;

  -- Profile Completion (20% weight)
  SELECT
    CASE
      WHEN verified = true AND phone IS NOT NULL AND employment_status IS NOT NULL THEN 170
      WHEN verified = true THEN 140
      WHEN phone IS NOT NULL AND employment_status IS NOT NULL THEN 110
      ELSE 85
    END INTO profile_completion_score
  FROM profiles
  WHERE id = calculate_credit_score.borrower_id;

  -- Calculate total score
  new_score := payment_history_score + loan_amount_score + loan_frequency_score + profile_completion_score;
  
  -- Ensure score is within valid range (300-850)
  new_score := GREATEST(300, LEAST(850, new_score));

  -- Update profile with new score
  UPDATE profiles
  SET 
    credit_score = new_score,
    updated_at = NOW()
  WHERE id = calculate_credit_score.borrower_id;

  -- Record in history
  INSERT INTO credit_score_history (borrower_id, score, recorded_at)
  VALUES (calculate_credit_score.borrower_id, new_score, NOW());

  RETURN new_score;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_borrower_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_borrower_credit_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_credit_score(UUID) TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_due_date ON loan_repayments(due_date);
CREATE INDEX IF NOT EXISTS idx_credit_score_history_borrower_id ON credit_score_history(borrower_id);