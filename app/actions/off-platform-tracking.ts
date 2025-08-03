'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Schema validation for off-platform defaulters
const offPlatformDefaulterSchema = z.object({
  full_name: z.string().min(2).max(100),
  phone_number: z.string().optional().nullable(),
  country_code: z.string().length(2),
  loan_type: z.enum(['cash_loan', 'business_loan', 'personal_loan', 'other']),
  reason: z.string().min(10).max(500),
});

// Schema validation for ghost borrowers
const ghostBorrowerSchema = z.object({
  full_name: z.string().min(2).max(100),
  phone_number: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  country_code: z.string().length(2),
});

// Schema validation for ghost loans
const ghostLoanSchema = z.object({
  ghost_borrower_id: z.string().uuid(),
  loan_amount: z.number().positive(),
  interest_rate: z.number().min(0).max(100),
  loan_date: z.string(),
  due_date: z.string(),
});

// Schema validation for ghost loan payments
const ghostPaymentSchema = z.object({
  ghost_loan_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_date: z.string(),
  notes: z.string().optional().nullable(),
});

export async function reportOffPlatformDefaulter(data: z.infer<typeof offPlatformDefaulterSchema>) {
  const supabase = createServerSupabaseClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  // Get user profile and verify they're a lender
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, country_id, country:countries(code)')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || profile.role !== 'lender') {
    return { error: 'Only lenders can report defaulters' };
  }

  const countryCode = (profile.country as any)?.code;
  if (!countryCode) {
    return { error: 'Country not found' };
  }

  // Validate data
  const validated = offPlatformDefaulterSchema.safeParse(data);
  if (!validated.success) {
    return { error: 'Invalid data', details: validated.error.flatten() };
  }

  // Insert the report
  const { error } = await supabase
    .from('off_platform_defaulters')
    .insert({
      ...validated.data,
      reported_by: profile.id,
    });

  if (error) {
    if (error.code === '23505') {
      return { error: 'You have already reported this person' };
    }
    return { error: 'Failed to report defaulter' };
  }

  revalidatePath('/lender/dashboard');
  return { success: true };
}

export async function createGhostBorrower(data: z.infer<typeof ghostBorrowerSchema>) {
  const supabase = createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || profile.role !== 'lender') {
    return { error: 'Only lenders can create ghost borrowers' };
  }

  const validated = ghostBorrowerSchema.safeParse(data);
  if (!validated.success) {
    return { error: 'Invalid data', details: validated.error.flatten() };
  }

  const { data: borrower, error } = await supabase
    .from('ghost_borrowers')
    .insert({
      ...validated.data,
      lender_id: profile.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'This borrower already exists' };
    }
    return { error: 'Failed to create ghost borrower' };
  }

  revalidatePath('/lender/dashboard');
  return { success: true, data: borrower };
}

export async function createGhostLoan(data: z.infer<typeof ghostLoanSchema>) {
  const supabase = createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || profile.role !== 'lender') {
    return { error: 'Only lenders can create ghost loans' };
  }

  const validated = ghostLoanSchema.safeParse(data);
  if (!validated.success) {
    return { error: 'Invalid data', details: validated.error.flatten() };
  }

  // Verify the ghost borrower belongs to this lender
  const { data: ghostBorrower } = await supabase
    .from('ghost_borrowers')
    .select('id')
    .eq('id', validated.data.ghost_borrower_id)
    .eq('lender_id', profile.id)
    .single();

  if (!ghostBorrower) {
    return { error: 'Ghost borrower not found or unauthorized' };
  }

  // Calculate total amount
  const totalAmount = validated.data.loan_amount + (validated.data.loan_amount * validated.data.interest_rate / 100);

  const { error } = await supabase
    .from('ghost_loans')
    .insert({
      ghost_borrower_id: validated.data.ghost_borrower_id,
      lender_id: profile.id,
      loan_amount: validated.data.loan_amount,
      interest_rate: validated.data.interest_rate,
      total_amount: totalAmount,
      loan_date: validated.data.loan_date,
      due_date: validated.data.due_date,
    });

  if (error) {
    return { error: 'Failed to create ghost loan' };
  }

  revalidatePath('/lender/dashboard');
  return { success: true };
}

export async function recordGhostPayment(data: z.infer<typeof ghostPaymentSchema>) {
  const supabase = createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || profile.role !== 'lender') {
    return { error: 'Only lenders can record payments' };
  }

  const validated = ghostPaymentSchema.safeParse(data);
  if (!validated.success) {
    return { error: 'Invalid data', details: validated.error.flatten() };
  }

  // Verify the ghost loan belongs to this lender
  const { data: ghostLoan } = await supabase
    .from('ghost_loans')
    .select('id')
    .eq('id', validated.data.ghost_loan_id)
    .eq('lender_id', profile.id)
    .single();

  if (!ghostLoan) {
    return { error: 'Ghost loan not found or unauthorized' };
  }

  const { error } = await supabase
    .from('ghost_loan_payments')
    .insert({
      ...validated.data,
      recorded_by: profile.id,
    });

  if (error) {
    return { error: 'Failed to record payment' };
  }

  // The trigger will automatically update loan status
  revalidatePath('/lender/dashboard');
  return { success: true };
}

export async function checkOverdueGhostLoans() {
  const supabase = createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || profile.role !== 'lender') {
    return { error: 'Only lenders can check overdue loans' };
  }

  const { error } = await supabase.rpc('check_overdue_ghost_loans');

  if (error) {
    return { error: 'Failed to check overdue loans' };
  }

  return { success: true };
}

export async function getUnifiedRiskData(countryCode: string) {
  const supabase = createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized', data: [] };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, country_id, country:countries(code)')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || profile.role !== 'lender') {
    return { error: 'Only lenders can view risk data', data: [] };
  }

  // Ensure lender can only see data from their country
  if ((profile.country as any)?.code !== countryCode) {
    return { error: 'Unauthorized country access', data: [] };
  }

  const { data, error } = await supabase
    .from('unified_risk_view')
    .select('*')
    .eq('country_code', countryCode)
    .order('flagged_at', { ascending: false });

  if (error) {
    return { error: 'Failed to fetch risk data', data: [] };
  }

  return { success: true, data: data || [] };
}