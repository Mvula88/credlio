-- =====================================================
-- FIX DEREGISTRATION REQUESTS FOREIGN KEY CONSTRAINTS
-- =====================================================
-- This script fixes the foreign key constraint names for the deregistration_requests table
-- to match what the API endpoint expects

BEGIN;

-- First, check if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'deregistration_requests') THEN
        
        -- Drop existing foreign key constraints if they exist with different names
        ALTER TABLE public.deregistration_requests 
            DROP CONSTRAINT IF EXISTS deregistration_requests_borrower_profile_id_fkey CASCADE;
        ALTER TABLE public.deregistration_requests 
            DROP CONSTRAINT IF EXISTS deregistration_requests_lender_profile_id_fkey CASCADE;
        ALTER TABLE public.deregistration_requests 
            DROP CONSTRAINT IF EXISTS deregistration_requests_blacklist_entry_id_fkey CASCADE;
        
        -- Also drop any auto-generated constraint names
        ALTER TABLE public.deregistration_requests 
            DROP CONSTRAINT IF EXISTS deregistration_requests_borrower_profile_id_fkey1 CASCADE;
        ALTER TABLE public.deregistration_requests 
            DROP CONSTRAINT IF EXISTS deregistration_requests_lender_profile_id_fkey1 CASCADE;
        ALTER TABLE public.deregistration_requests 
            DROP CONSTRAINT IF EXISTS deregistration_requests_blacklist_entry_id_fkey1 CASCADE;
        
        -- Re-add the foreign key constraints with the expected names
        ALTER TABLE public.deregistration_requests
            ADD CONSTRAINT deregistration_requests_borrower_profile_id_fkey 
            FOREIGN KEY (borrower_profile_id) 
            REFERENCES public.profiles(id) ON DELETE CASCADE;
            
        ALTER TABLE public.deregistration_requests
            ADD CONSTRAINT deregistration_requests_lender_profile_id_fkey 
            FOREIGN KEY (lender_profile_id) 
            REFERENCES public.profiles(id) ON DELETE SET NULL;
            
        ALTER TABLE public.deregistration_requests
            ADD CONSTRAINT deregistration_requests_blacklist_entry_id_fkey 
            FOREIGN KEY (blacklist_entry_id) 
            REFERENCES public.blacklisted_borrowers(id) ON DELETE CASCADE;
            
        RAISE NOTICE 'Foreign key constraints fixed successfully';
        
    ELSE
        -- Create the table if it doesn't exist
        CREATE TABLE public.deregistration_requests (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            
            -- Request details
            blacklist_entry_id UUID,
            borrower_profile_id UUID NOT NULL,
            lender_profile_id UUID,
            
            -- Payment information
            payment_amount DECIMAL(15, 2) NOT NULL,
            payment_date DATE NOT NULL,
            payment_reference VARCHAR(255),
            payment_proof_url TEXT,
            
            -- Request status
            status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
            message TEXT,
            response TEXT,
            
            -- Timestamps
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMPTZ,
            
            -- Add constraints with specific names
            CONSTRAINT deregistration_requests_borrower_profile_id_fkey 
                FOREIGN KEY (borrower_profile_id) 
                REFERENCES public.profiles(id) ON DELETE CASCADE,
            CONSTRAINT deregistration_requests_lender_profile_id_fkey 
                FOREIGN KEY (lender_profile_id) 
                REFERENCES public.profiles(id) ON DELETE SET NULL,
            CONSTRAINT deregistration_requests_blacklist_entry_id_fkey 
                FOREIGN KEY (blacklist_entry_id) 
                REFERENCES public.blacklisted_borrowers(id) ON DELETE CASCADE
        );
        
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_deregistration_requests_borrower 
            ON public.deregistration_requests(borrower_profile_id);
        CREATE INDEX IF NOT EXISTS idx_deregistration_requests_lender 
            ON public.deregistration_requests(lender_profile_id);
        CREATE INDEX IF NOT EXISTS idx_deregistration_requests_blacklist 
            ON public.deregistration_requests(blacklist_entry_id);
        CREATE INDEX IF NOT EXISTS idx_deregistration_requests_status 
            ON public.deregistration_requests(status);
        
        RAISE NOTICE 'Table created with proper foreign key constraints';
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.deregistration_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Borrowers can view their own requests" ON public.deregistration_requests;
DROP POLICY IF EXISTS "Lenders can view related requests" ON public.deregistration_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON public.deregistration_requests;
DROP POLICY IF EXISTS "Borrowers can create requests" ON public.deregistration_requests;
DROP POLICY IF EXISTS "Authorized users can update requests" ON public.deregistration_requests;

-- Create RLS policies
CREATE POLICY "Borrowers can view their own requests" ON public.deregistration_requests
    FOR SELECT
    USING (
        borrower_profile_id IN (
            SELECT id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Lenders can view related requests" ON public.deregistration_requests
    FOR SELECT
    USING (
        lender_profile_id IN (
            SELECT id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'lender'
        )
    );

CREATE POLICY "Admins can view all requests" ON public.deregistration_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Borrowers can create requests" ON public.deregistration_requests
    FOR INSERT
    WITH CHECK (
        borrower_profile_id IN (
            SELECT id FROM public.profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'borrower'
        )
    );

CREATE POLICY "Authorized users can update requests" ON public.deregistration_requests
    FOR UPDATE
    USING (
        lender_profile_id IN (
            SELECT id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Verify the constraints exist with correct names
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND table_name = 'deregistration_requests'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name IN (
        'deregistration_requests_borrower_profile_id_fkey',
        'deregistration_requests_lender_profile_id_fkey',
        'deregistration_requests_blacklist_entry_id_fkey'
    );
    
    IF constraint_count = 3 THEN
        RAISE NOTICE 'All foreign key constraints verified successfully';
    ELSE
        RAISE WARNING 'Expected 3 foreign key constraints, found %', constraint_count;
    END IF;
END $$;

COMMIT;

-- Display the constraint information
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
    AND tc.table_name = 'deregistration_requests'
    AND tc.constraint_type = 'FOREIGN KEY';