-- ============================================
-- SIMPLE ADMIN UPDATE - NO DEPENDENCIES
-- ============================================

-- Step 1: Update your profile to super_admin
UPDATE profiles
SET 
    role = 'super_admin',
    verified = true,
    credit_score = 850,
    reputation_score = 100,
    updated_at = NOW()
WHERE email = 'inekela34@gmail.com';

-- Step 2: Verify the update worked
SELECT 
    id,
    email,
    full_name,
    role,
    verified,
    CASE 
        WHEN role = 'super_admin' THEN '✅ SUCCESS - You are now SUPER ADMIN!'
        ELSE '❌ ERROR - Role not updated'
    END as status
FROM profiles
WHERE email = 'inekela34@gmail.com';