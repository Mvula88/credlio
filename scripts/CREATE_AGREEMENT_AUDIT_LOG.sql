-- =====================================================
-- AGREEMENT AUDIT LOG TABLE
-- =====================================================
-- Tracks all actions performed on loan agreements
-- Provides complete audit trail for legal compliance
-- =====================================================

-- Create agreement audit log table
CREATE TABLE IF NOT EXISTS public.agreement_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Related agreement
    agreement_id UUID REFERENCES public.loan_agreements(id) ON DELETE CASCADE,
    
    -- Action details
    action VARCHAR(50) NOT NULL, -- 'generated', 'sent', 'signed', 'activated', 'modified', 'cancelled'
    description TEXT,
    
    -- User who performed the action
    user_id UUID REFERENCES public.profiles(id),
    user_role VARCHAR(20) NOT NULL, -- 'lender', 'borrower', 'admin'
    
    -- Technical details
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Signature-specific data (for signing actions)
    signature_hash VARCHAR(128),
    borrower_info JSONB, -- Store borrower details at time of signing
    
    -- Additional metadata
    metadata JSONB,
    
    -- Timestamp
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_action CHECK (action IN (
        'generated', 'sent', 'viewed', 'signed', 'activated', 
        'modified', 'cancelled', 'defaulted', 'completed'
    )),
    CONSTRAINT valid_user_role CHECK (user_role IN ('lender', 'borrower', 'admin', 'super_admin', 'country_admin'))
);

-- Create indexes for performance and querying
CREATE INDEX IF NOT EXISTS idx_agreement_audit_agreement ON public.agreement_audit_log(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_audit_user ON public.agreement_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_agreement_audit_action ON public.agreement_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_agreement_audit_timestamp ON public.agreement_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_agreement_audit_ip ON public.agreement_audit_log(ip_address);

-- Add RLS policies
ALTER TABLE public.agreement_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view logs for their own agreements
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

-- Policy: Admins can view all logs
CREATE POLICY "admins_view_all_logs" ON public.agreement_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'country_admin')
        )
    );

-- Policy: System can insert logs (for API operations)
CREATE POLICY "system_insert_logs" ON public.agreement_audit_log
    FOR INSERT WITH CHECK (true);

-- Function to automatically log agreement status changes
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
            user_role_val,
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
            (SELECT id FROM public.profiles WHERE id = NEW.borrower_id),
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

-- Create trigger for automatic logging
DROP TRIGGER IF EXISTS trigger_log_agreement_changes ON public.loan_agreements;
CREATE TRIGGER trigger_log_agreement_changes
    AFTER UPDATE ON public.loan_agreements
    FOR EACH ROW
    EXECUTE FUNCTION public.log_agreement_status_change();

-- Function to log agreement generation
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

-- Create trigger for agreement generation logging
DROP TRIGGER IF EXISTS trigger_log_agreement_generation ON public.loan_agreements;
CREATE TRIGGER trigger_log_agreement_generation
    AFTER INSERT ON public.loan_agreements
    FOR EACH ROW
    EXECUTE FUNCTION public.log_agreement_generation();

-- Grant permissions
GRANT SELECT, INSERT ON public.agreement_audit_log TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;