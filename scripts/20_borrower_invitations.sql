-- Create borrower_invitations table
CREATE TABLE IF NOT EXISTS public.borrower_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_code VARCHAR(50) UNIQUE NOT NULL,
    lender_profile_id UUID NOT NULL REFERENCES public.profiles(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    custom_message TEXT,
    loan_amount DECIMAL(12,2),
    loan_term_months INTEGER,
    interest_rate DECIMAL(5,2),
    borrower_email VARCHAR(255),
    borrower_phone VARCHAR(50),
    borrower_name VARCHAR(255),
    registered_borrower_id UUID REFERENCES public.profiles(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_borrower_invitations_code ON public.borrower_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_borrower_invitations_lender ON public.borrower_invitations(lender_profile_id);

-- RLS policies
ALTER TABLE public.borrower_invitations ENABLE ROW LEVEL SECURITY;

-- Lenders can view their own invitations
CREATE POLICY borrower_invitations_select_policy ON public.borrower_invitations
    FOR SELECT
    USING (
        lender_profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
        )
    );

-- Lenders can insert their own invitations
CREATE POLICY borrower_invitations_insert_policy ON public.borrower_invitations
    FOR INSERT
    WITH CHECK (
        lender_profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
        )
    );

-- Lenders can update their own invitations
CREATE POLICY borrower_invitations_update_policy ON public.borrower_invitations
    FOR UPDATE
    USING (
        lender_profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
        )
    );

-- Function to generate a random invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS VARCHAR(50) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result VARCHAR(50) := '';
    i INTEGER := 0;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 10-character code
        result := '';
        FOR i IN 1..10 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        -- Check if this code already exists
        SELECT EXISTS(SELECT 1 FROM public.borrower_invitations WHERE invitation_code = result) INTO code_exists;
        
        -- If code doesn't exist, return it
        IF NOT code_exists THEN
            RETURN result;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new invitation
CREATE OR REPLACE FUNCTION create_borrower_invitation(
    p_lender_profile_id UUID,
    p_custom_message TEXT DEFAULT NULL,
    p_loan_amount DECIMAL(12,2) DEFAULT NULL,
    p_loan_term_months INTEGER DEFAULT NULL,
    p_interest_rate DECIMAL(5,2) DEFAULT NULL,
    p_borrower_email VARCHAR(255) DEFAULT NULL,
    p_borrower_phone VARCHAR(50) DEFAULT NULL,
    p_borrower_name VARCHAR(255) DEFAULT NULL,
    p_expires_days INTEGER DEFAULT 30
)
RETURNS TABLE(
    invitation_id UUID,
    invitation_code VARCHAR(50)
) AS $$
DECLARE
    v_invitation_id UUID;
    v_invitation_code VARCHAR(50);
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Generate invitation code
    v_invitation_code := generate_invitation_code();
    
    -- Calculate expiration date
    v_expires_at := NOW() + (p_expires_days || ' days')::INTERVAL;
    
    -- Insert the invitation
    INSERT INTO public.borrower_invitations (
        invitation_code,
        lender_profile_id,
        expires_at,
        custom_message,
        loan_amount,
        loan_term_months,
        interest_rate,
        borrower_email,
        borrower_phone,
        borrower_name
    ) VALUES (
        v_invitation_code,
        p_lender_profile_id,
        v_expires_at,
        p_custom_message,
        p_loan_amount,
        p_loan_term_months,
        p_interest_rate,
        p_borrower_email,
        p_borrower_phone,
        p_borrower_name
    ) RETURNING id INTO v_invitation_id;
    
    -- Return the invitation details
    RETURN QUERY
    SELECT v_invitation_id, v_invitation_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept an invitation
CREATE OR REPLACE FUNCTION accept_borrower_invitation(
    p_invitation_code VARCHAR(50),
    p_borrower_profile_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_invitation_id UUID;
    v_status VARCHAR(20);
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get invitation details
    SELECT id, status, expires_at
    INTO v_invitation_id, v_status, v_expires_at
    FROM public.borrower_invitations
    WHERE invitation_code = p_invitation_code;
    
    -- Check if invitation exists
    IF v_invitation_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if invitation is still valid
    IF v_status != 'pending' OR v_expires_at < NOW() THEN
        RETURN FALSE;
    END IF;
    
    -- Update invitation status
    UPDATE public.borrower_invitations
    SET status = 'accepted',
        accepted_at = NOW(),
        registered_borrower_id = p_borrower_profile_id
    WHERE id = v_invitation_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel an invitation
CREATE OR REPLACE FUNCTION cancel_borrower_invitation(
    p_invitation_id UUID,
    p_lender_profile_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_invitation_exists BOOLEAN;
BEGIN
    -- Check if invitation exists and belongs to the lender
    SELECT EXISTS(
        SELECT 1 
        FROM public.borrower_invitations 
        WHERE id = p_invitation_id 
        AND lender_profile_id = p_lender_profile_id
        AND status = 'pending'
    ) INTO v_invitation_exists;
    
    -- If invitation doesn't exist or doesn't belong to lender, return false
    IF NOT v_invitation_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Update invitation status
    UPDATE public.borrower_invitations
    SET status = 'cancelled'
    WHERE id = p_invitation_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policy to view all invitations
CREATE POLICY admin_borrower_invitations_select_policy ON public.borrower_invitations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.user_profile_roles upr ON p.id = upr.profile_id
            JOIN public.user_roles ur ON upr.role_id = ur.id
            WHERE p.auth_user_id = auth.uid()
            AND ur.role_name = 'admin'
        )
    );
