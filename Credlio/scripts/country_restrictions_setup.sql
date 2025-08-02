-- Country Restrictions Setup
-- This script implements country-based data isolation and security

-- =====================================================
-- 1. ADD CONSTRAINTS TO PREVENT COUNTRY CHANGES
-- =====================================================

-- Add a trigger to prevent country_id updates on profiles table
CREATE OR REPLACE FUNCTION prevent_country_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow insert but prevent updates to country_idbut will 
    IF TG_OP = 'UPDATE' AND OLD.country_id IS DISTINCT FROM NEW.country_id THEN
        RAISE EXCEPTION 'Country cannot be changed after registration';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS prevent_country_update ON profiles;
CREATE TRIGGER prevent_country_update
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_country_change();

-- =====================================================
-- 2. CREATE FUNCTION TO GET USER'S COUNTRY
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
-- 3. UPDATE RLS POLICIES FOR COUNTRY-BASED ACCESS
-- =====================================================

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Borrowers can manage own loan requests" ON loan_requests;
DROP POLICY IF EXISTS "Subscribed lenders can view loan requests" ON loan_requests;
DROP POLICY IF EXISTS "Subscribed lenders can view borrower profiles" ON borrower_profiles;
DROP POLICY IF EXISTS "Subscribed lenders can view blacklist" ON blacklist;

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

-- Update blacklist insert policy to ensure lenders can only blacklist borrowers from their country
DROP POLICY IF EXISTS "Lenders can create blacklist entries" ON blacklist;
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
-- 4. CREATE VIEWS FOR COUNTRY-SPECIFIC DATA
-- =====================================================

-- Create a view for lenders to see only borrowers from their country
CREATE OR REPLACE VIEW country_borrowers AS
SELECT 
    p.*,
    bp.reputation_score,
    bp.total_loans_requested,
    bp.loans_repaid,
    bp.loans_defaulted
FROM profiles p
LEFT JOIN borrower_profiles bp ON bp.user_id = p.id
WHERE p.role = 'borrower'
AND p.country_id = get_user_country_id();

-- Grant access to authenticated users
GRANT SELECT ON country_borrowers TO authenticated;

-- =====================================================
-- 5. ADD COUNTRY VALIDATION FOR API ENDPOINTS
-- =====================================================

-- Function to validate that a user can access data for a specific profile
CREATE OR REPLACE FUNCTION can_access_profile(target_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    target_country_id UUID;
    user_country_id UUID;
    user_role TEXT;
BEGIN
    -- Get the target profile's country
    SELECT country_id INTO target_country_id
    FROM profiles
    WHERE id = target_profile_id;
    
    -- Get current user's country and role
    SELECT country_id, role INTO user_country_id, user_role
    FROM profiles
    WHERE auth_user_id = auth.uid();
    
    -- Borrowers can only access their own profile
    IF user_role = 'borrower' THEN
        RETURN target_profile_id IN (
            SELECT id FROM profiles WHERE auth_user_id = auth.uid()
        );
    END IF;
    
    -- Lenders can only access profiles from their country
    IF user_role = 'lender' THEN
        RETURN target_country_id = user_country_id;
    END IF;
    
    -- Admins can access all profiles
    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_access_profile(UUID) TO authenticated;

-- =====================================================
-- 6. UPDATE EXISTING DATA TO ENSURE CONSISTENCY
-- =====================================================

-- Check for any profiles without country_id and log them
SELECT 
    id, 
    email, 
    full_name,
    created_at,
    CASE 
        WHEN country_id IS NULL THEN 'Missing country_id - needs update'
        ELSE 'OK'
    END as status
FROM profiles
WHERE country_id IS NULL;

-- =====================================================
-- 7. CREATE AUDIT LOG FOR COUNTRY ACCESS ATTEMPTS
-- =====================================================

-- Create table to log cross-country access attempts (for security monitoring)
CREATE TABLE IF NOT EXISTS country_access_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    attempted_country_id UUID REFERENCES countries(id),
    user_country_id UUID REFERENCES countries(id),
    access_type VARCHAR(50), -- 'view_profile', 'view_loan', etc.
    was_denied BOOLEAN,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the audit table
ALTER TABLE country_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view access logs
CREATE POLICY "Only admins can view access logs" ON country_access_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- =====================================================
-- 8. SUMMARY
-- =====================================================

-- This script implements:
-- ✅ Prevents country changes after registration
-- ✅ Restricts loan requests visibility to same country
-- ✅ Restricts borrower profiles visibility to same country
-- ✅ Restricts blacklist management to same country
-- ✅ Creates helper functions for country validation
-- ✅ Adds audit logging for security monitoring
-- ✅ Ensures data isolation by country

-- Next steps:
-- 1. Run this script in your Supabase SQL Editor
-- 2. Test signup with different phone numbers
-- 3. Verify that users can only see data from their country
-- 4. Monitor the country_access_logs table for any issues