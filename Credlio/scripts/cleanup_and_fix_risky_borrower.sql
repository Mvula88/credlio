-- Complete cleanup and proper setup for risky borrower feature
-- This script handles all possible states - FIXED VERSION

-- First, let's see what we're working with
DO $$ 
BEGIN
  RAISE NOTICE 'Starting risky borrower cleanup and setup...';
END $$;

-- 1. Ensure borrower_profiles has all needed columns
ALTER TABLE borrower_profiles 
ADD COLUMN IF NOT EXISTS is_risky BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS was_risky_before BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS risky_marked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS risky_marked_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS improved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS improved_by UUID REFERENCES profiles(id);

-- 2. Ensure borrower_risk_history table exists with correct structure
CREATE TABLE IF NOT EXISTS borrower_risk_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  borrower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  marked_risky_by UUID REFERENCES profiles(id),
  marked_risky_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  improved_by UUID REFERENCES profiles(id),
  improved_at TIMESTAMPTZ,
  improvement_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes if missing
CREATE INDEX IF NOT EXISTS idx_borrower_risk_history_borrower ON borrower_risk_history(borrower_id);
CREATE INDEX IF NOT EXISTS idx_borrower_profiles_risky ON borrower_profiles(is_risky);

-- 4. Handle RLS - only enable if not already enabled
DO $$ 
BEGIN
  -- Check and enable RLS on borrower_risk_history
  IF NOT EXISTS (
    SELECT 1 FROM pg_class 
    WHERE relname = 'borrower_risk_history' 
    AND relrowsecurity = true
  ) THEN
    ALTER TABLE borrower_risk_history ENABLE ROW LEVEL SECURITY;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'RLS already enabled on borrower_risk_history';
END $$;

-- 5. Drop all existing policies and recreate them
DO $$ 
DECLARE
  policy_rec RECORD;
BEGIN
  -- Drop all existing policies on borrower_risk_history
  FOR policy_rec IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'borrower_risk_history'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON borrower_risk_history', policy_rec.policyname);
  END LOOP;
END $$;

-- 6. Create fresh policies
CREATE POLICY "Borrowers can view own risk history"
  ON borrower_risk_history FOR SELECT
  USING (borrower_id = auth.uid());

CREATE POLICY "Lenders can view risk history"
  ON borrower_risk_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lender'
    )
  );

CREATE POLICY "Lenders can add risk history"
  ON borrower_risk_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lender'
    )
  );

CREATE POLICY "Lenders can update risk history"
  ON borrower_risk_history FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lender'
    )
  );

-- 7. Create or replace functions
CREATE OR REPLACE FUNCTION mark_borrower_as_risky(
  p_borrower_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lender_id UUID;
BEGIN
  v_lender_id := auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = v_lender_id AND role = 'lender'
  ) THEN
    RAISE EXCEPTION 'Only lenders can mark borrowers as risky';
  END IF;
  
  UPDATE borrower_profiles
  SET 
    is_risky = TRUE,
    was_risky_before = TRUE,
    risky_marked_at = NOW(),
    risky_marked_by = v_lender_id
  WHERE profile_id = p_borrower_id;
  
  INSERT INTO borrower_risk_history (
    borrower_id,
    marked_risky_by,
    reason
  ) VALUES (
    p_borrower_id,
    v_lender_id,
    p_reason
  );
  
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    action_url
  ) VALUES (
    p_borrower_id,
    'risk_status_changed',
    'Risk Status Updated',
    'Your profile has been marked as risky. This may affect your ability to receive loans.',
    '/borrower/dashboard'
  );
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION mark_borrower_as_improved(
  p_borrower_id UUID,
  p_reason TEXT DEFAULT 'Loan repaid successfully'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lender_id UUID;
  v_latest_risk_id UUID;
BEGIN
  v_lender_id := auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = v_lender_id AND role = 'lender'
  ) THEN
    RAISE EXCEPTION 'Only lenders can mark borrowers as improved';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM borrower_profiles 
    WHERE profile_id = p_borrower_id AND is_risky = TRUE
  ) THEN
    RAISE EXCEPTION 'Borrower is not currently marked as risky';
  END IF;
  
  UPDATE borrower_profiles
  SET 
    is_risky = FALSE,
    improved_at = NOW(),
    improved_by = v_lender_id
  WHERE profile_id = p_borrower_id;
  
  SELECT id INTO v_latest_risk_id
  FROM borrower_risk_history
  WHERE borrower_id = p_borrower_id
    AND improved_at IS NULL
  ORDER BY marked_risky_at DESC
  LIMIT 1;
  
  IF v_latest_risk_id IS NOT NULL THEN
    UPDATE borrower_risk_history
    SET 
      improved_by = v_lender_id,
      improved_at = NOW(),
      improvement_reason = p_reason
    WHERE id = v_latest_risk_id;
  END IF;
  
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    action_url
  ) VALUES (
    p_borrower_id,
    'risk_status_changed',
    'Risk Status Improved!',
    'Great news! Your risk status has been improved. You can now receive loan offers again.',
    '/borrower/dashboard'
  );
  
  RETURN TRUE;
END;
$$;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION mark_borrower_as_risky TO authenticated;
GRANT EXECUTE ON FUNCTION mark_borrower_as_improved TO authenticated;

-- 9. Final verification
DO $$ 
DECLARE
  v_columns_count INTEGER;
  v_policies_count INTEGER;
  v_functions_count INTEGER;
BEGIN
  -- Count columns
  SELECT COUNT(*) INTO v_columns_count
  FROM information_schema.columns
  WHERE table_name = 'borrower_profiles'
  AND column_name IN ('is_risky', 'was_risky_before', 'risky_marked_at', 'risky_marked_by', 'improved_at', 'improved_by');
  
  -- Count policies
  SELECT COUNT(*) INTO v_policies_count
  FROM pg_policies
  WHERE tablename = 'borrower_risk_history';
  
  -- Count functions
  SELECT COUNT(*) INTO v_functions_count
  FROM pg_proc
  WHERE proname IN ('mark_borrower_as_risky', 'mark_borrower_as_improved');
  
  RAISE NOTICE 'Setup complete! Found % columns, % policies, % functions', 
    v_columns_count, v_policies_count, v_functions_count;
  
  IF v_columns_count = 6 AND v_policies_count = 4 AND v_functions_count = 2 THEN
    RAISE NOTICE '✅ All risky borrower features are properly set up!';
  ELSE
    RAISE WARNING '⚠️ Some features may be missing. Please check manually.';
  END IF;
END $$;