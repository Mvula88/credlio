-- =====================================================
-- Country-Based Row Level Security (RLS) - Public Schema Version
-- Ensures users can only access data from their country
-- =====================================================

-- 1. Helper function to get current user's country_id (in public schema)
CREATE OR REPLACE FUNCTION public.user_country_id()
RETURNS UUID AS $$
    SELECT country_id 
    FROM public.profiles 
    WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Helper function to check if user is admin (in public schema)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'country_admin')
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Helper function to check if user is country admin for specific country (in public schema)
CREATE OR REPLACE FUNCTION public.is_country_admin(p_country_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE auth_user_id = auth.uid() 
        AND role = 'country_admin'
        AND country_id = p_country_id
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Enable RLS on all relevant tables (only for existing tables)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_borrowers ENABLE ROW LEVEL SECURITY;

-- Also enable for these tables if they exist
DO $$ 
BEGIN
    -- Check and enable RLS for each table if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loans') THEN
        ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_requests') THEN
        ALTER TABLE loan_requests ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_offers') THEN
        ALTER TABLE loan_offers ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 5. Profiles table policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles country isolation" ON profiles;

-- Create new country-based policies for profiles
CREATE POLICY "Profiles - View own or same country" ON profiles
    FOR SELECT
    USING (
        auth_user_id = auth.uid() -- Own profile
        OR country_id = public.user_country_id() -- Same country
        OR public.is_admin() -- Admins can see all
    );

CREATE POLICY "Profiles - Update own only" ON profiles
    FOR UPDATE
    USING (auth_user_id = auth.uid());

CREATE POLICY "Profiles - Insert with auth" ON profiles
    FOR INSERT
    WITH CHECK (auth_user_id = auth.uid());

-- 6. Blacklisted borrowers policies
DROP POLICY IF EXISTS "Blacklist country isolation" ON blacklisted_borrowers;

CREATE POLICY "Blacklist - Same country only" ON blacklisted_borrowers
    FOR ALL
    USING (
        country_id = public.user_country_id()
        OR public.is_admin()
        OR public.is_country_admin(country_id)
    );

-- 7. Create policies for loan-related tables if they exist
DO $$ 
BEGIN
    -- Loan requests
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_requests') THEN
        DROP POLICY IF EXISTS "Loan requests country isolation" ON loan_requests;
        
        EXECUTE 'CREATE POLICY "Loan requests - Country isolation" ON loan_requests
            FOR ALL
            USING (
                country_id = public.user_country_id()
                OR public.is_admin()
                OR public.is_country_admin(country_id)
            )';
    END IF;
    
    -- Loan offers
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_offers') THEN
        DROP POLICY IF EXISTS "Loan offers country isolation" ON loan_offers;
        
        EXECUTE 'CREATE POLICY "Loan offers - Country isolation" ON loan_offers
            FOR ALL
            USING (
                country_id = public.user_country_id()
                OR public.is_admin()
                OR public.is_country_admin(country_id)
            )';
    END IF;
    
    -- Loans
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loans') THEN
        DROP POLICY IF EXISTS "Loans country isolation" ON loans;
        
        EXECUTE 'CREATE POLICY "Loans - Country isolation" ON loans
            FOR ALL
            USING (
                country_id = public.user_country_id()
                OR public.is_admin()
                OR public.is_country_admin(country_id)
            )';
    END IF;
    
    -- Payments
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        DROP POLICY IF EXISTS "Payments country isolation" ON payments;
        
        EXECUTE 'CREATE POLICY "Payments - Country isolation" ON payments
            FOR ALL
            USING (
                country_id = public.user_country_id()
                OR public.is_admin()
                OR public.is_country_admin(country_id)
            )';
    END IF;
END $$;

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.user_country_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_country_admin(UUID) TO authenticated;

-- 9. Create a function to propagate country_id when creating related records
CREATE OR REPLACE FUNCTION public.propagate_user_country()
RETURNS TRIGGER AS $$
BEGIN
    -- Get the user's country_id from profiles
    SELECT country_id INTO NEW.country_id
    FROM profiles
    WHERE auth_user_id = auth.uid();
    
    -- If no country found, prevent insertion
    IF NEW.country_id IS NULL THEN
        RAISE EXCEPTION 'User must have a country assigned';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create triggers to auto-populate country_id
DO $$ 
BEGIN
    -- For loan_requests
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_requests') THEN
        DROP TRIGGER IF EXISTS set_country_id ON loan_requests;
        CREATE TRIGGER set_country_id
            BEFORE INSERT ON loan_requests
            FOR EACH ROW
            EXECUTE FUNCTION public.propagate_user_country();
    END IF;
    
    -- For loan_offers
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_offers') THEN
        DROP TRIGGER IF EXISTS set_country_id ON loan_offers;
        CREATE TRIGGER set_country_id
            BEFORE INSERT ON loan_offers
            FOR EACH ROW
            EXECUTE FUNCTION public.propagate_user_country();
    END IF;
    
    -- For loans
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loans') THEN
        DROP TRIGGER IF EXISTS set_country_id ON loans;
        CREATE TRIGGER set_country_id
            BEFORE INSERT ON loans
            FOR EACH ROW
            EXECUTE FUNCTION public.propagate_user_country();
    END IF;
    
    -- For payments
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        DROP TRIGGER IF EXISTS set_country_id ON payments;
        CREATE TRIGGER set_country_id
            BEFORE INSERT ON payments
            FOR EACH ROW
            EXECUTE FUNCTION public.propagate_user_country();
    END IF;
END $$;

-- Final message
DO $$ 
BEGIN
    RAISE NOTICE 'Country-based RLS setup complete. All users will now be restricted to their country data.';
END $$;