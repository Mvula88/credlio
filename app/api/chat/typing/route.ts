import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { conversationId, isTyping } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('typing_indicators')
      .upsert({
        conversation_id: conversationId,
        user_id: profile.id,
        is_typing: isTyping,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'conversation_id,user_id'
      });

    if (error) {
      console.error('Error updating typing indicator:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/chat/typing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}