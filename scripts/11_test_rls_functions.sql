-- Create a function to test RLS policies by simulating different users
CREATE OR REPLACE FUNCTION test_rls_as_user(
  test_auth_user_id UUID,
  test_profile_id UUID,
  test_country_id UUID,
  test_roles TEXT[]
)
RETURNS VOID AS $$
DECLARE
  role_id UUID;
  role_name TEXT;
BEGIN
  -- Override the auth.uid() function for testing
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
    SELECT $1;
  $$ LANGUAGE SQL IMMUTABLE SET search_path FROM CURRENT;
  
  -- Set the test_auth_user_id parameter
  PERFORM set_config('auth.uid.value', test_auth_user_id::TEXT, TRUE);
  
  -- Create a test profile if it doesn't exist
  INSERT INTO profiles (id, auth_user_id, country_id, full_name, email)
  VALUES (
    test_profile_id,
    test_auth_user_id,
    test_country_id,
    'Test User',
    'test@example.com'
  )
  ON CONFLICT (id) DO UPDATE
  SET auth_user_id = test_auth_user_id,
      country_id = test_country_id;
  
  -- Assign roles to the test profile
  FOREACH role_name IN ARRAY test_roles
  LOOP
    SELECT id INTO role_id FROM user_roles WHERE role_name = role_name;
    
    IF role_id IS NULL THEN
      -- Create the role if it doesn't exist
      INSERT INTO user_roles (role_name, description)
      VALUES (role_name, 'Test role')
      RETURNING id INTO role_id;
    END IF;
    
    -- Assign the role to the profile
    INSERT INTO user_profile_roles (profile_id, role_id)
    VALUES (test_profile_id, role_id)
    ON CONFLICT (profile_id, role_id) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'RLS test environment set up for user % with roles %', test_profile_id, test_roles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset the RLS test environment
CREATE OR REPLACE FUNCTION reset_rls_test()
RETURNS VOID AS $$
BEGIN
  -- Reset the auth.uid() function
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
    SELECT COALESCE(
      current_setting('request.jwt.claim.sub', TRUE),
      (current_setting('request.headers', TRUE)::json->>'x-supabase-auth-id')::UUID
    );
  $$ LANGUAGE SQL STABLE;
  
  RAISE NOTICE 'RLS test environment reset';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
