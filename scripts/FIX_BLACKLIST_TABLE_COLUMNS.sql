-- =====================================================
-- Fix Missing Columns in Blacklisted Borrowers Table
-- =====================================================
-- This script adds missing columns to the existing table
-- =====================================================

-- First, check and add missing columns to the blacklisted_borrowers table
DO $$
BEGIN
    -- Add borrower_email column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'borrower_email'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN borrower_email VARCHAR(255);
        
        -- Try to populate from existing data if possible
        UPDATE public.blacklisted_borrowers bb
        SET borrower_email = p.email
        FROM public.profiles p
        WHERE bb.borrower_profile_id = p.id
        AND bb.borrower_email IS NULL;
        
        -- Make it NOT NULL after populating (if we have data)
        IF EXISTS (SELECT 1 FROM public.blacklisted_borrowers LIMIT 1) THEN
            -- Set a default for any remaining nulls
            UPDATE public.blacklisted_borrowers 
            SET borrower_email = 'unknown@email.com' 
            WHERE borrower_email IS NULL;
        END IF;
        
        ALTER TABLE public.blacklisted_borrowers 
        ALTER COLUMN borrower_email SET NOT NULL;
    END IF;

    -- Add borrower_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'borrower_name'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN borrower_name VARCHAR(255);
        
        -- Try to populate from existing data
        UPDATE public.blacklisted_borrowers bb
        SET borrower_name = p.full_name
        FROM public.profiles p
        WHERE bb.borrower_profile_id = p.id
        AND bb.borrower_name IS NULL;
        
        -- Set default for any remaining nulls
        UPDATE public.blacklisted_borrowers 
        SET borrower_name = 'Unknown Borrower' 
        WHERE borrower_name IS NULL;
        
        ALTER TABLE public.blacklisted_borrowers 
        ALTER COLUMN borrower_name SET NOT NULL;
    END IF;

    -- Add borrower_phone column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'borrower_phone'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN borrower_phone VARCHAR(50);
        
        -- Try to populate from existing data
        UPDATE public.blacklisted_borrowers bb
        SET borrower_phone = p.phone_number
        FROM public.profiles p
        WHERE bb.borrower_profile_id = p.id
        AND bb.borrower_phone IS NULL;
    END IF;

    -- Add lender_profile_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'lender_profile_id'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN lender_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        
        -- If there's a blacklisted_by column, copy from it
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'blacklisted_borrowers' 
            AND column_name = 'blacklisted_by'
        ) THEN
            UPDATE public.blacklisted_borrowers 
            SET lender_profile_id = blacklisted_by
            WHERE lender_profile_id IS NULL;
        END IF;
    END IF;

    -- Add original_loan_amount column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'original_loan_amount'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN original_loan_amount DECIMAL(15, 2);
    END IF;

    -- Add loan_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'loan_date'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN loan_date DATE;
    END IF;

    -- Add due_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'due_date'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN due_date DATE;
    END IF;

    -- Add last_contact_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'last_contact_date'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN last_contact_date DATE;
    END IF;

    -- Add recovery_attempts column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'recovery_attempts'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN recovery_attempts INTEGER DEFAULT 0;
    END IF;

    -- Add evidence_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'evidence_url'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN evidence_url TEXT;
    END IF;

    -- Add additional_notes column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'additional_notes'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN additional_notes TEXT;
    END IF;

    -- Add auto_generated column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'auto_generated'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN auto_generated BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add detection_reason column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'detection_reason'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN detection_reason VARCHAR(100);
    END IF;

    -- Add risk_score column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'risk_score'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN risk_score INTEGER DEFAULT 50;
    END IF;

    -- Add resolution_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'resolution_status'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN resolution_status VARCHAR(50) DEFAULT 'unresolved';
    END IF;

    -- Add amount_recovered column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'amount_recovered'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN amount_recovered DECIMAL(15, 2) DEFAULT 0;
    END IF;

    -- Add resolution_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'resolution_date'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN resolution_date DATE;
    END IF;

    -- Add resolution_notes column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklisted_borrowers' 
        AND column_name = 'resolution_notes'
    ) THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN resolution_notes TEXT;
    END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_blacklisted_borrower_email 
    ON public.blacklisted_borrowers(borrower_email);

