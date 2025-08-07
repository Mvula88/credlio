-- =====================================================
-- COMPLETE LOAN AGREEMENTS SETUP
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Create loan agreements table
CREATE TABLE IF NOT EXISTS public.loan_agreements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Related entities
    loan_request_id UUID REFERENCES public.loan_requests(id) ON DELETE CASCADE,
    lender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    borrower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Loan terms
    loan_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    loan_term INTEGER NOT NULL,
    repayment_frequency VARCHAR(20) NOT NULL,
    
    -- Additional terms
    collateral_description TEXT,
    additional_terms TEXT,
    late_payment_penalty DECIMAL(5,2) DEFAULT 5.0,
    default_grace_period INTEGER DEFAULT 7,
    
    -- Agreement status and tracking
    agreement_status VARCHAR(20) DEFAULT 'generated',
    agreement_number VARCHAR(50) UNIQUE DEFAULT ('LA-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8))),
    
    -- File storage
    agreement_file_path TEXT,
    agreement_file_hash VARCHAR(64),
    
    -- Borrower signature tracking
    borrower_signed BOOLEAN DEFAULT FALSE,
    borrower_signature_date TIMESTAMP WITH TIME ZONE,
    borrower_signature_ip VARCHAR(45),
    borrower_full_name VARCHAR(255),
    borrower_id_number VARCHAR(50),
    borrower_phone_number VARCHAR(20),
    
    -- Digital signature verification
    signature_hash VARCHAR(128),
    signature_verified BOOLEAN DEFAULT FALSE,
    
    -- Legal and compliance
    terms_version VARCHAR(10) DEFAULT '1.0',
    governing_law VARCHAR(100),
    dispute_resolution_method VARCHAR(50) DEFAULT 'court_arbitration',
    
    -- Timestamps
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_to_borrower_at TIMESTAMP WITH TIME ZONE,
    signed_at TIMESTAMP WITH TIME ZONE,
    activated_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_agreement_status CHECK (agreement_status IN ('generated', 'sent', 'signed', 'active', 'completed', 'defaulted', 'cancelled')),
    CONSTRAINT valid_repayment_frequency CHECK (repayment_frequency IN ('daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly')),
    CONSTRAINT positive_loan_amount CHECK (loan_amount > 0),
    CONSTRAINT valid_interest_rate CHECK (interest_rate >= 0 AND interest_rate <= 100),
    CONSTRAINT valid_loan_term CHECK (loan_term > 0)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_loan_agreements_loan_request ON public.loan_agreements(loan_request_id);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_lender ON public.loan_agreements(lender_id);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_borrower ON public.loan_agreements(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_status ON public.loan_agreements(agreement_status);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_number ON public.loan_agreements(agreement_number);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_generated_at ON public.loan_agreements(generated_at);

-- Step 3: Enable RLS
ALTER TABLE public.loan_agreements ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist
DROP POLICY IF EXISTS "lenders_manage_own_agreements" ON public.loan_agreements;
DROP POLICY IF EXISTS "borrowers_view_own_agreements" ON public.loan_agreements;
DROP POLICY IF EXISTS "borrowers_sign_agreements" ON public.loan_agreements;
DROP POLICY IF EXISTS "admins_view_all_agreements" ON public.loan_agreements;

-- Step 5: Create RLS policies
CREATE POLICY "lenders_manage_own_agreements" ON public.loan_agreements
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.profiles WHERE id = lender_id
        )
    );

CREATE POLICY "borrowers_view_own_agreements" ON public.loan_agreements
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.profiles WHERE id = borrower_id
        )
    );

CREATE POLICY "borrowers_sign_agreements" ON public.loan_agreements
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.profiles WHERE id = borrower_id
        )
    );

CREATE POLICY "admins_view_all_agreements" ON public.loan_agreements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'country_admin')
        )
    );

-- Step 6: Create agreement audit log table
CREATE TABLE IF NOT EXISTS public.agreement_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Related agreement
    agreement_id UUID REFERENCES public.loan_agreements(id) ON DELETE CASCADE,
    
    -- Action details
    action VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- User who performed the action
    user_id UUID REFERENCES public.profiles(id),
    user_role VARCHAR(20) NOT NULL,
    
    -- Technical details
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Signature-specific data
    signature_hash VARCHAR(128),
    borrower_info JSONB,
    
    -- Additional metadata
    metadata JSONB,
    
    -- Timestamp
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_action CHECK (action IN (
        'generated', 'sent', 'viewed', 'signed', 'activated', 
        'modified', 'cancelled', 'defaulted', 'completed', 
        'status_changed_to_generated', 'status_changed_to_sent',
        'status_changed_to_signed', 'status_changed_to_active',
        'status_changed_to_completed', 'status_changed_to_defaulted',
        'status_changed_to_cancelled'
    )),
    CONSTRAINT valid_user_role CHECK (user_role IN ('lender', 'borrower', 'admin', 'super_admin', 'country_admin', 'system'))
);

