-- 1. Create the loan_payments table
CREATE TABLE IF NOT EXISTS public.loan_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_request_id UUID NOT NULL REFERENCES public.loan_requests(id) ON DELETE CASCADE,
    borrower_profile_id UUID NOT NULL REFERENCES public.profiles(id),
    lender_profile_id UUID NOT NULL REFERENCES public.profiles(id), -- Denormalized from loan_requests for RLS and querying
    country_id UUID NOT NULL REFERENCES public.countries(id), -- Denormalized for RLS
    amount_due NUMERIC(12, 2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    due_date DATE NOT NULL,
    amount_paid NUMERIC(12, 2),
    payment_date TIMESTAMPTZ,
    payment_status TEXT NOT NULL DEFAULT 'scheduled', -- e.g., 'scheduled', 'pending_confirmation', 'completed', 'failed', 'overdue', 'reversed'
    payment_method TEXT,
    transaction_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_request_id ON public.loan_payments(loan_request_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_borrower_profile_id ON public.loan_payments(borrower_profile_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_lender_profile_id ON public.loan_payments(lender_profile_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_due_date ON public.loan_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_loan_payments_status ON public.loan_payments(payment_status);

-- Trigger to update 'updated_at' timestamp
CREATE TRIGGER handle_updated_at_loan_payments
BEFORE UPDATE ON public.loan_payments
FOR EACH ROW
EXECUTE FUNCTION moddatetime (updated_at);

-- 2. RLS Policies for loan_payments

-- Allow super admins to do anything
CREATE POLICY "loan_payments_super_admin_all"
ON public.loan_payments
FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Allow country admins to manage payments in their country
CREATE POLICY "loan_payments_country_admin_manage"
ON public.loan_payments
FOR ALL
USING (
    public.is_country_admin() AND
    country_id = public.get_current_user_country_id()
)
WITH CHECK (
    public.is_country_admin() AND
    country_id = public.get_current_user_country_id()
);

-- Borrowers can see their own payments
CREATE POLICY "loan_payments_borrower_select"
ON public.loan_payments
FOR SELECT
USING (
    auth.role() = 'authenticated' AND -- Ensure user is authenticated
    borrower_profile_id = public.get_current_profile_id()
);

-- Lenders can see payments related to loans they funded
CREATE POLICY "loan_payments_lender_select"
ON public.loan_payments
FOR SELECT
USING (
    auth.role() = 'authenticated' AND -- Ensure user is authenticated
    lender_profile_id = public.get_current_profile_id()
);

-- Borrowers can create payment records for their loans (e.g., to mark an initiated payment)
-- This policy assumes the borrower is initiating a payment for an existing scheduled payment or making a new one.
-- More restrictive checks might be needed depending on the workflow (e.g., only if loan status is 'active').
CREATE POLICY "loan_payments_borrower_insert_initiated"
ON public.loan_payments
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated' AND
    borrower_profile_id = public.get_current_profile_id() AND
    EXISTS ( -- Ensure the loan request belongs to the borrower and is funded/active
        SELECT 1 FROM public.loan_requests lr
        WHERE lr.id = loan_request_id
        AND lr.borrower_profile_id = public.get_current_profile_id()
        AND lr.status IN ('funded', 'active', 'past_due') -- Adjust statuses as needed
    )
);

-- Borrowers can update their initiated payments (e.g., add transaction_reference, if status is 'pending_confirmation')
CREATE POLICY "loan_payments_borrower_update_pending"
ON public.loan_payments
FOR UPDATE
USING (
    auth.role() = 'authenticated' AND
    borrower_profile_id = public.get_current_profile_id() AND
    payment_status = 'pending_confirmation' -- Only allow update if it's pending their confirmation details
)
WITH CHECK (
    borrower_profile_id = public.get_current_profile_id() AND
    payment_status = 'pending_confirmation'
    -- Add other checks, e.g., cannot change amount_due
);


-- Lenders can update payment status for loans they funded (e.g., confirm receipt, mark as failed)
-- This is a broad update policy for lenders; might need to be more granular.
CREATE POLICY "loan_payments_lender_update_status"
ON public.loan_payments
FOR UPDATE
USING (
    auth.role() = 'authenticated' AND
    lender_profile_id = public.get_current_profile_id() AND
    EXISTS ( -- Ensure the loan request is funded by this lender
        SELECT 1 FROM public.loan_requests lr
        WHERE lr.id = loan_request_id
        AND lr.lender_profile_id = public.get_current_profile_id()
    )
)
WITH CHECK (
    lender_profile_id = public.get_current_profile_id()
    -- Example: Lender can only update specific fields like payment_status, notes, payment_date, amount_paid
    -- This check part would need to list allowed columns if we want to restrict what they can change.
    -- For now, it's broad.
);

COMMENT ON TABLE public.loan_payments IS 'Stores records of individual loan payments, scheduled or actual.';
COMMENT ON COLUMN public.loan_payments.payment_status IS 'e.g., scheduled, pending_confirmation, completed, failed, overdue, reversed';
