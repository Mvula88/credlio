-- Function to generate a payment schedule when a loan is funded
CREATE OR REPLACE FUNCTION public.generate_payment_schedule(
    p_loan_request_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    payments_created INTEGER
)
AS $$
DECLARE
    v_loan_request RECORD;
    v_payment_amount NUMERIC(12, 2);
    v_payment_count INTEGER;
    v_first_payment_date DATE;
    v_payment_date DATE;
    v_payments_created INTEGER := 0;
    v_interval_unit TEXT := 'month'; -- Default to monthly payments
    v_interval_value INTEGER := 1;   -- Default to 1 month intervals
BEGIN
    -- Get loan request details
    SELECT 
        lr.id,
        lr.borrower_profile_id,
        lr.lender_profile_id,
        lr.country_id,
        lr.loan_amount,
        lr.currency_code,
        lr.status,
        lr.funded_at,
        lr.repayment_terms
    INTO v_loan_request
    FROM public.loan_requests lr
    WHERE lr.id = p_loan_request_id;
    
    -- Validate loan request exists and is funded
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Loan request not found.', 0;
        RETURN;
    END IF;
    
    IF v_loan_request.status != 'funded' THEN
        RETURN QUERY SELECT FALSE, 'Loan request is not in funded status.', 0;
        RETURN;
    END IF;
    
    IF v_loan_request.lender_profile_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Loan request has no assigned lender.', 0;
        RETURN;
    END IF;
    
    -- Parse repayment terms to determine payment count and frequency
    -- This is a simplified approach - in a real system, you'd have more structured data
    -- or a more sophisticated parsing logic
    
    -- For now, we'll assume the repayment_terms field contains something like "12 monthly payments"
    -- and we'll extract the number (12) to determine payment count
    BEGIN
        v_payment_count := (regexp_matches(v_loan_request.repayment_terms, '(\d+)'))[1]::INTEGER;
        
        -- Default to 12 if we couldn't parse a number
        IF v_payment_count IS NULL OR v_payment_count <= 0 THEN
            v_payment_count := 12; -- Default to 12 payments
        END IF;
        
        -- Check if terms mention weekly payments
        IF v_loan_request.repayment_terms ILIKE '%weekly%' THEN
            v_interval_unit := 'week';
        -- Check if terms mention bi-weekly/fortnightly payments
        ELSIF v_loan_request.repayment_terms ILIKE '%bi-weekly%' OR 
              v_loan_request.repayment_terms ILIKE '%biweekly%' OR 
              v_loan_request.repayment_terms ILIKE '%fortnight%' THEN
            v_interval_unit := 'week';
            v_interval_value := 2;
        -- Check if terms mention quarterly payments
        ELSIF v_loan_request.repayment_terms ILIKE '%quarterly%' OR 
              v_loan_request.repayment_terms ILIKE '%quarter%' THEN
            v_interval_unit := 'month';
            v_interval_value := 3;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- If parsing fails, default to 12 monthly payments
            v_payment_count := 12;
            v_interval_unit := 'month';
            v_interval_value := 1;
    END;
    
    -- Calculate payment amount (simple division, no interest calculation in this example)
    -- In a real system, you'd use a proper amortization formula that includes interest
    v_payment_amount := ROUND(v_loan_request.loan_amount / v_payment_count, 2);
    
    -- Set first payment date (30 days from funding date or start of next month)
    v_first_payment_date := (v_loan_request.funded_at + INTERVAL '30 days')::DATE;
    
    -- Generate payment schedule
    v_payment_date := v_first_payment_date;
    
    FOR i IN 1..v_payment_count LOOP
        -- Insert payment record
        INSERT INTO public.loan_payments (
            loan_request_id,
            borrower_profile_id,
            lender_profile_id,
            country_id,
            amount_due,
            currency_code,
            due_date,
            payment_status,
            notes
        ) VALUES (
            v_loan_request.id,
            v_loan_request.borrower_profile_id,
            v_loan_request.lender_profile_id,
            v_loan_request.country_id,
            v_payment_amount,
            v_loan_request.currency_code,
            v_payment_date,
            'scheduled',
            'Payment ' || i || ' of ' || v_payment_count
        );
        
        v_payments_created := v_payments_created + 1;
        
        -- Calculate next payment date based on interval
        IF v_interval_unit = 'week' THEN
            v_payment_date := v_payment_date + (v_interval_value * 7 * INTERVAL '1 day');
        ELSIF v_interval_unit = 'month' THEN
            v_payment_date := v_payment_date + (v_interval_value * INTERVAL '1 month');
        END IF;
    END LOOP;
    
    -- Return success
    RETURN QUERY SELECT TRUE, 'Successfully generated payment schedule with ' || v_payments_created || ' payments.', v_payments_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.generate_payment_schedule(UUID) IS 'Generates a payment schedule for a funded loan request based on its repayment terms.';
