-- =====================================================
-- Country-Based Row Level Security (RLS)
-- Ensures users can only access data from their country
-- =====================================================

-- 1. Helper function to get current user's country_id
CREATE OR REPLACE FUNCTION auth.user_country_id()
RETURNS UUID AS $$
    SELECT country_id 
    FROM public.profiles 
    WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Helper function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'country_admin')
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Helper function to check if user is country admin for specific country
CREATE OR REPLACE FUNCTION auth.is_country_admin(p_country_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE auth_user_id = auth.uid() 
        AND role = 'country_admin'
        AND country_id = p_country_id
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Enable RLS on all relevant tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Profiles table policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can only see profiles from their country" ON profiles;

-- Users can always see their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT
    USING (auth_user_id = auth.uid());

-- Users can update their own profile (but not country_id)
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    USING (auth_user_id = auth.uid())
    WITH CHECK (
        auth_user_id = auth.uid() 
        AND (country_id = (SELECT country_id FROM profiles WHERE auth_user_id = auth.uid()))
    );

-- Users can see other profiles only from their country (for lenders checking borrowers)
CREATE POLICY "Users see profiles from same country" ON profiles
    FOR SELECT
    USING (
        country_id = auth.user_country_id()
        OR auth.is_admin()
        OR auth.is_country_admin(country_id)
    );

-- 6. Borrowers table policies
DROP POLICY IF EXISTS "Borrowers country isolation" ON borrowers;

CREATE POLICY "Borrowers country isolation" ON borrowers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = borrowers.profile_id 
            AND (
                p.country_id = auth.user_country_id()
                OR auth.is_admin()
                OR auth.is_country_admin(p.country_id)
            )
        )
    );

-- 7. Lenders table policies
DROP POLICY IF EXISTS "Lenders country isolation" ON lenders;

CREATE POLICY "Lenders country isolation" ON lenders
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = lenders.profile_id 
            AND (
                p.country_id = auth.user_country_id()
                OR auth.is_admin()
                OR auth.is_country_admin(p.country_id)
            )
        )
    );

-- 8. Loans table policies
DROP POLICY IF EXISTS "Loans country isolation" ON loans;

CREATE POLICY "Loans country isolation" ON loans
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE (p.id = loans.borrower_id OR p.id = loans.lender_id)
            AND (
                p.country_id = auth.user_country_id()
                OR auth.is_admin()
                OR auth.is_country_admin(p.country_id)
            )
        )
    );

-- 9. Loan applications policies
DROP POLICY IF EXISTS "Loan applications country isolation" ON loan_applications;

CREATE POLICY "Loan applications country isolation" ON loan_applications
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = loan_applications.borrower_id
            AND (
                p.country_id = auth.user_country_id()
                OR auth.is_admin()
                OR auth.is_country_admin(p.country_id)
            )
        )
    );

-- 10. Reputation reports policies
DROP POLICY IF EXISTS "Reputation reports country isolation" ON reputation_reports;

CREATE POLICY "Reputation reports country isolation" ON reputation_reports
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = reputation_reports.borrower_id
            AND (
                p.country_id = auth.user_country_id()
                OR auth.is_admin()
                OR auth.is_country_admin(p.country_id)
            )
        )
    );

-- 11. Blacklisted borrowers policies
DROP POLICY IF EXISTS "Blacklist country isolation" ON blacklisted_borrowers;

CREATE POLICY "Blacklist country isolation" ON blacklisted_borrowers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = blacklisted_borrowers.borrower_id
            AND (
                p.country_id = auth.user_country_id()
                OR auth.is_admin()
                OR auth.is_country_admin(p.country_id)
            )
        )
    );

-- 12. User transactions policies (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_transactions') THEN
        DROP POLICY IF EXISTS "Transactions country isolation" ON user_transactions;
        
        EXECUTE 'CREATE POLICY "Transactions country isolation" ON user_transactions
            FOR ALL
            USING (
                country_id = auth.user_country_id()
                OR auth.is_admin()
                OR auth.is_country_admin(country_id)
            )';
    END IF;
END $$;

-- 13. Create view for country-isolated user search (for lenders finding borrowers)
CREATE OR REPLACE VIEW searchable_users AS
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.created_at,
    p.trust_score,
    p.is_blacklisted,
    p.role,
    c.name as country_name,
    c.code as country_code,
    c.flag as country_flag
FROM profiles p
JOIN countries c ON p.country_id = c.id
WHERE p.country_id = auth.user_country_id()
   OR auth.is_admin()
   OR auth.is_country_admin(p.country_id);

-- Grant access to the view
GRANT SELECT ON searchable_users TO authenticated;

-- 14. Create function for country-safe user search
CREATE OR REPLACE FUNCTION search_users_in_country(
    p_search_term TEXT,
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    trust_score INTEGER,
    is_blacklisted BOOLEAN,
    role TEXT,
    country_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.email,
        p.phone,
        p.trust_score,
        p.is_blacklisted,
        p.role,
        c.name as country_name
    FROM profiles p
    JOIN countries c ON p.country_id = c.id
    WHERE p.country_id = auth.user_country_id()
        AND (
            p.full_name ILIKE '%' || p_search_term || '%'
            OR p.email ILIKE '%' || p_search_term || '%'
            OR p.phone ILIKE '%' || p_search_term || '%'
        )
        AND (p_role = p.role OR p_role IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Test the policies (run as different users to verify)
-- This query should only show users from the same country
-- SELECT * FROM profiles;
-- SELECT * FROM searchable_users;

-- 16. Create audit trigger for country changes (should be rare/never)
CREATE OR REPLACE FUNCTION audit_country_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.country_id IS DISTINCT FROM NEW.country_id THEN
        INSERT INTO audit_log (
            table_name,
            record_id,
            action,
            old_data,
            new_data,
            changed_by,
            changed_at
        ) VALUES (
            'profiles',
            NEW.id,
            'country_change',
            jsonb_build_object('country_id', OLD.country_id),
            jsonb_build_object('country_id', NEW.country_id),
            auth.uid(),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if audit_log table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
        CREATE TRIGGER audit_country_changes
            AFTER UPDATE ON profiles
            FOR EACH ROW
            EXECUTE FUNCTION audit_country_change();
    END IF;
END $$;

-- 17. Summary of RLS implementation
SELECT 
    'RLS Implementation Summary' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'profiles', 'borrowers', 'lenders', 'loans', 
    'loan_applications', 'reputation_reports', 
    'blacklisted_borrowers', 'user_transactions'
)
ORDER BY tablename;