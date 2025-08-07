-- =====================================================
-- Simple Fix for Blacklist Table Columns
-- =====================================================
-- This script safely adds missing columns one by one
-- Run this to fix column errors
-- =====================================================

-- First, let's check what table you have and display it
DO $$
DECLARE
    v_table_name TEXT;
BEGIN
    -- Check which table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blacklisted_borrowers' AND table_schema = 'public') THEN
        v_table_name := 'blacklisted_borrowers';
        RAISE NOTICE 'Found table: blacklisted_borrowers';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blacklists' AND table_schema = 'public') THEN
        v_table_name := 'blacklists';
        RAISE NOTICE 'Found table: blacklists';
    ELSE
        RAISE NOTICE 'No blacklist table found - creating new one';
        v_table_name := 'blacklisted_borrowers';
    END IF;
END $$;

-- Create the table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS public.blacklisted_borrowers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    borrower_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    lender_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    borrower_name VARCHAR(255),
    borrower_email VARCHAR(255),
    borrower_phone VARCHAR(50),
    reason VARCHAR(100),
    amount_owed DECIMAL(15, 2),
    original_loan_amount DECIMAL(15, 2),
    loan_date DATE,
    due_date DATE,
    last_contact_date DATE,
    recovery_attempts INTEGER DEFAULT 0,
    evidence_url TEXT,
    additional_notes TEXT,
    deregistered BOOLEAN DEFAULT FALSE,
    resolution_status VARCHAR(50) DEFAULT 'unresolved',
    amount_recovered DECIMAL(15, 2) DEFAULT 0,
    resolution_date DATE,
    resolution_notes TEXT,
    auto_generated BOOLEAN DEFAULT FALSE,
    detection_reason VARCHAR(100),
    risk_score INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Now add columns to blacklisted_borrowers if they don't exist
DO $$
BEGIN
    -- List of columns to check and add
    -- borrower_profile_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blacklisted_borrowers' AND column_name = 'borrower_profile_id') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN borrower_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added column: borrower_profile_id';
    END IF;
    
    -- lender_profile_id (this was missing and causing the error)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blacklisted_borrowers' AND column_name = 'lender_profile_id') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN lender_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added column: lender_profile_id';
    END IF;
    
    -- borrower_email (this was missing and causing the error)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blacklisted_borrowers' AND column_name = 'borrower_email') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN borrower_email VARCHAR(255);
        RAISE NOTICE 'Added column: borrower_email';
    END IF;
    
    -- borrower_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blacklisted_borrowers' AND column_name = 'borrower_name') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN borrower_name VARCHAR(255);
        RAISE NOTICE 'Added column: borrower_name';
    END IF;
    
    -- borrower_phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blacklisted_borrowers' AND column_name = 'borrower_phone') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN borrower_phone VARCHAR(50);
        RAISE NOTICE 'Added column: borrower_phone';
    END IF;
    
    -- amount_owed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blacklisted_borrowers' AND column_name = 'amount_owed') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN amount_owed DECIMAL(15, 2);
        RAISE NOTICE 'Added column: amount_owed';
    END IF;
    
    -- Other important columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blacklisted_borrowers' AND column_name = 'reason') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN reason VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blacklisted_borrowers' AND column_name = 'auto_generated') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN auto_generated BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blacklisted_borrowers' AND column_name = 'risk_score') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN risk_score INTEGER DEFAULT 50;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blacklisted_borrowers' AND column_name = 'deregistered') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN deregistered BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Also check and fix the blacklists table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blacklists' AND table_schema = 'public') THEN
        -- Add missing columns to blacklists table
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blacklists' AND column_name = 'borrower_email') THEN
            ALTER TABLE public.blacklists ADD COLUMN borrower_email VARCHAR(255);
            RAISE NOTICE 'Added borrower_email to blacklists table';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blacklists' AND column_name = 'borrower_name') THEN
            ALTER TABLE public.blacklists ADD COLUMN borrower_name VARCHAR(255);
            RAISE NOTICE 'Added borrower_name to blacklists table';
        END IF;
    END IF;
END $$;

-- Populate missing data from profiles where possible
UPDATE public.blacklisted_borrowers bb
SET 
    borrower_email = COALESCE(bb.borrower_email, p.email),
    borrower_name = COALESCE(bb.borrower_name, p.full_name),
    borrower_phone = COALESCE(bb.borrower_phone, p.phone_number)
FROM public.profiles p
WHERE bb.borrower_profile_id = p.id
    AND (bb.borrower_email IS NULL OR bb.borrower_name IS NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blacklisted_borrower_email ON public.blacklisted_borrowers(borrower_email);
CREATE INDEX IF NOT EXISTS idx_blacklisted_lender ON public.blacklisted_borrowers(lender_profile_id);
CREATE INDEX IF NOT EXISTS idx_blacklisted_borrower ON public.blacklisted_borrowers(borrower_profile_id);
CREATE INDEX IF NOT EXISTS idx_blacklisted_deregistered ON public.blacklisted_borrowers(deregistered);

-- Enable RLS
ALTER TABLE public.blacklisted_borrowers ENABLE ROW LEVEL SECURITY;

-- Create basic policies if they don't exist
DO $$
BEGIN
    -- Drop existing policies first
    DROP POLICY IF EXISTS "Lenders can view all blacklisted borrowers" ON public.blacklisted_borrowers;
    DROP POLICY IF EXISTS "Lenders can insert their own reports" ON public.blacklisted_borrowers;
    
    -- Create new policies
    CREATE POLICY "Lenders can view all blacklisted borrowers" 
    ON public.blacklisted_borrowers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('lender', 'admin', 'super_admin')
        )
    );
    
    CREATE POLICY "Lenders can insert their own reports" 
    ON public.blacklisted_borrowers
    FOR INSERT WITH CHECK (
        lender_profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'lender'
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Policies may already exist or there was an error: %', SQLERRM;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.blacklisted_borrowers TO authenticated;

-- Final check - list all columns in the table
DO $$
DECLARE
    v_columns TEXT;
BEGIN
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO v_columns
    FROM information_schema.columns
    WHERE table_name = 'blacklisted_borrowers'
    AND table_schema = 'public';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Fix Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Columns in blacklisted_borrowers table:';
    RAISE NOTICE '%', v_columns;
    RAISE NOTICE '========================================';
END $$;