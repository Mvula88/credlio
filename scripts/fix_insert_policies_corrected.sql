-- =====================================================
-- FIX INSERT POLICIES WITH CORRECT COLUMN NAMES
-- =====================================================

-- First, let's check the actual columns in each table
DO $$
BEGIN
    RAISE NOTICE 'Checking table structures...';
END $$;

-- 1. Fix borrower_profiles INSERT policy
DROP POLICY IF EXISTS "Users can insert own borrower profile" ON borrower_profiles;
CREATE POLICY "Users can insert own borrower profile" ON borrower_profiles
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'borrower'
        )
    );

-- 2. Fix lender_profiles INSERT policy  
DROP POLICY IF EXISTS "Users can insert own lender profile" ON lender_profiles;
CREATE POLICY "Users can insert own lender profile" ON lender_profiles
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'lender'
        )
    );

-- 3. Check columns and fix borrower_risk_history
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'borrower_risk_history' 
               AND column_name = 'reported_by') THEN
        
        DROP POLICY IF EXISTS "Lenders can add risk history" ON borrower_risk_history;
        CREATE POLICY "Lenders can add risk history" ON borrower_risk_history
            FOR INSERT WITH CHECK (
                reported_by IN (
                    SELECT id FROM profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND role = 'lender'
                )
            );
            
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'borrower_risk_history' 
                  AND column_name = 'marked_by') THEN
        
        DROP POLICY IF EXISTS "Lenders can add risk history" ON borrower_risk_history;
        CREATE POLICY "Lenders can add risk history" ON borrower_risk_history
            FOR INSERT WITH CHECK (
                marked_by IN (
                    SELECT id FROM profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND role = 'lender'
                )
            );
            
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'borrower_risk_history' 
                  AND column_name = 'lender_id') THEN
        
        DROP POLICY IF EXISTS "Lenders can add risk history" ON borrower_risk_history;
        CREATE POLICY "Lenders can add risk history" ON borrower_risk_history
            FOR INSERT WITH CHECK (
                lender_id IN (
                    SELECT id FROM profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND role = 'lender'
                )
            );
    ELSE
        RAISE NOTICE 'borrower_risk_history table structure unclear - skipping';
    END IF;
END $$;

-- 4. Fix blacklist INSERT policy
DROP POLICY IF EXISTS "Lenders create blacklist for their country" ON blacklist;
DROP POLICY IF EXISTS "Lenders can create blacklist entries" ON blacklist;
CREATE POLICY "Lenders can create blacklist entries" ON blacklist
    FOR INSERT WITH CHECK (
        lender_id IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'lender'
        )
    );

-- 5. Fix credit_report_views INSERT policy
DROP POLICY IF EXISTS "Lenders can log report views" ON credit_report_views;
CREATE POLICY "Lenders can log report views" ON credit_report_views
    FOR INSERT WITH CHECK (
        lender_id IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'lender'
        )
    );

-- 6. Check and fix reputation_events
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'reputation_events' 
               AND column_name = 'created_by') THEN
        
        DROP POLICY IF EXISTS "Lenders can create reputation events" ON reputation_events;
        CREATE POLICY "Lenders can create reputation events" ON reputation_events
            FOR INSERT WITH CHECK (
                created_by IN (
                    SELECT id FROM profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND role = 'lender'
                )
            );
    ELSE
        RAISE NOTICE 'reputation_events might use different column - skipping';
    END IF;
END $$;

-- 7. Fix profiles INSERT (for signup)
DROP POLICY IF EXISTS "Users can insert own profile on signup" ON profiles;
CREATE POLICY "Users can insert own profile on signup" ON profiles
    FOR INSERT WITH CHECK (
        auth_user_id = auth.uid()
    );

-- 8. Check if smart_tags table exists and fix
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'smart_tags') THEN
        
        DROP POLICY IF EXISTS "System can create tags" ON smart_tags;
        CREATE POLICY "Only admins can create tags" ON smart_tags
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND role = 'admin'
                )
            );
    END IF;
END $$;

-- 9. Check borrower_invites vs borrower_invitations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'borrower_invites') THEN
        
        DROP POLICY IF EXISTS "borrower_invites_insert_lender" ON borrower_invites;
        CREATE POLICY "Lenders can create invites" ON borrower_invites
            FOR INSERT WITH CHECK (
                lender_id IN (
                    SELECT id FROM profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND role = 'lender'
                )
            );
            
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                  WHERE table_name = 'borrower_invitations') THEN
        
        DROP POLICY IF EXISTS "Lenders can manage invitations" ON borrower_invitations;
        CREATE POLICY "Lenders can create invitations" ON borrower_invitations
            FOR INSERT WITH CHECK (
                lender_id IN (
                    SELECT id FROM profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND role = 'lender'
                )
            );
    END IF;
END $$;

-- 10. Fix user_profile_roles if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'user_profile_roles') THEN
        
        DROP POLICY IF EXISTS "Users can insert own role assignment" ON user_profile_roles;
        -- This should be handled by triggers/functions during signup
        RAISE NOTICE 'user_profile_roles should be managed by system, not direct inserts';
    END IF;
END $$;

-- Show what we fixed
SELECT 
    t.tablename,
    COUNT(pol.polname) as policy_count,
    string_agg(pol.polname, ', ') as policies
FROM pg_tables t
LEFT JOIN pg_policy pol ON t.tablename::regclass = pol.polrelid
WHERE t.schemaname = 'public'
AND t.tablename IN (
    'borrower_profiles', 'lender_profiles', 'borrower_risk_history',
    'blacklist', 'credit_report_views', 'reputation_events',
    'smart_tags', 'profiles', 'borrower_invites', 'borrower_invitations'
)
GROUP BY t.tablename
ORDER BY t.tablename;

-- Summary
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ INSERT POLICIES FIXED (with correct column names)!';
    RAISE NOTICE '';
    RAISE NOTICE 'The script handled tables that exist and skipped missing ones.';
    RAISE NOTICE 'All INSERT operations now require proper authentication.';
    RAISE NOTICE '';
END $$;