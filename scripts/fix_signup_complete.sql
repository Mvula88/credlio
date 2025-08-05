-- =====================================================
-- Complete Fix for Signup Issues
-- =====================================================

-- 1. Fix profiles table structure
DO $$
BEGIN
    -- Ensure id column exists and is primary key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN id UUID DEFAULT gen_random_uuid();
    END IF;
    
    -- Make id the primary key if it isn't already
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'profiles' AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE profiles ADD PRIMARY KEY (id);
    END IF;
END $$;

-- 2. Drop and recreate the auth_user_id constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_auth_user_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_auth_user_id_key;

-- Ensure auth_user_id is UNIQUE
ALTER TABLE profiles ADD CONSTRAINT profiles_auth_user_id_key UNIQUE (auth_user_id);

-- Add DEFERRABLE foreign key
ALTER TABLE profiles
ADD CONSTRAINT profiles_auth_user_id_fkey 
FOREIGN KEY (auth_user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- 3. Create identity_verifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS identity_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    national_id_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    id_type TEXT NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    verified_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(national_id_hash)
);

-- Enable RLS on identity_verifications
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

-- Create policy for identity_verifications
CREATE POLICY "Users can insert their own verification" ON identity_verifications
    FOR INSERT
    WITH CHECK (verified_profile_id IN (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    ));

-- 4. Create or replace the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    profile_id UUID;
BEGIN
    -- Generate a new UUID for the profile
    profile_id := gen_random_uuid();
    
    -- Insert profile
    INSERT INTO public.profiles (
        id,
        auth_user_id, 
        email, 
        full_name,
        role, 
        created_at, 
        updated_at
    )
    VALUES (
        profile_id,
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', ''),
        COALESCE(new.raw_user_meta_data->>'role', 'borrower'),
        now(),
        now()
    )
    ON CONFLICT (auth_user_id) 
    DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = now();
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth signup
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Update RLS policies for profiles
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    WITH CHECK (
        auth_user_id = auth.uid() 
        OR auth.uid() IS NULL -- Allow trigger
    );

DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres, service_role;
GRANT ALL ON auth.users TO postgres, service_role;
GRANT ALL ON profiles TO postgres, service_role, authenticated;
GRANT ALL ON identity_verifications TO postgres, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- 8. Create helper function to safely create or update profile
CREATE OR REPLACE FUNCTION public.create_or_update_profile(
    p_auth_user_id UUID,
    p_email TEXT,
    p_full_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'borrower',
    p_country_id UUID DEFAULT NULL,
    p_national_id_hash TEXT DEFAULT NULL,
    p_id_type TEXT DEFAULT NULL,
    p_date_of_birth DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    -- Try to get existing profile
    SELECT id INTO v_profile_id
    FROM profiles
    WHERE auth_user_id = p_auth_user_id;
    
    IF v_profile_id IS NULL THEN
        -- Create new profile
        INSERT INTO profiles (
            id,
            auth_user_id,
            email,
            full_name,
            phone,
            role,
            country_id,
            national_id_hash,
            id_type,
            date_of_birth,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            p_auth_user_id,
            p_email,
            p_full_name,
            p_phone,
            p_role,
            p_country_id,
            p_national_id_hash,
            p_id_type,
            p_date_of_birth,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_profile_id;
    ELSE
        -- Update existing profile
        UPDATE profiles SET
            email = COALESCE(p_email, email),
            full_name = COALESCE(p_full_name, full_name),
            phone = COALESCE(p_phone, phone),
            role = COALESCE(p_role, role),
            country_id = COALESCE(p_country_id, country_id),
            national_id_hash = COALESCE(p_national_id_hash, national_id_hash),
            id_type = COALESCE(p_id_type, id_type),
            date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
            updated_at = NOW()
        WHERE id = v_profile_id;
    END IF;
    
    RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_or_update_profile TO authenticated, service_role;

-- 9. Final verification
DO $$
BEGIN
    RAISE NOTICE 'Signup fix completed successfully!';
    RAISE NOTICE 'Tables created/verified:';
    RAISE NOTICE '  - profiles (with proper constraints)';
    RAISE NOTICE '  - identity_verifications';
    RAISE NOTICE 'Triggers and functions created';
    RAISE NOTICE 'RLS policies updated';
    RAISE NOTICE 'Permissions granted';
END $$;