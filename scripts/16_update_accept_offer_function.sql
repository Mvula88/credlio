-- Update the accept_loan_offer function to generate payment schedule automatically
CREATE OR REPLACE FUNCTION public.accept_loan_offer(
    p_offer_id UUID,
    p_borrower_profile_id UUID -- To verify the actor is the correct borrower
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    updated_loan_request_id UUID,
    updated_offer_id UUID
)
AS $$
DECLARE
    v_loan_request_id UUID;
    v_lender_profile_id UUID;
    v_loan_request_country_id UUID;
    v_current_loan_request_status TEXT;
    v_current_offer_status TEXT;
    v_payment_schedule_result RECORD;
BEGIN
    -- Validate the offer and loan request state
    SELECT
        lo.loan_request_id,
        lo.lender_profile_id,
        lr.country_id,
        lr.status,
        lo.offer_status
    INTO
        v_loan_request_id,
        v_lender_profile_id,
        v_loan_request_country_id,
        v_current_loan_request_status,
        v_current_offer_status
    FROM public.loan_offers lo
    JOIN public.loan_requests lr ON lo.loan_request_id = lr.id
    WHERE lo.id = p_offer_id AND lr.borrower_profile_id = p_borrower_profile_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Offer not found or you are not the borrower for this loan request.', NULL::UUID, NULL::UUID;
        RETURN;
    END IF;

    IF v_current_offer_status != 'pending_borrower_acceptance' THEN
        RETURN QUERY SELECT FALSE, 'This offer is not pending acceptance. Current status: ' || v_current_offer_status, NULL::UUID, NULL::UUID;
        RETURN;
    END IF;

    IF v_current_loan_request_status != 'pending_lender_acceptance' THEN
        RETURN QUERY SELECT FALSE, 'The loan request is no longer pending lender acceptance. Current status: ' || v_current_loan_request_status, NULL::UUID, NULL::UUID;
        RETURN;
    END IF;

    -- Proceed with updates
    -- 1. Update the accepted loan offer
    UPDATE public.loan_offers
    SET offer_status = 'accepted_by_borrower', updated_at = now()
    WHERE id = p_offer_id;

    -- 2. Update the loan request
    UPDATE public.loan_requests
    SET
        status = 'funded',
        lender_profile_id = v_lender_profile_id, -- Assign the lender
        funded_at = now(), -- Add a funded_at timestamp if your table has it
        updated_at = now()
    WHERE id = v_loan_request_id;

    -- 3. Expire other pending offers for the same loan request
    UPDATE public.loan_offers
    SET offer_status = 'expired', updated_at = now()
    WHERE loan_request_id = v_loan_request_id
        AND id != p_offer_id -- Don't expire the one we just accepted
        AND offer_status = 'pending_borrower_acceptance';

    -- 4. Generate payment schedule
    SELECT * FROM public.generate_payment_schedule(v_loan_request_id) INTO v_payment_schedule_result;
    
    -- Log result of payment schedule generation (could be used for debugging)
    RAISE NOTICE 'Payment schedule generation: % - %', 
        v_payment_schedule_result.success, 
        v_payment_schedule_result.message;

    -- Return success regardless of payment schedule generation
    -- In a production system, you might want to handle payment schedule failures differently
    RETURN QUERY SELECT TRUE, 'Offer accepted successfully. Loan is now funded.', v_loan_request_id, p_offer_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in accept_loan_offer: %', SQLERRM;
        RETURN QUERY SELECT FALSE, 'An unexpected error occurred: ' || SQLERRM, NULL::UUID, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.accept_loan_offer(UUID, UUID) IS 'Handles the process of a borrower accepting a loan offer, updating statuses, linking the lender, and generating a payment schedule.';
