-- =====================================================
-- LOAN APPROVAL CHECKLIST SYSTEM
-- =====================================================
-- Stores comprehensive loan approval checklists
-- Tracks all document verifications and requirements
-- =====================================================

-- Create loan approval checklists table
CREATE TABLE IF NOT EXISTS public.loan_approval_checklists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Loan and party information
    loan_request_id UUID REFERENCES public.loan_requests(id) ON DELETE CASCADE,
    lender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    borrower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Checklist data (stores the complete state)
    checklist_data JSONB NOT NULL,
    
    -- Document verification summary
    total_documents INTEGER DEFAULT 0,
    verified_documents INTEGER DEFAULT 0,
    required_documents INTEGER DEFAULT 0,
    required_verified INTEGER DEFAULT 0,
    
    -- WhatsApp verification
    whatsapp_call_completed BOOLEAN DEFAULT FALSE,
    whatsapp_call_recorded BOOLEAN DEFAULT FALSE,
    whatsapp_call_date TIMESTAMP WITH TIME ZONE,
    whatsapp_verification_notes TEXT,
    
    -- Document hashes for verification
    document_hashes JSONB, -- Stores { document_type: hash } pairs
    
    -- Approval details
    approval_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    approval_notes TEXT,
    rejection_reason TEXT,
    
    -- Risk assessment at time of approval
    borrower_risk_level VARCHAR(20), -- low, medium, high, critical
    risk_flags JSONB,
    risk_assessment_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT unique_loan_approval UNIQUE(loan_request_id, lender_id),
    CONSTRAINT valid_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_approval_checklists_loan_request 
    ON public.loan_approval_checklists(loan_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_checklists_lender 
    ON public.loan_approval_checklists(lender_id);
CREATE INDEX IF NOT EXISTS idx_approval_checklists_borrower 
    ON public.loan_approval_checklists(borrower_id);
CREATE INDEX IF NOT EXISTS idx_approval_checklists_status 
    ON public.loan_approval_checklists(approval_status);
CREATE INDEX IF NOT EXISTS idx_approval_checklists_created 
    ON public.loan_approval_checklists(created_at DESC);

-- =====================================================
-- DOCUMENT VERIFICATION REQUIREMENTS TABLE
-- =====================================================
-- Defines all required documents for loan approval
-- =====================================================

CREATE TABLE IF NOT EXISTS public.document_requirements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Document identification
    document_code VARCHAR(50) UNIQUE NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_category VARCHAR(50) NOT NULL, -- identity, financial, address, legal, references, video
    
    -- Requirements
    is_required BOOLEAN DEFAULT TRUE,
    description TEXT,
    validation_rules JSONB, -- Rules for validation
    
    -- Display order
    sort_order INTEGER DEFAULT 0,
    
    -- Active status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default document requirements
INSERT INTO public.document_requirements (document_code, document_name, document_category, is_required, description, sort_order) VALUES
-- Identity documents
('national_id_front', 'National ID / Passport / Driver''s License (Front)', 'identity', true, 'Clear photo of the front side of government-issued ID', 1),
('national_id_back', 'National ID / Passport / Driver''s License (Back)', 'identity', true, 'Clear photo of the back side of government-issued ID', 2),
('selfie_with_id', 'Selfie with ID', 'identity', true, 'Borrower holding their ID near their face', 3),

-- Financial documents
('bank_statement_3months', '3-6 Months Bank Statement', 'financial', true, 'PDF or screenshot showing financial activity and income flow', 4),
('payslip', 'Payslip or Income Proof', 'financial', false, 'At least 1-3 months (Optional but encouraged)', 5),

-- Address verification
('proof_of_address', 'Proof of Address', 'address', true, 'Recent utility bill or rental agreement (within last 3 months)', 6),

-- Legal documents
('loan_agreement', 'Signed Digital Loan Agreement', 'legal', true, 'Platform-generated agreement digitally signed by borrower', 7),
('police_affidavit', 'Police Affidavit', 'legal', false, 'Borrower signs and certifies with police or local authority', 8),
('consent_blacklisting', 'Consent to Blacklisting & Legal Action', 'legal', true, 'Borrower agrees to potential blacklisting if they fail to pay', 9),

-- References
('reference_contacts', 'Reference Contacts (2-3 people)', 'references', true, 'Full name, phone number, and relationship of references', 10),

-- Video verification
('whatsapp_call', 'WhatsApp Video Call Completed', 'video', true, 'Conducted video call where borrower stated loan details', 11),
('call_recorded', 'Video Call Recording Saved', 'video', true, 'Recording saved safely on device or cloud', 12)
ON CONFLICT (document_code) DO NOTHING;

-- =====================================================
-- DOCUMENT VERIFICATION LOGS
-- =====================================================
-- Tracks individual document verifications
-- =====================================================

CREATE TABLE IF NOT EXISTS public.document_verification_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- References
    checklist_id UUID REFERENCES public.loan_approval_checklists(id) ON DELETE CASCADE,
    document_code VARCHAR(50) REFERENCES public.document_requirements(document_code),
    
    -- Verification status
    is_checked BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_method VARCHAR(50), -- manual, hash, automated
    
    -- Document hash
    document_hash VARCHAR(64),
    hash_algorithm VARCHAR(20) DEFAULT 'SHA-256',
    hash_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Verification details
    verified_by UUID REFERENCES public.profiles(id),
    verification_notes TEXT,
    
    -- Timestamps
    checked_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_checklist_document UNIQUE(checklist_id, document_code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_verification_logs_checklist 
    ON public.document_verification_logs(checklist_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_document 
    ON public.document_verification_logs(document_code);
CREATE INDEX IF NOT EXISTS idx_verification_logs_hash 
    ON public.document_verification_logs(document_hash);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to calculate checklist completion
CREATE OR REPLACE FUNCTION calculate_checklist_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate totals from the checklist data
    UPDATE public.loan_approval_checklists
    SET 
        total_documents = (
            SELECT COUNT(*)
            FROM jsonb_array_elements(NEW.checklist_data) AS category,
                 jsonb_array_elements(category->'items') AS item
        ),
        verified_documents = (
            SELECT COUNT(*)
            FROM jsonb_array_elements(NEW.checklist_data) AS category,
                 jsonb_array_elements(category->'items') AS item
            WHERE (item->>'checked')::boolean = true
        ),
        required_documents = (
            SELECT COUNT(*)
            FROM jsonb_array_elements(NEW.checklist_data) AS category,
                 jsonb_array_elements(category->'items') AS item
            WHERE (item->>'required')::boolean = true
        ),
        required_verified = (
            SELECT COUNT(*)
            FROM jsonb_array_elements(NEW.checklist_data) AS category,
                 jsonb_array_elements(category->'items') AS item
            WHERE (item->>'required')::boolean = true 
            AND (item->>'checked')::boolean = true
        )
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for checklist completion calculation
DROP TRIGGER IF EXISTS trigger_calculate_checklist_completion ON public.loan_approval_checklists;
CREATE TRIGGER trigger_calculate_checklist_completion
    AFTER INSERT OR UPDATE OF checklist_data
    ON public.loan_approval_checklists
    FOR EACH ROW
    EXECUTE FUNCTION calculate_checklist_completion();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE public.loan_approval_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_verification_logs ENABLE ROW LEVEL SECURITY;

-- Policies for loan_approval_checklists
CREATE POLICY "Lenders can view their own checklists"
    ON public.loan_approval_checklists
    FOR SELECT
    USING (
        lender_id IN (
            SELECT id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Lenders can create checklists"
    ON public.loan_approval_checklists
    FOR INSERT
    WITH CHECK (
        lender_id IN (
            SELECT id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Lenders can update their own checklists"
    ON public.loan_approval_checklists
    FOR UPDATE
    USING (
        lender_id IN (
            SELECT id FROM public.profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Policies for document_requirements (public read)
CREATE POLICY "Anyone can view document requirements"
    ON public.document_requirements
    FOR SELECT
    USING (is_active = true);

-- Policies for document_verification_logs
CREATE POLICY "Lenders can view verification logs for their checklists"
    ON public.document_verification_logs
    FOR SELECT
    USING (
        checklist_id IN (
            SELECT id FROM public.loan_approval_checklists
            WHERE lender_id IN (
                SELECT id FROM public.profiles 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Lenders can create verification logs"
    ON public.document_verification_logs
    FOR INSERT
    WITH CHECK (
        checklist_id IN (
            SELECT id FROM public.loan_approval_checklists
            WHERE lender_id IN (
                SELECT id FROM public.profiles 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Lenders can update verification logs"
    ON public.document_verification_logs
    FOR UPDATE
    USING (
        checklist_id IN (
            SELECT id FROM public.loan_approval_checklists
            WHERE lender_id IN (
                SELECT id FROM public.profiles 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- View for checklist summary
CREATE OR REPLACE VIEW public.v_checklist_summary AS
SELECT 
    lac.id,
    lac.loan_request_id,
    lac.lender_id,
    lac.borrower_id,
    lac.approval_status,
    lac.total_documents,
    lac.verified_documents,
    lac.required_documents,
    lac.required_verified,
    CASE 
        WHEN lac.required_documents > 0 
        THEN ROUND((lac.required_verified::numeric / lac.required_documents::numeric) * 100, 2)
        ELSE 0
    END as completion_percentage,
    lac.whatsapp_call_completed,
    lac.whatsapp_call_recorded,
    lac.borrower_risk_level,
    lac.created_at,
    lac.approved_at,
    lac.rejected_at,
    lp.full_name as lender_name,
    bp.full_name as borrower_name
FROM public.loan_approval_checklists lac
LEFT JOIN public.profiles lp ON lac.lender_id = lp.id
LEFT JOIN public.profiles bp ON lac.borrower_id = bp.id;

-- Grant permissions on view
GRANT SELECT ON public.v_checklist_summary TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Loan Approval Checklist System created successfully!';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - loan_approval_checklists';
    RAISE NOTICE '  - document_requirements';
    RAISE NOTICE '  - document_verification_logs';
    RAISE NOTICE 'View created:';
    RAISE NOTICE '  - v_checklist_summary';
    RAISE NOTICE 'RLS policies applied for security';
END $$;