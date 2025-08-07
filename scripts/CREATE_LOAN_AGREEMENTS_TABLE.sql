-- =====================================================
-- LOAN AGREEMENTS TABLE
-- =====================================================
-- Stores generated loan agreements and their status
-- Tracks borrower signatures and agreement lifecycle
-- =====================================================

-- Create loan agreements table
CREATE TABLE IF NOT EXISTS public.loan_agreements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Related entities
    loan_request_id UUID REFERENCES public.loan_requests(id) ON DELETE CASCADE,
    lender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    borrower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Loan terms
    loan_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    loan_term INTEGER NOT NULL, -- in months/weeks depending on frequency
    repayment_frequency VARCHAR(20) NOT NULL, -- 'weekly', 'monthly', etc.
    
    -- Additional terms
    collateral_description TEXT,
    additional_terms TEXT,
    late_payment_penalty DECIMAL(5,2) DEFAULT 5.0,
    default_grace_period INTEGER DEFAULT 7, -- days
    
    -- Agreement status and tracking
    agreement_status VARCHAR(20) DEFAULT 'generated', -- generated, sent, signed, active, completed, defaulted
    agreement_number VARCHAR(50) UNIQUE NOT NULL DEFAULT ('LA-' || UPPER(SUBSTRING(uuid_generate_v4()::text, 1, 8))),
    
    -- File storage
    agreement_file_path TEXT, -- Path to stored PDF file
    agreement_file_hash VARCHAR(64), -- SHA256 hash for integrity
    
    -- Borrower signature tracking
    borrower_signed BOOLEAN DEFAULT FALSE,
    borrower_signature_date TIMESTAMP WITH TIME ZONE,
    borrower_signature_ip VARCHAR(45),
    borrower_full_name VARCHAR(255), -- Name as signed by borrower
    borrower_id_number VARCHAR(50), -- ID number as provided by borrower
    borrower_phone_number VARCHAR(20), -- Phone as provided by borrower
    
    -- Digital signature verification
    signature_hash VARCHAR(128), -- Hash of signature for verification
    signature_verified BOOLEAN DEFAULT FALSE,
    
    -- Legal and compliance
    terms_version VARCHAR(10) DEFAULT '1.0',
    governing_law VARCHAR(100), -- Country/jurisdiction
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_loan_agreements_loan_request ON public.loan_agreements(loan_request_id);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_lender ON public.loan_agreements(lender_id);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_borrower ON public.loan_agreements(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_status ON public.loan_agreements(agreement_status);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_number ON public.loan_agreements(agreement_number);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_generated_at ON public.loan_agreements(generated_at);

-- Add RLS policies
ALTER TABLE public.loan_agreements ENABLE ROW LEVEL SECURITY;

-- Policy: Lenders can manage their own agreements
CREATE POLICY "lenders_manage_own_agreements" ON public.loan_agreements
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.profiles WHERE id = lender_id
        )
    );

-- Policy: Borrowers can view and update their own agreements (for signing)
CREATE POLICY "borrowers_view_own_agreements" ON public.loan_agreements
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.profiles WHERE id = borrower_id
        )
    );

-- Policy: Borrowers can update signature fields only
CREATE POLICY "borrowers_sign_agreements" ON public.loan_agreements
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.profiles WHERE id = borrower_id
        )
    );

-- Policy: Admins can view all agreements
CREATE POLICY "admins_view_all_agreements" ON public.loan_agreements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'country_admin')
        )
    );

-- Function to update agreement status when loan status changes
CREATE OR REPLACE FUNCTION public.sync_agreement_with_loan_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update agreement status when loan status changes
    IF NEW.status = 'active' AND OLD.status != 'active' THEN
        UPDATE public.loan_agreements 
        SET agreement_status = 'active',
            activated_at = CURRENT_TIMESTAMP
        WHERE loan_request_id = NEW.id;
    ELSIF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE public.loan_agreements 
        SET agreement_status = 'completed'
        WHERE loan_request_id = NEW.id;
    ELSIF NEW.status = 'defaulted' AND OLD.status != 'defaulted' THEN
        UPDATE public.loan_agreements 
        SET agreement_status = 'defaulted'
        WHERE loan_request_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync agreement status
DROP TRIGGER IF EXISTS trigger_sync_agreement_status ON public.loan_requests;
CREATE TRIGGER trigger_sync_agreement_status
    AFTER UPDATE ON public.loan_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_agreement_with_loan_status();

-- Function to generate agreement number
CREATE OR REPLACE FUNCTION public.generate_agreement_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.agreement_number IS NULL OR NEW.agreement_number = '' THEN
        NEW.agreement_number := 'LA-' || UPPER(SUBSTRING(uuid_generate_v4()::text, 1, 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for agreement number generation
DROP TRIGGER IF EXISTS trigger_generate_agreement_number ON public.loan_agreements;
CREATE TRIGGER trigger_generate_agreement_number
    BEFORE INSERT ON public.loan_agreements
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_agreement_number();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_agreement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_agreement_timestamp ON public.loan_agreements;
CREATE TRIGGER trigger_update_agreement_timestamp
    BEFORE UPDATE ON public.loan_agreements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_agreement_timestamp();

-- Grant permissions
GRANT ALL ON public.loan_agreements TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;