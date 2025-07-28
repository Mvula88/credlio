-- First, let's check what profiles exist and their structure
SELECT id, email, auth_user_id FROM profiles LIMIT 5;

-- Assign super admin role to your profile
-- Replace 'your-email@example.com' with your actual email address
DO $$
DECLARE
    user_profile_id UUID;
    super_admin_role_id UUID;
BEGIN
    -- Get your profile ID by email
    SELECT id INTO user_profile_id 
    FROM profiles 
    WHERE email = 'inekela34@gmail.com';  -- Replace with your actual email
    
    -- Get super admin role ID
    SELECT id INTO super_admin_role_id 
    FROM user_roles 
    WHERE role_name = 'super_admin';
    
    -- Check if we found both IDs
    IF user_profile_id IS NULL THEN
        RAISE NOTICE 'Profile not found for email. Available profiles:';
        FOR rec IN SELECT email FROM profiles LOOP
            RAISE NOTICE 'Email: %', rec.email;
        END LOOP;
        RETURN;
    END IF;
    
    IF super_admin_role_id IS NULL THEN
        RAISE NOTICE 'Super admin role not found. Available roles:';
        FOR rec IN SELECT role_name FROM user_roles LOOP
            RAISE NOTICE 'Role: %', rec.role_name;
        END LOOP;
        RETURN;
    END IF;
    
    -- Assign the role
    INSERT INTO user_profile_roles (profile_id, role_id)
    VALUES (user_profile_id, super_admin_role_id)
    ON CONFLICT (profile_id, role_id) DO NOTHING;
    
    RAISE NOTICE 'Successfully assigned super_admin role to profile %', user_profile_id;
END $$;

-- Also assign country_admin role so you can switch between modes
DO $$
DECLARE
    user_profile_id UUID;
    country_admin_role_id UUID;
BEGIN
    -- Get your profile ID by email
    SELECT id INTO user_profile_id 
    FROM profiles 
    WHERE email = 'inekela34@gmail.com';  -- Replace with your actual email
    
    -- Get country admin role ID
    SELECT id INTO country_admin_role_id 
    FROM user_roles 
    WHERE role_name = 'country_admin';
    
    -- Assign the role
    INSERT INTO user_profile_roles (profile_id, role_id)
    VALUES (user_profile_id, country_admin_role_id)
    ON CONFLICT (profile_id, role_id) DO NOTHING;
    
    RAISE NOTICE 'Successfully assigned country_admin role to profile %', user_profile_id;
END $$;

-- Verify the role assignment
SELECT 
    p.email,
    ur.role_name,
    upr.created_at
FROM profiles p
JOIN user_profile_roles upr ON p.id = upr.profile_id
JOIN user_roles ur ON upr.role_id = ur.id
WHERE p.email = 'inekela34@gmail.com';  -- Replace with your actual email
