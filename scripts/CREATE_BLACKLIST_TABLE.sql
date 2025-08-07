-- =====================================================
-- Create or Update Blacklisted Borrowers Table
-- =====================================================
-- This table stores information about borrowers who have
-- defaulted on loans, as reported by lenders
-- =====================================================

-- Drop existing table if we need to recreate with new structure
-- DROP TABLE IF EXISTS public.blacklisted_borrowers CASCADE;

-- Create the blacklisted_borrowers table with all necessary fields
CREATE TABLE IF NOT EXISTS public.blacklisted_borrowers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Link to existing borrower if they're in the system
    borrower_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Lender who reported this default
    lender_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Borrower information (stored separately in case they're not in system)
    borrower_name VARCHAR(255) NOT NULL,
    borrower_email VARCHAR(255) NOT NULL,
    borrower_phone VARCHAR(50),
    
    -- Loan details
    original_loan_amount DECIMAL(15, 2) NOT NULL,
    amount_owed DECIMAL(15, 2) NOT NULL,
    loan_date DATE NOT NULL,
    due_date DATE NOT NULL,
    
    -- Default details
    reason VARCHAR(100) NOT NULL, -- no_response, refused_payment, financial_hardship, etc.
    last_contact_date DATE,
    recovery_attempts INTEGER DEFAULT 0,
    
    -- Evidence and notes
    evidence_url TEXT,
    additional_notes TEXT,
    
    -- Status tracking
    deregistered BOOLEAN DEFAULT FALSE,
    resolution_status VARCHAR(50) DEFAULT 'unresolved', -- unresolved, partial_recovery, full_recovery, written_off
    amount_recovered DECIMAL(15, 2) DEFAULT 0,
    resolution_date DATE,
    resolution_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate reports from same lender
    UNIQUE(lender_profile_id, borrower_email, loan_date)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blacklisted_borrower_email ON public.blacklisted_borrowers(borrower_email);
CREATE INDEX IF NOT EXISTS idx_blacklisted_borrower_profile ON public.blacklisted_borrowers(borrower_profile_id);
CREATE INDEX IF NOT EXISTS idx_blacklisted_lender ON public.blacklisted_borrowers(lender_profile_id);
CREATE INDEX IF NOT EXISTS idx_blacklisted_deregistered ON public.blacklisted_borrowers(deregistered);
CREATE INDEX IF NOT EXISTS idx_blacklisted_created ON public.blacklisted_borrowers(created_at DESC);

-- Add missing columns if table already exists
DO $$
BEGIN
    -- Add borrower_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' AND column_name = 'borrower_name') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN borrower_name VARCHAR(255);
    END IF;
    
    -- Add borrower_email if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' AND column_name = 'borrower_email') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN borrower_email VARCHAR(255);
    END IF;
    
    -- Add borrower_phone if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' AND column_name = 'borrower_phone') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN borrower_phone VARCHAR(50);
    END IF;
    
    -- Add original_loan_amount if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' AND column_name = 'original_loan_amount') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN original_loan_amount DECIMAL(15, 2);
    END IF;
    
    -- Add loan_date if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' AND column_name = 'loan_date') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN loan_date DATE;
    END IF;
    
    -- Add due_date if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' AND column_name = 'due_date') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN due_date DATE;
    END IF;
    
    -- Add last_contact_date if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' AND column_name = 'last_contact_date') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN last_contact_date DATE;
    END IF;
    
    -- Add recovery_attempts if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' AND column_name = 'recovery_attempts') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN recovery_attempts INTEGER DEFAULT 0;
    END IF;
    
    -- Add evidence_url if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' AND column_name = 'evidence_url') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN evidence_url TEXT;
    END IF;
    
    -- Add additional_notes if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' AND column_name = 'additional_notes') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN additional_notes TEXT;
    END IF;
    
    -- Add resolution fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' AND column_name = 'resolution_status') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN resolution_status VARCHAR(50) DEFAULT 'unresolved';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' AND column_name = 'amount_recovered') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN amount_recovered DECIMAL(15, 2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' AND column_name = 'resolution_date') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN resolution_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' AND column_name = 'resolution_notes') THEN
        ALTER TABLE public.blacklisted_borrowers ADD COLUMN resolution_notes TEXT;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.blacklisted_borrowers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Lenders can view all blacklisted borrowers" ON public.blacklisted_borrowers;
DROP POLICY IF EXISTS "Lenders can insert their own reports" ON public.blacklisted_borrowers;
DROP POLICY IF EXISTS "Lenders can update their own reports" ON public.blacklisted_borrowers;
DROP POLICY IF EXISTS "Admins can manage all reports" ON public.blacklisted_borrowers;

-- RLS Policies

-- All lenders can view blacklisted borrowers (for protection)
CREATE POLICY "Lenders can view all blacklisted borrowers" ON public.blacklisted_borrowers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'lender'
        )
    );

-- Lenders can report defaulters
CREATE POLICY "Lenders can insert their own reports" ON public.blacklisted_borrowers
    FOR INSERT WITH CHECK (
        lender_profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'lender'
        )
    );

-- Lenders can update their own reports
CREATE POLICY "Lenders can update their own reports" ON public.blacklisted_borrowers
    FOR UPDATE USING (
        lender_profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'lender'
        )
    );

-- Admins can manage all reports
CREATE POLICY "Admins can manage all reports" ON public.blacklisted_borrowers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to check if a borrower is blacklisted
CREATE OR REPLACE FUNCTION is_borrower_blacklisted(p_email VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.blacklisted_borrowers
        WHERE borrower_email = p_email
        AND deregistered = FALSE
        AND resolution_status != 'full_recovery'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get blacklist summary for a borrower
CREATE OR REPLACE FUNCTION get_borrower_blacklist_summary(p_email VARCHAR)
RETURNS TABLE (
    total_reports INTEGER,
    total_amount_owed DECIMAL,
    oldest_default_date DATE,
    reporting_lenders INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_reports,
        SUM(amount_owed) as total_amount_owed,
        MIN(due_date) as oldest_default_date,
        COUNT(DISTINCT lender_profile_id)::INTEGER as reporting_lenders
    FROM public.blacklisted_borrowers
    WHERE borrower_email = p_email
    AND deregistered = FALSE
    AND resolution_status != 'full_recovery';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.blacklisted_borrowers TO authenticated;
GRANT EXECUTE ON FUNCTION is_borrower_blacklisted TO authenticated;
GRANT EXECUTE ON FUNCTION get_borrower_blacklist_summary TO authenticated;

-- =====================================================
-- Verification
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Blacklist table setup completed!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Table: blacklisted_borrowers created/updated';
    RAISE NOTICE 'Functions: is_borrower_blacklisted, get_borrower_blacklist_summary';
    RAISE NOTICE 'RLS policies applied';
    RAISE NOTICE 'Lenders can now report defaulted borrowers!';
END $$;