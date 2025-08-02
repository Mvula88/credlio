-- Fix Country-Based Data Isolation Policies (Safe Version)
-- This script checks for existing policies before creating them

-- =====================================================
-- 1. DROP EXISTING POLICIES THAT NEED TO BE UPDATED
-- =====================================================

-- First, let's see what policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('loan_requests', 'borrower_profiles', 'blacklist')
ORDER BY tablename, policyname;

-- Drop the specific policies that need to be recreated
DO $$
BEGIN
    -- Drop loan_requests policies if they exist
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loan_requests' AND policyname = 'Lenders view loan requests from their country') THEN
        DROP POLICY "Lenders view loan requests from their country" ON loan_requests;
        RAISE NOTICE 'Dropped existing policy: Lenders view loan requests from their country';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loan_requests' AND policyname = 'Borrowers can manage own loan requests') THEN
        DROP POLICY "Borrowers can manage own loan requests" ON loan_requests;
        RAISE NOTICE 'Dropped existing policy: Borrowers can manage own loan requests';
    END IF;
    
    -- Drop borrower_profiles policies if they exist
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'borrower_profiles' AND policyname = 'Lenders view borrower profiles from their country') THEN
        DROP POLICY "Lenders view borrower profiles from their country" ON borrower_profiles;
        RAISE NOTICE 'Dropped existing policy: Lenders view borrower profiles from their country';
    END IF;
    
    -- Drop blacklist policies if they exist
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blacklist' AND policyname = 'Lenders view blacklist from their country') THEN
        DROP POLICY "Lenders view blacklist from their country" ON blacklist;
        RAISE NOTICE 'Dropped existing policy: Lenders view blacklist from their country';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blacklist' AND policyname = 'Lenders create blacklist for their country') THEN
        DROP POLICY "Lenders create blacklist for their country" ON blacklist;
        RAISE NOTICE 'Dropped existing policy: Lenders create blacklist for their country';
    END IF;
END $$;

-- =====================================================
-- 2. CREATE OR REPLACE HELPER FUNCTION
-- =====================================================

-- Helper function to get current user's country_id
CREATE OR REPLACE FUNCTION get_user_country_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT country_id 
        FROM profiles 
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_country_id() TO authenticated;

-- =====================================================
-- 3. CREATE NEW POLICIES WITH COUNTRY RESTRICTIONS
-- =====================================================

-- Loan requests - Borrowers can only see/manage their own
CREATE POLICY "Borrowers can manage own loan requests" ON loan_requests
    FOR ALL USING (
        borrower_id IN (
            SELECT id FROM profiles WHERE auth_user_id = auth.uid()
        )
    );

-- Loan requests - Lenders can only see requests from their country
CREATE POLICY "Lenders view loan requests from their country" ON loan_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_subscriptions us ON us.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND p.role = 'lender'
            AND us.status = 'active'
            AND us.current_period_end > NOW()
        )
        AND borrower_id IN (
            SELECT id FROM profiles 
            WHERE country_id = get_user_country_id()
        )
    );

-- Borrower profiles - Lenders can only view profiles from their country
CREATE POLICY "Lenders view borrower profiles from their country" ON borrower_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_subscriptions us ON us.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND p.role = 'lender'
            AND us.status = 'active'
            AND us.current_period_end > NOW()
        )
        AND user_id IN (
            SELECT id FROM profiles 
            WHERE country_id = get_user_country_id()
        )
    );

-- Blacklist - Lenders can only view/manage blacklist entries for their country
CREATE POLICY "Lenders view blacklist from their country" ON blacklist
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_subscriptions us ON us.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND p.role = 'lender'
            AND us.status = 'active'
            AND us.current_period_end > NOW()
        )
        AND borrower_id IN (
            SELECT id FROM profiles 
            WHERE country_id = get_user_country_id()
        )
    );

-- Blacklist - Lenders can only blacklist borrowers from their country
CREATE POLICY "Lenders create blacklist for their country" ON blacklist
    FOR INSERT WITH CHECK (
        lender_id IN (
            SELECT id FROM profiles p
            WHERE p.auth_user_id = auth.uid() 
            AND p.role = 'lender'
        )
        AND borrower_id IN (
            SELECT id FROM profiles 
            WHERE country_id = get_user_country_id()
        )
    );

-- =====================================================
-- 4. VERIFY POLICIES WERE CREATED
-- =====================================================

-- List all policies on the affected tables
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN policyname LIKE '%country%' THEN '✅ Country-restricted'
        ELSE '⚠️ Check if needs country restriction'
    END as status
FROM pg_policies
WHERE tablename IN ('loan_requests', 'borrower_profiles', 'blacklist')
ORDER BY tablename, policyname;

-- =====================================================
-- 5. TEST THE POLICIES
-- =====================================================

-- Test query to verify country restrictions work
-- This should only show borrowers from the current user's country
/*
-- Run this as a logged-in lender to test:
SELECT 
    p.email,
    p.full_name,
    c.name as country,
    bp.reputation_score
FROM borrower_profiles bp
JOIN profiles p ON p.id = bp.user_id
JOIN countries c ON c.id = p.country_id
LIMIT 10;
*/

-- =====================================================
-- SUMMARY
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== Country Restriction Policies Applied ===';
    RAISE NOTICE '✅ Loan requests now filtered by country';
    RAISE NOTICE '✅ Borrower profiles filtered by country';
    RAISE NOTICE '✅ Blacklist filtered by country';
    RAISE NOTICE '✅ Helper function get_user_country_id() available';
    RAISE NOTICE '';
    RAISE NOTICE 'Test by logging in as a lender and verifying you only see borrowers from your country.';
END $$;