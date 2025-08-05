-- =====================================================
-- Final RLS Setup for Country-Based Access Control
-- =====================================================

-- 1. Create helper functions in public schema
CREATE OR REPLACE FUNCTION public.get_user_country_id()
RETURNS UUID AS $$
    SELECT country_id 
    FROM public.profiles 
    WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'country_admin')
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_country_admin_for(p_country_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE auth_user_id = auth.uid() 
        AND role = 'country_admin'
        AND country_id = p_country_id
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_country_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_country_admin_for(UUID) TO authenticated;

-- 3. Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles - View own or same country" ON profiles;
DROP POLICY IF EXISTS "Profiles - Update own only" ON profiles;
DROP POLICY IF EXISTS "Profiles - Insert with auth" ON profiles;

-- 5. Create new policies for profiles
-- Allow users to view their own profile or profiles from same country
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    USING (
        auth_user_id = auth.uid() -- Own profile
        OR country_id = public.get_user_country_id() -- Same country
        OR public.is_admin_user() -- Admins can see all
    );

-- Allow users to update only their own profile
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Allow users to insert their own profile
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    WITH CHECK (auth_user_id = auth.uid());

-- Allow users to delete only their own profile
CREATE POLICY "profiles_delete_policy" ON profiles
    FOR DELETE
    USING (auth_user_id = auth.uid());

-- 6. Enable RLS on other tables if they exist
DO $$ 
BEGIN
    -- Enable RLS on blacklisted_borrowers if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'blacklisted_borrowers') THEN
        ALTER TABLE blacklisted_borrowers ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Blacklist - Same country only" ON blacklisted_borrowers;
        DROP POLICY IF EXISTS "Blacklist country isolation" ON blacklisted_borrowers;
        
        -- Create new policy
        EXECUTE 'CREATE POLICY "blacklist_country_policy" ON blacklisted_borrowers
            FOR ALL
            USING (
                country_id = public.get_user_country_id()
                OR public.is_admin_user()
                OR public.is_country_admin_for(country_id)
            )';
    END IF;
    
    -- Enable RLS on loan_requests if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_requests') THEN
        ALTER TABLE loan_requests ENABLE ROW LEVEL SECURITY;
        
        EXECUTE 'CREATE POLICY "loan_requests_country_policy" ON loan_requests
            FOR ALL
            USING (
                country_id = public.get_user_country_id()
                OR public.is_admin_user()
                OR public.is_country_admin_for(country_id)
            )';
    END IF;
    
    -- Enable RLS on loan_offers if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_offers') THEN
        ALTER TABLE loan_offers ENABLE ROW LEVEL SECURITY;
        
        EXECUTE 'CREATE POLICY "loan_offers_country_policy" ON loan_offers
            FOR ALL
            USING (
                country_id = public.get_user_country_id()
                OR public.is_admin_user()
                OR public.is_country_admin_for(country_id)
            )';
    END IF;
    
    -- Enable RLS on loans if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loans') THEN
        ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
        
        EXECUTE 'CREATE POLICY "loans_country_policy" ON loans
            FOR ALL
            USING (
                country_id = public.get_user_country_id()
                OR public.is_admin_user()
                OR public.is_country_admin_for(country_id)
            )';
    END IF;
    
    -- Enable RLS on payments if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
        
        EXECUTE 'CREATE POLICY "payments_country_policy" ON payments
            FOR ALL
            USING (
                country_id = public.get_user_country_id()
                OR public.is_admin_user()
                OR public.is_country_admin_for(country_id)
            )';
    END IF;
END $$;

-- 7. Create function to propagate country_id to new records
CREATE OR REPLACE FUNCTION public.set_country_id_from_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Get the user's country_id from profiles
    SELECT country_id INTO NEW.country_id
    FROM profiles
    WHERE auth_user_id = auth.uid();
    
    -- If no country found, raise an exception
    IF NEW.country_id IS NULL THEN
        RAISE EXCEPTION 'User must have a country assigned before creating records';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create triggers for auto-populating country_id
DO $$ 
BEGIN
    -- For loan_requests
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_requests') 
       AND EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'loan_requests' 
                   AND column_name = 'country_id') THEN
        DROP TRIGGER IF EXISTS set_loan_request_country ON loan_requests;
        CREATE TRIGGER set_loan_request_country
            BEFORE INSERT ON loan_requests
            FOR EACH ROW
            EXECUTE FUNCTION public.set_country_id_from_user();
    END IF;
    
    -- For loan_offers
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_offers')
       AND EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'loan_offers' 
                   AND column_name = 'country_id') THEN
        DROP TRIGGER IF EXISTS set_loan_offer_country ON loan_offers;
        CREATE TRIGGER set_loan_offer_country
            BEFORE INSERT ON loan_offers
            FOR EACH ROW
            EXECUTE FUNCTION public.set_country_id_from_user();
    END IF;
    
    -- For loans
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loans')
       AND EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'loans' 
                   AND column_name = 'country_id') THEN
        DROP TRIGGER IF EXISTS set_loan_country ON loans;
        CREATE TRIGGER set_loan_country
            BEFORE INSERT ON loans
            FOR EACH ROW
            EXECUTE FUNCTION public.set_country_id_from_user();
    END IF;
    
    -- For payments
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments')
       AND EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'payments' 
                   AND column_name = 'country_id') THEN
        DROP TRIGGER IF EXISTS set_payment_country ON payments;
        CREATE TRIGGER set_payment_country
            BEFORE INSERT ON payments
            FOR EACH ROW
            EXECUTE FUNCTION public.set_country_id_from_user();
    END IF;
END $$;

-- 9. Verify the setup
DO $$ 
DECLARE
    rls_enabled_count INTEGER;
    total_policies INTEGER;
BEGIN
    -- Count tables with RLS enabled
    SELECT COUNT(*) INTO rls_enabled_count
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
    AND c.relrowsecurity = true;
    
    -- Count total policies
    SELECT COUNT(*) INTO total_policies
    FROM pg_policies
    WHERE schemaname = 'public';
    
    RAISE NOTICE '✅ RLS Setup Complete:';
    RAISE NOTICE '   Tables with RLS enabled: %', rls_enabled_count;
    RAISE NOTICE '   Total policies created: %', total_policies;
    RAISE NOTICE '   Users will now be restricted to their country data';
END $$;