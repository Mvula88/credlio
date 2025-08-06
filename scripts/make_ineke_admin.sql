-- ============================================
-- MAKE INEKE SUPER ADMIN
-- ============================================

-- Update your existing profile to super_admin
UPDATE profiles
SET 
    role = 'super_admin',
    verified = true,
    full_name = 'Shikongo Shekupe (Admin)',
    credit_score = 850,
    reputation_score = 100,
    updated_at = NOW()
WHERE email = 'inekela34@gmail.com';

-- Add audit log entry
INSERT INTO audit_logs (
    user_id,
    action,
    description,
    created_at
) 
SELECT 
    id,
    'admin_promotion',
    'User promoted to super admin role',
    NOW()
FROM profiles
WHERE email = 'inekela34@gmail.com';

-- Verify the update
SELECT 
    id,
    auth_user_id,
    email,
    full_name,
    role,
    verified,
    credit_score,
    reputation_score,
    CASE 
        WHEN role = 'super_admin' THEN '✅ SUPER ADMIN - Full Access'
        WHEN role = 'admin' THEN '⚠️ Regular Admin'
        WHEN role = 'lender' THEN '❌ Lender Only'
        ELSE '❌ Other Role'
    END as status,
    updated_at
FROM profiles
WHERE email = 'inekela34@gmail.com';

-- Show success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '🎉 ADMIN SETUP SUCCESSFUL!';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ User: inekela34@gmail.com';
    RAISE NOTICE '✅ Name: Shikongo Shekupe';
    RAISE NOTICE '✅ Role: SUPER ADMIN';
    RAISE NOTICE '✅ Verified: TRUE';
    RAISE NOTICE '';
    RAISE NOTICE 'You now have FULL ACCESS to:';
    RAISE NOTICE '  • /admin/dashboard (System Management)';
    RAISE NOTICE '  • /admin/country/dashboard (Country Management)';
    RAISE NOTICE '  • All user management features';
    RAISE NOTICE '  • All financial oversight';
    RAISE NOTICE '  • All system settings';
    RAISE NOTICE '';
    RAISE NOTICE 'Login with:';
    RAISE NOTICE '  Email: inekela34@gmail.com';
    RAISE NOTICE '  Password: [your existing password]';
    RAISE NOTICE '================================================';
END $$;