CREATE INDEX IF NOT EXISTS idx_blacklisted_auto_generated 
    ON public.blacklisted_borrowers(auto_generated);

CREATE INDEX IF NOT EXISTS idx_blacklisted_risk_score 
    ON public.blacklisted_borrowers(risk_score);

CREATE INDEX IF NOT EXISTS idx_blacklisted_resolution_status 
    ON public.blacklisted_borrowers(resolution_status);

-- =====================================================
-- Alternative: Check if we need to use 'blacklists' table instead
-- =====================================================
-- Some systems might use 'blacklists' instead of 'blacklisted_borrowers'

DO $$
BEGIN
    -- Check if blacklists table exists and add columns there too
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blacklists'
    ) THEN
        -- Add borrower_email to blacklists table if needed
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'blacklists' 
            AND column_name = 'borrower_email'
        ) THEN
            ALTER TABLE public.blacklists 
            ADD COLUMN borrower_email VARCHAR(255);
            
            -- Try to populate from borrower relationship
            UPDATE public.blacklists bl
            SET borrower_email = p.email
            FROM public.profiles p
            WHERE bl.borrower_id = p.id
            AND bl.borrower_email IS NULL;
        END IF;

        -- Add borrower_name to blacklists table if needed
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'blacklists' 
            AND column_name = 'borrower_name'
        ) THEN
            ALTER TABLE public.blacklists 
            ADD COLUMN borrower_name VARCHAR(255);
            
            UPDATE public.blacklists bl
            SET borrower_name = p.full_name
            FROM public.profiles p
            WHERE bl.borrower_id = p.id
            AND bl.borrower_name IS NULL;
        END IF;
    END IF;
END $$;

-- =====================================================
-- Create a view that works with either table structure
-- =====================================================
-- First check which tables and columns exist
DO $$
DECLARE
    v_has_blacklisted_borrowers BOOLEAN;
    v_has_blacklists BOOLEAN;
