'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { redirect } from 'next/navigation';

interface CountryRiskStatistics {
  total_risky_borrowers: number;
  total_blacklisted: number;
  total_off_platform_defaulters: number;
  total_ghost_defaulters: number;
  total_active_loans: number;
  total_overdue_loans: number;
  total_defaulted_loans: number;
  total_loan_amount: number;
  total_overdue_amount: number;
  total_lenders: number;
  total_borrowers: number;
  new_borrowers_this_month: number;
  new_lenders_this_month: number;
}

interface GlobalStatistics {
  country_code: string;
  country_name: string;
  total_risky_borrowers: number;
  total_blacklisted: number;
  total_off_platform_defaulters: number;
  total_ghost_defaulters: number;
  total_active_loans: number;
  total_loan_amount: number;
  total_overdue_amount: number;
  total_users: number;
  platform_health_score: number;
}

interface RiskActivity {
  activity_type: string;
  activity_description: string;
  actor_name: string;
  target_name: string;
  activity_date: string;
  severity: 'low' | 'medium' | 'high';
}

export async function getCountryRiskStatistics(countryCode: string): Promise<CountryRiskStatistics | null> {
  const supabase = createServerSupabaseClient();
  
  // Verify admin access
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/auth/signin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, country_id, country:countries(code)')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    redirect('/');
  }

  // For country admin, ensure they can only see their country's data
  if (profile.role === 'admin' && (profile.country as any)?.code !== countryCode) {
    return null;
  }

  const { data, error } = await supabase.rpc('get_country_risk_statistics', {
    p_country_code: countryCode
  });

  if (error) {
    console.error('Error fetching country statistics:', error);
    return null;
  }

  return data?.[0] || null;
}

export async function getGlobalAdminStatistics(): Promise<GlobalStatistics[]> {
  const supabase = createServerSupabaseClient();
  
  // Verify super admin access
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/auth/signin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || profile.role !== 'super_admin') {
    redirect('/');
  }

  const { data, error } = await supabase.rpc('get_global_admin_statistics');

  if (error) {
    console.error('Error fetching global statistics:', error);
    return [];
  }

  return data || [];
}

export async function getRecentRiskActivities(
  countryCode?: string,
  limit: number = 20
): Promise<RiskActivity[]> {
  const supabase = createServerSupabaseClient();
  
  // Verify admin access
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/auth/signin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, country_id, country:countries(code)')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    redirect('/');
  }

  // For country admin, force their country code
  const effectiveCountryCode = profile.role === 'admin' 
    ? (profile.country as any)?.code 
    : countryCode;

  const { data, error } = await supabase.rpc('get_recent_risk_activities', {
    p_country_code: effectiveCountryCode,
    p_limit: limit
  });

  if (error) {
    console.error('Error fetching risk activities:', error);
    return [];
  }

  return data || [];
}

export async function refreshAdminStatistics() {
  const supabase = createServerSupabaseClient();
  
  // Verify admin access
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase.rpc('refresh_admin_statistics');

  if (error) {
    console.error('Error refreshing statistics:', error);
    return { error: 'Failed to refresh statistics' };
  }

  return { success: true };
}

export async function getAdminRiskSummary(countryCode?: string) {
  const supabase = createServerSupabaseClient();
  
  // Verify admin access
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/auth/signin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, country_id, country:countries(code)')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    redirect('/');
  }

  let query = supabase.from('admin_risk_summary').select('*');
  
  // For country admin, filter by their country
  if (profile.role === 'admin' && (profile.country as any)?.code) {
    query = query.eq('country_code', (profile.country as any).code);
  } else if (countryCode) {
    query = query.eq('country_code', countryCode);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching risk summary:', error);
    return [];
  }

  return data || [];
}