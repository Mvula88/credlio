-- ============================================
-- SETUP ADMIN USERS FOR PLATFORM MANAGEMENT
-- Creates Super Admin and Country Admin accounts
-- ============================================

-- ============================================
-- IMPORTANT: Update these values with your details
-- ============================================
DO $$
DECLARE
  v_super_admin_email VARCHAR := 'admin@credlio.com'; -- Change this to your email
  v_super_admin_password VARCHAR := 'SuperAdmin123!'; -- Change this to a secure password
  v_super_admin_name VARCHAR := 'Platform Administrator';
  v_super_admin_id UUID;
  v_country_id UUID;
  v_country_admin_id UUID;
BEGIN
  -- ============================================
  -- STEP 1: Create Super Admin User
  -- ============================================
  
  -- Note: You need to create the auth user through Supabase Auth first
  -- This can be done via Supabase Dashboard or using the auth.admin API
  
  -- Check if super admin profile exists
  SELECT id INTO v_super_admin_id
  FROM profiles
  WHERE email = v_super_admin_email;
  
  IF v_super_admin_id IS NULL THEN
    RAISE NOTICE 'Creating Super Admin profile...';
    
    -- Insert super admin profile (after creating auth user)
    INSERT INTO profiles (
      auth_user_id,
      email,
      full_name,
      role,
      verified,
      created_at,
      updated_at
    ) VALUES (
      (SELECT id FROM auth.users WHERE email = v_super_admin_email LIMIT 1),
      v_super_admin_email,
      v_super_admin_name,
      'super_admin',
      true,
      NOW(),
      NOW()
    ) RETURNING id INTO v_super_admin_id;
    
    RAISE NOTICE '✅ Super Admin created: %', v_super_admin_email;
  ELSE
    -- Update existing user to super admin
    UPDATE profiles
    SET 
      role = 'super_admin',
      verified = true,
      updated_at = NOW()
    WHERE id = v_super_admin_id;
    
    RAISE NOTICE '✅ Super Admin role updated: %', v_super_admin_email;
  END IF;
  
  -- ============================================
  -- STEP 2: Create Country Admin for Each Country
  -- ============================================
  
  -- You can manage all countries with your super admin account
  -- Or create specific country admins as needed
  
  -- Example: Create a country admin for Nigeria
  SELECT id INTO v_country_id FROM countries WHERE code = 'NG' LIMIT 1;
  
  IF v_country_id IS NOT NULL THEN
    -- Check if country admin exists for Nigeria
    SELECT id INTO v_country_admin_id
    FROM profiles
    WHERE email = 'admin.nigeria@credlio.com';
    
    IF v_country_admin_id IS NULL THEN
      -- Note: Create auth user first via Supabase Dashboard
      -- Then run this to set up the profile
      
      /*
      INSERT INTO profiles (
        auth_user_id,
        email,
        full_name,
        role,
        country_id,
        verified,
        created_at,
        updated_at
      ) VALUES (
        (SELECT id FROM auth.users WHERE email = 'admin.nigeria@credlio.com' LIMIT 1),
        'admin.nigeria@credlio.com',
        'Nigeria Administrator',
        'country_admin',
        v_country_id,
        true,
        NOW(),
        NOW()
      );
      
      RAISE NOTICE '✅ Country Admin created for Nigeria';
      */
    END IF;
  END IF;
  
  -- ============================================
  -- STEP 3: Grant Admin Capabilities
  -- ============================================
  
  -- Create admin audit log entry
  INSERT INTO audit_logs (
    user_id,
    action,
    description,
    created_at
  ) VALUES (
    v_super_admin_id,
    'admin_setup',
    'Initial admin setup completed',
    NOW()
  );
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '🔐 ADMIN SETUP INSTRUCTIONS';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Create Auth Users:';
  RAISE NOTICE '   Go to Supabase Dashboard > Authentication > Users';
  RAISE NOTICE '   Create user with email: %', v_super_admin_email;
  RAISE NOTICE '';
  RAISE NOTICE '2. Run this SQL script after creating auth users';
  RAISE NOTICE '';
  RAISE NOTICE '3. Login with your admin credentials';
  RAISE NOTICE '';
  RAISE NOTICE '4. Access admin dashboards:';
  RAISE NOTICE '   • Super Admin: /admin/dashboard';
  RAISE NOTICE '   • Country Admin: /admin/country/dashboard';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