BEGIN
    -- Check if tables exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'blacklisted_borrowers'
    ) INTO v_has_blacklisted_borrowers;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'blacklists'
    ) INTO v_has_blacklists;
    
    -- Drop existing view if it exists
    DROP VIEW IF EXISTS public.risky_borrowers_view CASCADE;
    
    -- Create view based on what exists
    IF v_has_blacklisted_borrowers AND v_has_blacklists THEN
        -- Both tables exist, create full view
        EXECUTE '
        CREATE VIEW public.risky_borrowers_view AS
        SELECT 
            COALESCE(bb.id, bl.id) as id,
            COALESCE(bb.borrower_profile_id, bl.borrower_id) as borrower_id,
            COALESCE(bb.lender_profile_id, bl.blacklisted_by) as lender_id,
            COALESCE(bb.borrower_name, bl.borrower_name, p.full_name) as borrower_name,
            COALESCE(bb.borrower_email, bl.borrower_email, p.email) as borrower_email,
            COALESCE(bb.borrower_phone, p.phone_number) as borrower_phone,
            COALESCE(bb.reason, bl.reason) as reason,
            COALESCE(bb.amount_owed, bl.total_amount_defaulted) as amount_owed,
            COALESCE(bb.auto_generated, bl.auto_generated, false) as auto_generated,
            COALESCE(bb.risk_score, 50) as risk_score,
            COALESCE(bb.deregistered, false) as deregistered,
            COALESCE(bb.created_at, bl.created_at) as created_at
        FROM public.blacklisted_borrowers bb
        FULL OUTER JOIN public.blacklists bl ON bb.borrower_profile_id = bl.borrower_id
        LEFT JOIN public.profiles p ON COALESCE(bb.borrower_profile_id, bl.borrower_id) = p.id
        WHERE COALESCE(bb.deregistered, false) = false
            AND (bl.status IS NULL OR bl.status = ''active'')';
    ELSIF v_has_blacklisted_borrowers THEN
        -- Only blacklisted_borrowers exists
        EXECUTE '
        CREATE VIEW public.risky_borrowers_view AS
        SELECT 
            bb.id,
            bb.borrower_profile_id as borrower_id,
            bb.lender_profile_id as lender_id,
            COALESCE(bb.borrower_name, p.full_name) as borrower_name,
            COALESCE(bb.borrower_email, p.email) as borrower_email,
            COALESCE(bb.borrower_phone, p.phone_number) as borrower_phone,
            bb.reason,
            bb.amount_owed,
            COALESCE(bb.auto_generated, false) as auto_generated,
            COALESCE(bb.risk_score, 50) as risk_score,
            COALESCE(bb.deregistered, false) as deregistered,
            bb.created_at
        FROM public.blacklisted_borrowers bb
        LEFT JOIN public.profiles p ON bb.borrower_profile_id = p.id
        WHERE COALESCE(bb.deregistered, false) = false';
    ELSIF v_has_blacklists THEN
        -- Only blacklists exists
        EXECUTE '
        CREATE VIEW public.risky_borrowers_view AS
        SELECT 
            bl.id,
            bl.borrower_id,
            bl.blacklisted_by as lender_id,
            COALESCE(bl.borrower_name, p.full_name) as borrower_name,
            COALESCE(bl.borrower_email, p.email) as borrower_email,
            p.phone_number as borrower_phone,
            bl.reason,
            bl.total_amount_defaulted as amount_owed,
            COALESCE(bl.auto_generated, false) as auto_generated,
            50 as risk_score,
            false as deregistered,
            bl.created_at
        FROM public.blacklists bl
        LEFT JOIN public.profiles p ON bl.borrower_id = p.id
        WHERE bl.status = ''active''';
    END IF;
END $$;

-- Grant permissions on the view
GRANT SELECT ON public.risky_borrowers_view TO authenticated;

-- =====================================================
-- Create helper functions that work with the view
-- =====================================================

-- Updated function to check if borrower is blacklisted using email
CREATE OR REPLACE FUNCTION is_borrower_blacklisted(p_email VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.risky_borrowers_view
        WHERE borrower_email = p_email
        AND deregistered = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated function to get blacklist summary
CREATE OR REPLACE FUNCTION get_borrower_blacklist_summary(p_email VARCHAR)
RETURNS TABLE (
    total_reports INTEGER,
    total_amount_owed DECIMAL,
    oldest_default_date TIMESTAMP WITH TIME ZONE,
    reporting_lenders INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_reports,
        SUM(amount_owed) as total_amount_owed,
        MIN(created_at) as oldest_default_date,
        COUNT(DISTINCT lender_id)::INTEGER as reporting_lenders
    FROM public.risky_borrowers_view
    WHERE borrower_email = p_email
    AND deregistered = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Verification
-- =====================================================
DO $$
DECLARE
    v_table_name TEXT;
    v_has_email BOOLEAN;
BEGIN
    -- Check which table exists and has the email column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blacklisted_borrowers') THEN
        v_table_name := 'blacklisted_borrowers';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blacklists') THEN
        v_table_name := 'blacklists';
    ELSE
        v_table_name := 'not found';
    END IF;
    
    -- Check if email column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = v_table_name 
        AND column_name = 'borrower_email'
    ) INTO v_has_email;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Blacklist Table Column Fix Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Primary table: %', v_table_name;
    RAISE NOTICE 'Has borrower_email column: %', v_has_email;
    RAISE NOTICE 'View created: risky_borrowers_view';
    RAISE NOTICE 'Functions updated to use the view';
    RAISE NOTICE '========================================';
END $$;