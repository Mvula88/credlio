-- ============================================
-- SIMPLE ADMIN SETUP - RUN AFTER FIX SCRIPT
-- ============================================

-- Step 1: First ensure the user exists in auth.users
-- Go to Supabase Dashboard > Authentication > Users
-- Create a new user with your email

-- Step 2: Update this email to match your auth user
DO $$
DECLARE
  v_admin_email VARCHAR := 'admin@credlio.com'; -- CHANGE THIS TO YOUR EMAIL
  v_admin_name VARCHAR := 'Platform Administrator'; -- CHANGE THIS TO YOUR NAME
  v_profile_id UUID;
  v_auth_id UUID;
BEGIN
  -- Get the auth user ID
  SELECT id INTO v_auth_id
  FROM auth.users 
  WHERE email = v_admin_email
  LIMIT 1;
  
  IF v_auth_id IS NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROR: Auth user not found!';
    RAISE NOTICE '';
    RAISE NOTICE 'Please create an auth user first:';
    RAISE NOTICE '1. Go to Supabase Dashboard';
    RAISE NOTICE '2. Navigate to Authentication > Users';
    RAISE NOTICE '3. Click "Invite User"';
    RAISE NOTICE '4. Enter email: %', v_admin_email;
    RAISE NOTICE '5. After creating, run this script again';
    RAISE NOTICE '';
    RETURN;
  END IF;
  
  -- Check if profile exists
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE auth_user_id = v_auth_id OR email = v_admin_email;
  
  IF v_profile_id IS NOT NULL THEN
    -- Update existing profile to super admin
    UPDATE profiles
    SET 
      role = 'super_admin',
      verified = true,
      full_name = COALESCE(full_name, v_admin_name),
      email = v_admin_email,
      updated_at = NOW()
    WHERE id = v_profile_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCCESS: Profile updated to Super Admin!';
    RAISE NOTICE 'Profile ID: %', v_profile_id;
    RAISE NOTICE 'Email: %', v_admin_email;
    RAISE NOTICE '';
  ELSE
    -- Create new super admin profile
    INSERT INTO profiles (
      id,
      auth_user_id,
      email,
      full_name,
      role,
      verified,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_auth_id,
      v_admin_email,
      v_admin_name,
      'super_admin',
      true,
      NOW(),
      NOW()
    ) RETURNING id INTO v_profile_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCCESS: Super Admin profile created!';
    RAISE NOTICE 'Profile ID: %', v_profile_id;
    RAISE NOTICE 'Email: %', v_admin_email;
    RAISE NOTICE '';
  END IF;
  
  -- Create audit log entry
  INSERT INTO audit_logs (
    user_id,
    action,
    description,
    created_at
  ) VALUES (
    v_profile_id,
    'admin_setup',
    'Super Admin account configured',
    NOW()
  );
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '🎉 ADMIN SETUP COMPLETE!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now access:';
  RAISE NOTICE '  • Admin Dashboard: /admin/dashboard';
  RAISE NOTICE '  • Country Admin: /admin/country/dashboard';
  RAISE NOTICE '';
  RAISE NOTICE 'Login with:';
  RAISE NOTICE '  Email: %', v_admin_email;
  RAISE NOTICE '  Password: (the one you set in Supabase)';
  RAISE NOTICE '================================================';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE '';
    RAISE NOTICE 'Troubleshooting:';
    RAISE NOTICE '1. Make sure you created the auth user in Supabase';
    RAISE NOTICE '2. Check that the email matches exactly';
    RAISE NOTICE '3. Run fix_missing_tables_and_columns.sql first';
    RAISE NOTICE '';
END $$;

-- ============================================
-- QUICK ROLE SWITCHER (for testing)
-- ============================================

CREATE OR REPLACE FUNCTION quick_switch_role(
  user_email VARCHAR,
  new_role VARCHAR
)
RETURNS TEXT AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Validate role
  IF new_role NOT IN ('super_admin', 'admin', 'country_admin', 'lender', 'borrower') THEN
    RETURN 'ERROR: Invalid role. Use: super_admin, admin, country_admin, lender, or borrower';
  END IF;
  
  -- Update role
  UPDATE profiles
  SET 
    role = new_role,
    updated_at = NOW()
  WHERE email = user_email
  RETURNING id INTO v_profile_id;
  
  IF v_profile_id IS NULL THEN
    RETURN 'ERROR: User not found with email: ' || user_email;
  END IF;
  
  RETURN 'SUCCESS: Role changed to ' || new_role || ' for ' || user_email;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEW CURRENT ADMINS
-- ============================================

DO $$
DECLARE
  v_admin_count INTEGER;
  v_super_admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_super_admin_count
  FROM profiles
  WHERE role = 'super_admin';
  
  SELECT COUNT(*) INTO v_admin_count
  FROM profiles
  WHERE role IN ('admin', 'super_admin', 'country_admin');
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '📊 CURRENT ADMIN STATUS';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Super Admins: %', v_super_admin_count;
  RAISE NOTICE 'Total Admins: %', v_admin_count;
  RAISE NOTICE '';
  
  -- List current admins
  FOR v_admin_count IN
    SELECT email, role, full_name
    FROM profiles
    WHERE role IN ('admin', 'super_admin', 'country_admin')
    ORDER BY role, email
  LOOP
    RAISE NOTICE 'Admin: % (%) - %', 
      v_admin_count.email, 
      v_admin_count.role,
      COALESCE(v_admin_count.full_name, 'No name');
  END LOOP;
  
  RAISE NOTICE '================================================';
END $$;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- To switch your role for testing:
-- SELECT quick_switch_role('your-email@example.com', 'lender');
-- SELECT quick_switch_role('your-email@example.com', 'borrower');
-- SELECT quick_switch_role('your-email@example.com', 'super_admin');

-- To view all users and their roles:
-- SELECT email, role, verified, created_at FROM profiles ORDER BY role, created_at DESC;