END $$;

-- ============================================
-- HELPER FUNCTION: Switch User Role
-- Use this to switch between roles for testing
-- ============================================

CREATE OR REPLACE FUNCTION switch_user_role(
  user_email VARCHAR,
  new_role VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Validate role
  IF new_role NOT IN ('super_admin', 'admin', 'country_admin', 'lender', 'borrower') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;
  
  -- Get user ID
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', user_email;
  END IF;
  
  -- Update role
  UPDATE profiles
  SET 
    role = new_role,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  -- Log the change
  INSERT INTO audit_logs (
    user_id,
    action,
    description,
    target_id,
    created_at
  ) VALUES (
    v_user_id,
    'role_change',
    format('Role changed to %s', new_role),
    v_user_id,
    NOW()
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Assign Country Admin
-- ============================================

CREATE OR REPLACE FUNCTION assign_country_admin(
  user_email VARCHAR,
  country_code VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_country_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', user_email;
  END IF;
  
  -- Get country ID
  SELECT id INTO v_country_id
  FROM countries
  WHERE code = country_code;
  
  IF v_country_id IS NULL THEN
    RAISE EXCEPTION 'Country not found: %', country_code;
  END IF;
  
  -- Update user to country admin
  UPDATE profiles
  SET 
    role = 'country_admin',
    country_id = v_country_id,
    verified = true,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  -- Log the assignment
  INSERT INTO audit_logs (
    user_id,
    action,
    description,
    target_id,
    metadata,
    created_at
  ) VALUES (
    v_user_id,
    'country_admin_assigned',
    format('Assigned as country admin for %s', country_code),
    v_user_id,
    jsonb_build_object('country_code', country_code, 'country_id', v_country_id),
    NOW()
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIEW: Admin Dashboard Summary
-- ============================================

CREATE OR REPLACE VIEW admin_dashboard_summary AS
SELECT
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM profiles WHERE role = 'lender') as total_lenders,
  (SELECT COUNT(*) FROM profiles WHERE role = 'borrower') as total_borrowers,
  (SELECT COUNT(*) FROM profiles WHERE role IN ('admin', 'super_admin')) as total_admins,
  (SELECT COUNT(*) FROM profiles WHERE role = 'country_admin') as total_country_admins,
  (SELECT COUNT(*) FROM loans WHERE status IN ('active', 'overdue')) as active_loans,
  (SELECT COUNT(*) FROM profiles WHERE verified = false) as pending_verifications,
  (SELECT COUNT(*) FROM profiles WHERE is_blacklisted = true) as blacklisted_users,
  (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') as open_tickets,
  (SELECT COUNT(*) FROM risk_alerts WHERE resolved = false) as active_alerts;

-- Grant access to admin view
GRANT SELECT ON admin_dashboard_summary TO authenticated;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Example 1: Make yourself a super admin (after creating auth user)
-- UPDATE profiles SET role = 'super_admin' WHERE email = 'your-email@example.com';

-- Example 2: Assign yourself as country admin for Nigeria
-- SELECT assign_country_admin('your-email@example.com', 'NG');

-- Example 3: Switch between roles for testing
-- SELECT switch_user_role('your-email@example.com', 'lender');
-- SELECT switch_user_role('your-email@example.com', 'super_admin');

-- Example 4: View admin summary
-- SELECT * FROM admin_dashboard_summary;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  v_admin_count INTEGER;
  v_country_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_admin_count
  FROM profiles
  WHERE role IN ('admin', 'super_admin');
  
  SELECT COUNT(*) INTO v_country_count
  FROM countries;
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '📊 ADMIN SETUP STATUS';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Admin Users: %', v_admin_count;
  RAISE NOTICE 'Countries Available: %', v_country_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Create auth user in Supabase Dashboard';
  RAISE NOTICE '2. Update email/password in this script';
  RAISE NOTICE '3. Run this script to set up admin profile';
  RAISE NOTICE '4. Login to access admin dashboards';
  RAISE NOTICE '================================================';
END $$;