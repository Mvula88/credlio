'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { revalidatePath } from 'next/cache';

export async function createActiveLoan(
  borrowerId: string,
  loanRequestId: string,
  amount: number,
  interestRate: number = 0,
  durationMonths: number = 1
) {
  const supabase = createServerSupabaseClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Get lender profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || profile.role !== 'lender') {
    throw new Error('Only lenders can create active loans');
  }

  // Create the active loan
  const { data, error } = await supabase.rpc('create_active_loan', {
    p_lender_id: profile.id,
    p_borrower_id: borrowerId,
    p_loan_request_id: loanRequestId,
    p_amount: amount,
    p_interest_rate: interestRate,
    p_duration_months: durationMonths
  });

  if (error) {
    console.error('Error creating active loan:', error);
    throw new Error('Failed to create active loan');
  }

  revalidatePath('/lender/dashboard');
  return { success: true, loanId: data };
}

export async function recordPayment(
  activeLoanId: string,
  amount: number,
  paymentDate: string,
  paymentMethod: string = 'cash',
  receiptNumber?: string,
  notes?: string
) {
  const supabase = createServerSupabaseClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    throw new Error('Profile not found');
  }

  // Record the payment
  const { data, error } = await supabase.rpc('record_loan_payment', {
    p_active_loan_id: activeLoanId,
    p_amount: amount,
    p_payment_date: paymentDate,
    p_payment_method: paymentMethod,
    p_receipt_number: receiptNumber,
    p_notes: notes,
    p_recorded_by: profile.id
  });

  if (error) {
    console.error('Error recording payment:', error);
    throw new Error('Failed to record payment');
  }

  revalidatePath('/lender/dashboard');
  return { success: true };
}

export async function updateDocumentVerification(
  activeLoanId: string,
  documentType: string,
  isVerified: boolean
) {
  const supabase = createServerSupabaseClient();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Update document verification
  const { data, error } = await supabase.rpc('update_document_verification', {
    p_active_loan_id: activeLoanId,
    p_document_type: documentType,
    p_is_verified: isVerified
  });

  if (error) {
    console.error('Error updating document verification:', error);
    throw new Error('Failed to update document verification');
  }

  revalidatePath('/lender/dashboard');
  return { success: true };
}

export async function getLenderPortfolio(status?: 'active' | 'completed' | 'defaulted') {
  const supabase = createServerSupabaseClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    throw new Error('Profile not found');
  }

  // Build query
  let query = supabase
    .from('lender_portfolio')
    .select('*')
    .eq('lender_id', profile.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching lender portfolio:', error);
    throw new Error('Failed to fetch portfolio');
  }

  return data || [];
}

export async function getActiveLoanDetails(loanId: string) {
  const supabase = createServerSupabaseClient();
  
  const { data: loan, error: loanError } = await supabase
    .from('active_loans')
    .select(`
      *,
      borrower:profiles!borrower_id(
        id,
        full_name,
        email,
        phone_number,
        borrower_profile:borrower_profiles(
          reputation_score,
          is_risky,
          was_risky_before
        )
      ),
      loan_request:loan_requests(
        purpose,
        amount,
        duration_months
      )
    `)
    .eq('id', loanId)
    .single();

  if (loanError) {
    console.error('Error fetching loan details:', loanError);
    throw new Error('Failed to fetch loan details');
  }

  // Get payment history
  const { data: payments, error: paymentsError } = await supabase
    .from('loan_payments')
    .select('*')
    .eq('active_loan_id', loanId)
    .order('payment_date', { ascending: false });

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
  }

  return {
    loan,
    payments: payments || []
  };
}

export async function updateLoanStatus(
  loanId: string,
  status: 'active' | 'completed' | 'defaulted',
  notes?: string
) {
  const supabase = createServerSupabaseClient();
  
  // Update loan status
  const { error } = await supabase
    .from('active_loans')
    .update({ 
      status,
      notes,
      updated_at: new Date().toISOString(),
      actual_end_date: status === 'completed' ? new Date().toISOString() : null
    })
    .eq('id', loanId);

  if (error) {
    console.error('Error updating loan status:', error);
    throw new Error('Failed to update loan status');
  }

  revalidatePath('/lender/dashboard');
  return { success: true };
}