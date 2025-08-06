-- ============================================
-- MANAGE USER ROLES - Fix Role Conflicts
-- ============================================

-- 1. Check your current user and role
SELECT 
    p.id as profile_id,
    p.auth_user_id,
    p.email,
    p.full_name,
    p.role as current_role,
    au.created_at as account_created,
    au.email_confirmed_at as email_confirmed
FROM profiles p
JOIN auth.users au ON au.id = p.auth_user_id
WHERE p.email = 'inekela34@gmail.com'
ORDER BY p.created_at DESC;

-- 2. If you want to test as a regular user (borrower/lender), you have options:

-- OPTION A: Change your existing account role temporarily
-- Uncomment and run this to change your role:
/*
UPDATE profiles 
SET role = 'borrower'  -- or 'lender'
WHERE email = 'inekela34@gmail.com';
*/

-- OPTION B: Create a separate test account with a different email
-- Use email aliases like: inekela34+test@gmail.com, inekela34+borrower@gmail.com
-- Gmail ignores everything after + so it goes to your same inbox

-- 3. Create a function to easily switch roles for testing
CREATE OR REPLACE FUNCTION switch_user_role(
    p_email text,
    p_new_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result json;
    v_old_role text;
BEGIN
    -- Validate role
    IF p_new_role NOT IN ('borrower', 'lender', 'admin', 'super_admin', 'country_admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid role. Must be: borrower, lender, admin, super_admin, or country_admin'
        );
    END IF;
    
    -- Get current role
    SELECT role INTO v_old_role
    FROM profiles
    WHERE email = p_email;
    
    IF v_old_role IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Update role
    UPDATE profiles
    SET 
        role = p_new_role,
        updated_at = now()
    WHERE email = p_email;
    
    -- If switching to borrower, ensure borrower profile exists
    IF p_new_role = 'borrower' THEN
        INSERT INTO borrower_profiles (
            user_id,
            reputation_score,
            total_loans_requested,
            loans_repaid,
            loans_defaulted,
            created_at
        )
        SELECT 
            id,
            50,
            0,
            0,
            0,
            now()
        FROM profiles
        WHERE email = p_email
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Role changed from %s to %s', v_old_role, p_new_role),
        'old_role', v_old_role,
        'new_role', p_new_role
    );
END;
$$;

-- 4. Grant permission to use the function
GRANT EXECUTE ON FUNCTION switch_user_role TO authenticated;

-- 5. Example: Switch your account to borrower for testing
-- Uncomment and run:
/*
SELECT switch_user_role('inekela34@gmail.com', 'borrower');
*/

-- 6. Create test accounts with different roles
-- This creates separate auth users for testing different roles
DO $$
DECLARE
    v_user_id uuid;
    v_country_id uuid;
BEGIN
    -- Get default country
    SELECT id INTO v_country_id FROM countries WHERE code = 'NA' LIMIT 1;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST ACCOUNT SUGGESTIONS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Since your main email is admin, you can:';
    RAISE NOTICE '';
    RAISE NOTICE '1. Use email aliases for testing:';
    RAISE NOTICE '   - inekela34+borrower@gmail.com (for borrower testing)';
    RAISE NOTICE '   - inekela34+lender@gmail.com (for lender testing)';
    RAISE NOTICE '   These all go to your same Gmail inbox!';
    RAISE NOTICE '';
    RAISE NOTICE '2. Temporarily switch your role:';
    RAISE NOTICE '   SELECT switch_user_role(''inekela34@gmail.com'', ''borrower'');';
    RAISE NOTICE '';
    RAISE NOTICE '3. Switch back to admin when done:';
    RAISE NOTICE '   SELECT switch_user_role(''inekela34@gmail.com'', ''admin'');';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

-- 7. View all users and their roles
SELECT 
    p.email,
    p.full_name,
    p.role,
    p.created_at,
    CASE 
        WHEN p.role = 'admin' THEN '👨‍💼 Admin'
        WHEN p.role = 'borrower' THEN '💰 Borrower'
        WHEN p.role = 'lender' THEN '🏦 Lender'
        ELSE p.role
    END as role_display
FROM profiles p
ORDER BY p.created_at DESC
LIMIT 10;