-- Step 7: Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_agreement_audit_agreement ON public.agreement_audit_log(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_audit_user ON public.agreement_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_agreement_audit_action ON public.agreement_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_agreement_audit_timestamp ON public.agreement_audit_log(timestamp);

-- Step 8: Enable RLS for audit log
ALTER TABLE public.agreement_audit_log ENABLE ROW LEVEL SECURITY;

-- Step 9: Drop existing audit log policies if they exist
DROP POLICY IF EXISTS "users_view_own_agreement_logs" ON public.agreement_audit_log;
DROP POLICY IF EXISTS "admins_view_all_logs" ON public.agreement_audit_log;
DROP POLICY IF EXISTS "system_insert_logs" ON public.agreement_audit_log;

-- Step 10: Create audit log policies
CREATE POLICY "users_view_own_agreement_logs" ON public.agreement_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.loan_agreements la
            WHERE la.id = agreement_id
            AND (
                la.lender_id IN (
                    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
                )
                OR la.borrower_id IN (
                    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "admins_view_all_logs" ON public.agreement_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'country_admin')
        )
    );

CREATE POLICY "system_insert_logs" ON public.agreement_audit_log
    FOR INSERT WITH CHECK (true);

-- Step 11: Grant permissions
GRANT ALL ON public.loan_agreements TO authenticated;
GRANT SELECT, INSERT ON public.agreement_audit_log TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 12: Create function to generate agreement number
CREATE OR REPLACE FUNCTION public.generate_agreement_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.agreement_number IS NULL OR NEW.agreement_number = '' THEN
        NEW.agreement_number := 'LA-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Create trigger for agreement number generation
DROP TRIGGER IF EXISTS trigger_generate_agreement_number ON public.loan_agreements;
CREATE TRIGGER trigger_generate_agreement_number
    BEFORE INSERT ON public.loan_agreements
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_agreement_number();

-- Step 14: Create function to update timestamp
CREATE OR REPLACE FUNCTION public.update_agreement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 15: Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_agreement_timestamp ON public.loan_agreements;
CREATE TRIGGER trigger_update_agreement_timestamp
    BEFORE UPDATE ON public.loan_agreements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_agreement_timestamp();

-- Step 16: Create function to log agreement generation
CREATE OR REPLACE FUNCTION public.log_agreement_generation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.agreement_audit_log (
        agreement_id,
        action,
        description,
        user_id,
        user_role,
        metadata
    ) VALUES (
        NEW.id,
        'generated',
        'Loan agreement generated',
        NEW.lender_id,
        'lender',
        jsonb_build_object(
            'loan_amount', NEW.loan_amount,
            'interest_rate', NEW.interest_rate,
            'loan_term', NEW.loan_term,
            'generated_at', NEW.generated_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 17: Create trigger for agreement generation logging
DROP TRIGGER IF EXISTS trigger_log_agreement_generation ON public.loan_agreements;
CREATE TRIGGER trigger_log_agreement_generation
    AFTER INSERT ON public.loan_agreements
    FOR EACH ROW
    EXECUTE FUNCTION public.log_agreement_generation();

-- Step 18: Create function to log agreement status changes
CREATE OR REPLACE FUNCTION public.log_agreement_status_change()
RETURNS TRIGGER AS $$
DECLARE
    action_type VARCHAR(50);
    profile_id UUID;
    user_role_val VARCHAR(20);
BEGIN
    -- Determine the action type based on status change
    IF NEW.agreement_status != OLD.agreement_status THEN
        action_type := 'status_changed_to_' || NEW.agreement_status;
        
        -- Get the current user's profile (if available)
        BEGIN
            SELECT p.id, p.role INTO profile_id, user_role_val
            FROM public.profiles p
            WHERE p.auth_user_id = auth.uid()
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            profile_id := NULL;
            user_role_val := 'system';
        END;
        
        -- Insert audit log entry
        INSERT INTO public.agreement_audit_log (
            agreement_id,
            action,
            description,
            user_id,
            user_role,
            metadata
        ) VALUES (
            NEW.id,
            action_type,
            'Agreement status changed from ' || OLD.agreement_status || ' to ' || NEW.agreement_status,
            profile_id,
            COALESCE(user_role_val, 'system'),
            jsonb_build_object(
                'old_status', OLD.agreement_status,
                'new_status', NEW.agreement_status,
                'changed_at', CURRENT_TIMESTAMP
            )
        );
    END IF;
    
    -- Log signature events
    IF NEW.borrower_signed = true AND (OLD.borrower_signed = false OR OLD.borrower_signed IS NULL) THEN
        INSERT INTO public.agreement_audit_log (
            agreement_id,
            action,
            description,
            user_id,
            user_role,
            signature_hash,
            borrower_info,
            ip_address
        ) VALUES (
            NEW.id,
            'signed',
            'Agreement digitally signed by borrower',
            NEW.borrower_id,
            'borrower',
            NEW.signature_hash,
            jsonb_build_object(
                'full_name', NEW.borrower_full_name,
                'id_number', NEW.borrower_id_number,
                'phone_number', NEW.borrower_phone_number
            ),
            NEW.borrower_signature_ip
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 19: Create trigger for status change logging
DROP TRIGGER IF EXISTS trigger_log_agreement_changes ON public.loan_agreements;
CREATE TRIGGER trigger_log_agreement_changes
    AFTER UPDATE ON public.loan_agreements
    FOR EACH ROW
    EXECUTE FUNCTION public.log_agreement_status_change();

-- =====================================================
-- VERIFICATION: Check if tables were created
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loan_agreements') THEN
        RAISE NOTICE '✅ loan_agreements table created successfully';
    ELSE
        RAISE NOTICE '❌ loan_agreements table creation failed';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agreement_audit_log') THEN
        RAISE NOTICE '✅ agreement_audit_log table created successfully';
    ELSE
        RAISE NOTICE '❌ agreement_audit_log table creation failed';
    END IF;
END $$;