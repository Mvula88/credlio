import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile and check if they're a lender or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile || (profile.role !== 'lender' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { borrowerId, reason } = await request.json();

    if (!borrowerId) {
      return NextResponse.json({ error: 'Borrower ID is required' }, { status: 400 });
    }

    // Call the database function to mark borrower as risky
    const { data, error } = await supabase.rpc('mark_borrower_risky', {
      p_borrower_id: borrowerId,
      p_reason: reason || 'Marked as risky by lender',
      p_marked_by: profile.id
    });

    if (error) {
      console.error('Error marking borrower as risky:', error);
      return NextResponse.json({ error: 'Failed to mark borrower as risky' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Borrower marked as risky',
      data 
    });
  } catch (error) {
    console.error('Error in mark-risky route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}