-- =====================================================
-- Deregister Risky/Bad Borrowers System
-- =====================================================
-- Allows lenders to remove borrowers from risky list after payment
-- Includes notification system for borrowers
-- =====================================================

-- =====================================================
-- 1. ADD DEREGISTRATION FIELDS TO EXISTING TABLE
-- =====================================================
DO $$
BEGIN
    -- Add deregistration fields if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blacklisted_borrowers' 
                   AND column_name = 'deregistered_by') THEN
        ALTER TABLE public.blacklisted_borrowers 
        ADD COLUMN deregistered_by UUID REFERENCES public.profiles(id),
        ADD COLUMN deregistered_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN deregistration_reason TEXT,
        ADD COLUMN payment_proof_url TEXT;
    END IF;
END $$;

-- =====================================================
-- 2. CREATE DEREGISTRATION REQUESTS TABLE
-- =====================================================
-- Borrowers can request deregistration
CREATE TABLE IF NOT EXISTS public.deregistration_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Request details
    blacklist_entry_id UUID REFERENCES public.blacklisted_borrowers(id) ON DELETE CASCADE,
    borrower_profile_id UUID REFERENCES public.profiles(id) NOT NULL,
    lender_profile_id UUID REFERENCES public.profiles(id),
    
    -- Payment information
    payment_amount DECIMAL(15, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_reference VARCHAR(255),
    payment_proof_url TEXT,
    
    -- Request status
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    borrower_message TEXT,
    lender_response TEXT,
    
    -- Processing details
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. DEREGISTRATION FUNCTIONS
-- =====================================================

-- Function for lender to deregister a borrower
CREATE OR REPLACE FUNCTION deregister_risky_borrower(
    p_blacklist_id UUID,
    p_lender_id UUID,
    p_reason TEXT,
    p_payment_proof TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_borrower_id UUID;
    v_borrower_email TEXT;
    v_borrower_name TEXT;
    v_amount_owed DECIMAL;
BEGIN
    -- Verify the lender owns this report or is an admin
    IF NOT EXISTS (
        SELECT 1 FROM blacklisted_borrowers 
        WHERE id = p_blacklist_id 
        AND (lender_profile_id = p_lender_id OR lender_profile_id IS NULL)
    ) AND NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = p_lender_id 
        AND role IN ('admin', 'super_admin')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You do not have permission to deregister this entry'
        );
    END IF;
    
    -- Get borrower details before updating
    SELECT 
        borrower_profile_id,
        borrower_email,
        borrower_name,
        amount_owed
    INTO 
        v_borrower_id,
        v_borrower_email,
        v_borrower_name,
        v_amount_owed
    FROM blacklisted_borrowers
    WHERE id = p_blacklist_id;
    
    -- Update the blacklist entry
    UPDATE blacklisted_borrowers
    SET 
        deregistered = TRUE,
        deregistered_by = p_lender_id,
        deregistered_at = NOW(),
        deregistration_reason = p_reason,
        payment_proof_url = p_payment_proof,
        resolution_status = 'resolved',
        resolution_date = CURRENT_DATE,
        resolution_notes = format('Deregistered by lender: %s', p_reason),
        updated_at = NOW()
    WHERE id = p_blacklist_id;
    
    -- Create notification for borrower
    INSERT INTO notifications (
        profile_id,
        title,
        message,
        type,
        metadata
    ) VALUES (
        v_borrower_id,
        'Good News! You have been removed from the risky borrowers list',
        format('A lender has confirmed your payment and removed you from the risky borrowers list. Reason: %s', p_reason),
        'success',
        jsonb_build_object(
            'blacklist_id', p_blacklist_id,
            'lender_id', p_lender_id,
            'amount_cleared', v_amount_owed,
            'action', 'deregistered'
        )
    );
    
    -- Update borrower risk metrics
    UPDATE borrower_risk_metrics
    SET 
        times_reported = GREATEST(0, times_reported - 1),
        risk_score = GREATEST(0, risk_score - 20),
        risk_category = CASE 
            WHEN risk_score <= 20 THEN 'low'
            WHEN risk_score <= 40 THEN 'medium'
            ELSE risk_category
        END,
        updated_at = NOW()
    WHERE borrower_profile_id = v_borrower_id;
    
    -- Log the action
    INSERT INTO compliance_logs (
        log_type,
        severity,
        user_id,
        description,
        metadata
    ) VALUES (
        'borrower_deregistered',
        'info',
        p_lender_id,
        format('Borrower %s deregistered from risky list after payment', v_borrower_name),
        jsonb_build_object(
            'borrower_id', v_borrower_id,
            'blacklist_id', p_blacklist_id,
            'reason', p_reason
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Borrower successfully deregistered from risky list',
        'borrower_id', v_borrower_id,
        'borrower_name', v_borrower_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for borrower to request deregistration
CREATE OR REPLACE FUNCTION request_deregistration(
    p_borrower_id UUID,
    p_blacklist_id UUID,
    p_payment_amount DECIMAL,
    p_payment_date DATE,
    p_payment_reference TEXT,
    p_payment_proof TEXT,
    p_message TEXT
)
RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_lender_id UUID;
    v_lender_name TEXT;
BEGIN
    -- Get lender information
    SELECT lender_profile_id INTO v_lender_id
    FROM blacklisted_borrowers
    WHERE id = p_blacklist_id
    AND borrower_profile_id = p_borrower_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Blacklist entry not found or you are not the borrower';
    END IF;
    
    -- Create deregistration request
    INSERT INTO deregistration_requests (
        blacklist_entry_id,
        borrower_profile_id,
        lender_profile_id,
        payment_amount,
        payment_date,
        payment_reference,
        payment_proof_url,
        borrower_message,
        status
    ) VALUES (
        p_blacklist_id,
        p_borrower_id,
        v_lender_id,
        p_payment_amount,
        p_payment_date,
        p_payment_reference,
        p_payment_proof,
        p_message,
        'pending'
    ) RETURNING id INTO v_request_id;
    
    -- Notify lender if not system-generated
    IF v_lender_id IS NOT NULL THEN
        SELECT full_name INTO v_lender_name FROM profiles WHERE id = v_lender_id;
        
        INSERT INTO notifications (
            profile_id,
            title,
            message,
            type,
            metadata
        ) VALUES (
            v_lender_id,
            'Deregistration Request from Borrower',
            format('A borrower has submitted proof of payment and requests to be removed from your risky borrowers list. Amount: $%s', p_payment_amount),
            'alert',
            jsonb_build_object(
                'request_id', v_request_id,
                'borrower_id', p_borrower_id,
                'payment_amount', p_payment_amount,
                'action_required', true
            )
        );
    END IF;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically alert borrowers about their risky status
CREATE OR REPLACE FUNCTION alert_risky_borrowers()
RETURNS void AS $$
DECLARE
    v_borrower RECORD;
BEGIN
    -- Find all active risky borrowers who haven't been alerted recently
    FOR v_borrower IN 
        SELECT DISTINCT
            bb.borrower_profile_id,
            bb.borrower_name,
            bb.amount_owed,
            COUNT(*) as report_count,
            STRING_AGG(DISTINCT 
                CASE 
                    WHEN bb.lender_profile_id IS NOT NULL THEN p.full_name
                    ELSE 'System'
                END, ', '
            ) as reporters
        FROM blacklisted_borrowers bb
        LEFT JOIN profiles p ON p.id = bb.lender_profile_id
        WHERE bb.deregistered = FALSE
        AND bb.borrower_profile_id IS NOT NULL
        AND NOT EXISTS (
            -- Check if already notified in last 7 days
            SELECT 1 FROM notifications n
            WHERE n.profile_id = bb.borrower_profile_id
            AND n.type = 'risk_alert'
            AND n.created_at > NOW() - INTERVAL '7 days'
        )
        GROUP BY bb.borrower_profile_id, bb.borrower_name, bb.amount_owed
    LOOP
        -- Create alert notification
        INSERT INTO notifications (
            profile_id,
            title,
            message,
            type,
            metadata
        ) VALUES (
            v_borrower.borrower_profile_id,
            '⚠️ Alert: You are listed as a risky borrower',
            format('You have been reported by %s lender(s) with outstanding amount of $%s. Please clear your debts and request deregistration to improve your borrowing capability.',
                   v_borrower.report_count,
                   v_borrower.amount_owed),
            'risk_alert',
            jsonb_build_object(
                'report_count', v_borrower.report_count,
                'amount_owed', v_borrower.amount_owed,
                'reporters', v_borrower.reporters,
                'action_needed', 'payment_and_deregistration'
            )
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to approve deregistration request
CREATE OR REPLACE FUNCTION approve_deregistration_request(
    p_request_id UUID,
    p_reviewer_id UUID,
    p_response TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_blacklist_id UUID;
    v_borrower_id UUID;
    v_result JSONB;
BEGIN
    -- Get request details
    SELECT blacklist_entry_id, borrower_profile_id
    INTO v_blacklist_id, v_borrower_id
    FROM deregistration_requests
    WHERE id = p_request_id
    AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Request not found or already processed'
        );
    END IF;
    
    -- Update request
    UPDATE deregistration_requests
    SET 
        status = 'approved',
        lender_response = p_response,
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;
    
    -- Deregister the borrower
    v_result := deregister_risky_borrower(
        v_blacklist_id,
        p_reviewer_id,
        format('Approved deregistration request: %s', p_response)
    );
    
    -- Notify borrower
    INSERT INTO notifications (
        profile_id,
        title,
        message,
        type,
        metadata
    ) VALUES (
        v_borrower_id,
        '✅ Deregistration Request Approved',
        format('Your request to be removed from the risky borrowers list has been approved. %s', p_response),
        'success',
        jsonb_build_object(
            'request_id', p_request_id,
            'status', 'approved'
        )
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. SCHEDULED JOB FOR ALERTS (Run daily)
-- =====================================================
-- This would be set up as a cron job in Supabase
-- SELECT cron.schedule('alert-risky-borrowers', '0 10 * * *', 'SELECT alert_risky_borrowers();');

-- =====================================================
-- 5. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_blacklisted_deregistered 
    ON public.blacklisted_borrowers(deregistered, borrower_profile_id);
CREATE INDEX IF NOT EXISTS idx_deregistration_requests_status 
    ON public.deregistration_requests(status, borrower_profile_id);
CREATE INDEX IF NOT EXISTS idx_deregistration_requests_lender 
    ON public.deregistration_requests(lender_profile_id, status);

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================
ALTER TABLE public.deregistration_requests ENABLE ROW LEVEL SECURITY;

-- Borrowers can view their own requests
CREATE POLICY "Borrowers can view own requests" ON public.deregistration_requests
    FOR SELECT USING (
        borrower_profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
        )
    );

-- Borrowers can create requests
CREATE POLICY "Borrowers can create requests" ON public.deregistration_requests
    FOR INSERT WITH CHECK (
        borrower_profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'borrower'
        )
    );

-- Lenders can view and update requests for their reports
CREATE POLICY "Lenders can manage requests" ON public.deregistration_requests
    FOR ALL USING (
        lender_profile_id IN (
            SELECT id FROM public.profiles
            WHERE auth_user_id = auth.uid()
            AND role = 'lender'
        )
    );

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.deregistration_requests TO authenticated;
GRANT EXECUTE ON FUNCTION deregister_risky_borrower TO authenticated;
GRANT EXECUTE ON FUNCTION request_deregistration TO authenticated;
GRANT EXECUTE ON FUNCTION approve_deregistration_request TO authenticated;
GRANT EXECUTE ON FUNCTION alert_risky_borrowers TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Deregistration System Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Features Implemented:';
    RAISE NOTICE '1. Lenders can deregister borrowers after payment';
    RAISE NOTICE '2. Borrowers receive notifications about their status';
    RAISE NOTICE '3. Borrowers can request deregistration with proof';
    RAISE NOTICE '4. Automatic alerts to risky borrowers';
    RAISE NOTICE '5. Complete audit trail of deregistrations';
    RAISE NOTICE '========================================';
END $$;