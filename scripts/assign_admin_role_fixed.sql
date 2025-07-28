-- Assign super admin role to your profile using auth_user_id
-- This script will find your profile using your email from auth.users table

DO $$
DECLARE
    user_profile_id UUID;
    super_admin_role_id UUID;
    country_admin_role_id UUID;
    user_email TEXT := 'inekela34@gmail.com'; -- Replace with your actual email
    rec RECORD;
BEGIN
    -- Get your profile ID using email from auth.users
    SELECT p.id INTO user_profile_id 
    FROM profiles p
    JOIN auth.users au ON p.auth_user_id = au.id
    WHERE au.email = user_email;
    
    -- Get super admin role ID
    SELECT id INTO super_admin_role_id 
    FROM user_roles 
    WHERE role_name = 'super_admin';
    
    -- Get country admin role ID
    SELECT id INTO country_admin_role_id 
    FROM user_roles 
    WHERE role_name = 'country_admin';
    
    -- Check if we found the profile
    IF user_profile_id IS NULL THEN
        RAISE NOTICE 'Profile not found for email: %', user_email;
        RAISE NOTICE 'Available emails in auth.users:';
        FOR rec IN SELECT email FROM auth.users LOOP
            RAISE NOTICE 'Email: %', rec.email;
        END LOOP;
        RETURN;
    END IF;
    
    -- Check if we found the roles
    IF super_admin_role_id IS NULL THEN
        RAISE NOTICE 'Super admin role not found. Available roles:';
        FOR rec IN SELECT role_name FROM user_roles LOOP
            RAISE NOTICE 'Role: %', rec.role_name;
        END LOOP;
        RETURN;
    END IF;
    
    -- Assign super admin role
    INSERT INTO user_profile_roles (profile_id, role_id)
    VALUES (user_profile_id, super_admin_role_id)
    ON CONFLICT (profile_id, role_id) DO NOTHING;
    
    RAISE NOTICE 'Successfully assigned super_admin role to profile %', user_profile_id;
    
    -- Assign country admin role
    IF country_admin_role_id IS NOT NULL THEN
        INSERT INTO user_profile_roles (profile_id, role_id)
        VALUES (user_profile_id, country_admin_role_id)
        ON CONFLICT (profile_id, role_id) DO NOTHING;
        
        RAISE NOTICE 'Successfully assigned country_admin role to profile %', user_profile_id;
    END IF;
END $$;

-- Verify the role assignment
SELECT 
    au.email,
    ur.role_name,
    upr.created_at
FROM auth.users au
JOIN profiles p ON au.id = p.auth_user_id
JOIN user_profile_roles upr ON p.id = upr.profile_id
JOIN user_roles ur ON upr.role_id = ur.id
WHERE au.email = 'inekela34@gmail.com'; -- Replace with your actual email
