-- =====================================================
-- FIX BORROWER_RISK_HISTORY INSERT POLICY
-- =====================================================

-- The borrower_risk_history table uses 'marked_risky_by' column, not 'reported_by'

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Lenders can add risk history" ON borrower_risk_history;

-- Create the correct INSERT policy for borrower_risk_history
CREATE POLICY "Lenders can add risk history" ON borrower_risk_history
    FOR INSERT WITH CHECK (
        marked_risky_by IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'lender'
        )
    );

-- Also ensure the UPDATE policy is correct
DROP POLICY IF EXISTS "Lenders can update own risk reports" ON borrower_risk_history;
CREATE POLICY "Lenders can update own risk reports" ON borrower_risk_history
    FOR UPDATE USING (
        marked_risky_by IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'lender'
        )
    )
    WITH CHECK (
        marked_risky_by IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'lender'
        )
    );

-- Verify the columns in borrower_risk_history table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'borrower_risk_history'
ORDER BY ordinal_position;

-- Verify all policies on borrower_risk_history
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
    CASE pol.polpermissive 
        WHEN true THEN 'PERMISSIVE'
        ELSE 'RESTRICTIVE'
    END as type
FROM pg_policy pol
JOIN pg_class c ON pol.polrelid = c.oid
WHERE c.relname = 'borrower_risk_history';