-- ============================================
-- CHECK AND UPDATE EXISTING USER TO ADMIN
-- ============================================

-- Step 1: Check what users exist in auth.users
SELECT 
    id as auth_id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- Step 2: Check what profiles exist
SELECT 
    id as profile_id,
    auth_user_id,
    email,
    full_name,
    role,
    verified,
    created_at
FROM profiles
ORDER BY created_at DESC;

-- Step 3: Update your existing user to super_admin
-- IMPORTANT: Replace 'your-email@example.com' with YOUR actual email
DO $$
DECLARE
    v_your_email VARCHAR := 'admin@credlio.com'; -- CHANGE THIS TO YOUR EMAIL
    v_auth_id UUID;
    v_profile_id UUID;
BEGIN
    -- Get auth user ID
    SELECT id INTO v_auth_id
    FROM auth.users 
    WHERE email = v_your_email
    LIMIT 1;
    
    IF v_auth_id IS NULL THEN
        RAISE NOTICE '❌ No auth user found with email: %', v_your_email;
        RAISE NOTICE 'Check the auth.users list above and update the email';
        RETURN;
    END IF;
    
    -- Check if profile exists
    SELECT id INTO v_profile_id
    FROM profiles
    WHERE auth_user_id = v_auth_id OR email = v_your_email
    LIMIT 1;
    
    IF v_profile_id IS NULL THEN
        -- Create profile for existing auth user
        INSERT INTO profiles (
            id,
            auth_user_id,
            email,
            full_name,
            role,
            verified,
            credit_score,
            reputation_score,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_auth_id,
            v_your_email,
            'Platform Administrator',
            'super_admin',
            true,
            850,
            100,
            NOW(),
            NOW()
        ) RETURNING id INTO v_profile_id;
        
        RAISE NOTICE '✅ Created new super admin profile for: %', v_your_email;
    ELSE
        -- Update existing profile to super admin
        UPDATE profiles
        SET 
            role = 'super_admin',
            verified = true,
            updated_at = NOW()
        WHERE id = v_profile_id;
        
        RAISE NOTICE '✅ Updated existing profile to super admin for: %', v_your_email;
    END IF;
    
    -- Add audit log
    INSERT INTO audit_logs (
        user_id,
        action,
        description,
        created_at
    ) VALUES (
        v_profile_id,
        'admin_setup',
        'User promoted to super admin role',
        NOW()
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '🎉 ADMIN SETUP COMPLETE!';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Email: %', v_your_email;
    RAISE NOTICE 'Profile ID: %', v_profile_id;
    RAISE NOTICE 'Role: super_admin';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now login and access:';
    RAISE NOTICE '  • /admin/dashboard';
    RAISE NOTICE '  • /admin/country/dashboard';
    RAISE NOTICE '================================================';
END $$;

-- Step 4: Verify the update
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.verified,
    p.created_at,
    CASE 
        WHEN p.role = 'super_admin' THEN '✅ SUPER ADMIN'
        WHEN p.role = 'admin' THEN '⚠️ Regular Admin'
        WHEN p.role = 'country_admin' THEN '⚠️ Country Admin'
        ELSE '❌ Regular User'
    END as admin_status
FROM profiles p
WHERE p.role IN ('super_admin', 'admin', 'country_admin')
   OR p.email LIKE '%admin%'
ORDER BY 
    CASE p.role 
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'country_admin' THEN 3
        ELSE 4
    END;