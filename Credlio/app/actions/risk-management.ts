'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { revalidatePath } from 'next/cache';

export async function markBorrowerAsRisky(borrowerId: string, reason: string) {
  const supabase = createServerSupabaseClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || (profile.role !== 'lender' && profile.role !== 'admin')) {
    throw new Error('Forbidden: Only lenders and admins can mark borrowers as risky');
  }

  // Call the database function
  const { data, error } = await supabase.rpc('mark_borrower_risky', {
    p_borrower_id: borrowerId,
    p_reason: reason,
    p_marked_by: profile.id
  });

  if (error) {
    throw new Error('Failed to mark borrower as risky');
  }

  revalidatePath('/lender/dashboard');
  revalidatePath(`/borrower/${borrowerId}`);
  
  return { success: true, data };
}

export async function markBorrowerAsImproved(borrowerId: string, reason: string) {
  const supabase = createServerSupabaseClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || (profile.role !== 'lender' && profile.role !== 'admin')) {
    throw new Error('Forbidden: Only lenders and admins can mark borrowers as improved');
  }

  // Call the database function
  const { data, error } = await supabase.rpc('mark_borrower_improved', {
    p_borrower_id: borrowerId,
    p_reason: reason,
    p_marked_by: profile.id
  });

  if (error) {
    throw new Error('Failed to mark borrower as improved');
  }

  revalidatePath('/lender/dashboard');
  revalidatePath(`/borrower/${borrowerId}`);
  
  return { success: true, data };
}

export async function checkAndAutoImproveBorrower(loanId: string) {
  const supabase = createServerSupabaseClient();
  
  // This would be called when a payment is made
  // The database function checks if the loan is fully paid and auto-improves if needed
  const { data, error } = await supabase.rpc('check_and_auto_improve_borrower', {
    p_loan_id: loanId
  });

  if (error) {
    console.error('Error checking auto-improvement:', error);
    return { success: false, error };
  }

  if (data) {
    revalidatePath('/lender/dashboard');
    revalidatePath('/borrower/dashboard');
  }
  
  return { success: true, improved: data };
}

export async function getBorrowerRiskHistory(borrowerId: string) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('borrower_risk_history')
    .select(`
      *,
      performed_by:profiles!performed_by(
        full_name,
        role
      )
    `)
    .eq('borrower_id', borrowerId)
    .order('performed_at', { ascending: false });

  if (error) {
    console.error('Error fetching risk history:', error);
    return [];
  }

  return data;
}