
-- =====================================================
-- CHECK AND FIX BORROWER_RISK_HISTORY TABLE
-- =====================================================

-- First, check if the table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'borrower_risk_history'
) as table_exists;

-- Check the actual columns in the table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'borrower_risk_history'
ORDER BY ordinal_position;

-- Check existing policies on the table
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
    pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
FROM pg_policy pol
JOIN pg_class c ON pol.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND c.relname = 'borrower_risk_history';

-- Now let's create the correct table if it doesn't exist or is missing columns
DO $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'borrower_risk_history'
    ) THEN
        -- Create the table with proper structure
        CREATE TABLE borrower_risk_history (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            borrower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
            lender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
            marked_risky_at TIMESTAMPTZ DEFAULT NOW(),
            reason TEXT,
            improved_at TIMESTAMPTZ,
            improvement_reason TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_borrower_risk_history_borrower ON borrower_risk_history(borrower_id);
        CREATE INDEX idx_borrower_risk_history_lender ON borrower_risk_history(lender_id);
        
        -- Enable RLS
        ALTER TABLE borrower_risk_history ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Created borrower_risk_history table';
    ELSE
        RAISE NOTICE 'Table borrower_risk_history already exists';
    END IF;
END $$;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Lenders can add risk history" ON borrower_risk_history;
DROP POLICY IF EXISTS "Lenders can update own risk reports" ON borrower_risk_history;
DROP POLICY IF EXISTS "Users can view risk history" ON borrower_risk_history;

-- Create correct policies based on actual table structure
-- Note: We'll use lender_id if it exists, otherwise we'll need to adjust

-- Check if lender_id column exists
DO $$
DECLARE
    has_lender_id BOOLEAN;
    has_marked_risky_by BOOLEAN;
    column_to_use TEXT;
BEGIN
    -- Check which column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'borrower_risk_history' 
        AND column_name = 'lender_id'
    ) INTO has_lender_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'borrower_risk_history' 
        AND column_name = 'marked_risky_by'
    ) INTO has_marked_risky_by;
    
    -- Determine which column to use
    IF has_lender_id THEN
        column_to_use := 'lender_id';
    ELSIF has_marked_risky_by THEN
        column_to_use := 'marked_risky_by';
    ELSE
        -- If neither column exists, we'll add lender_id
        ALTER TABLE borrower_risk_history ADD COLUMN IF NOT EXISTS lender_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
        column_to_use := 'lender_id';
    END IF;
    
    -- Create policies using dynamic SQL
    IF column_to_use = 'lender_id' THEN
        -- INSERT policy
        EXECUTE 'CREATE POLICY "Lenders can add risk history" ON borrower_risk_history
            FOR INSERT WITH CHECK (
                lender_id IN (
                    SELECT id FROM profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND role = ''lender''
                )
            )';
            
        -- UPDATE policy
        EXECUTE 'CREATE POLICY "Lenders can update own risk reports" ON borrower_risk_history
            FOR UPDATE USING (
                lender_id IN (
                    SELECT id FROM profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND role = ''lender''
                )
            )';
    ELSE
        -- Use marked_risky_by column
        EXECUTE 'CREATE POLICY "Lenders can add risk history" ON borrower_risk_history
            FOR INSERT WITH CHECK (
                marked_risky_by IN (
                    SELECT id FROM profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND role = ''lender''
                )
            )';
            
        -- UPDATE policy
        EXECUTE 'CREATE POLICY "Lenders can update own risk reports" ON borrower_risk_history
            FOR UPDATE USING (
                marked_risky_by IN (
                    SELECT id FROM profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND role = ''lender''
                )
            )';
    END IF;
    
    RAISE NOTICE 'Created policies using column: %', column_to_use;
END $$;

-- Create SELECT policy (works regardless of column names)
CREATE POLICY "Users can view risk history" ON borrower_risk_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()::uuid
        )
    );

-- Final verification - show table structure and policies
SELECT 'Final Table Structure:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'borrower_risk_history'
ORDER BY ordinal_position;

SELECT 'Final Policies:' as info;
SELECT polname as policy_name, polcmd as command
FROM pg_policy pol
JOIN pg_class c ON pol.polrelid = c.oid
WHERE c.relname = 'borrower_risk_history';