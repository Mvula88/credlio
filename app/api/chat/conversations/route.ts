import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
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

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant1:profiles!conversations_participant1_id_fkey(
          id,
          full_name,
          profile_picture_url,
          online_status
        ),
        participant2:profiles!conversations_participant2_id_fkey(
          id,
          full_name,
          profile_picture_url,
          online_status
        ),
        messages(
          id,
          content,
          is_read,
          sender_id,
          created_at
        )
      `)
      .or(`participant1_id.eq.${profile.id},participant2_id.eq.${profile.id}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedConversations = conversations?.map(conv => {
      const otherParticipant = conv.participant1_id === profile.id 
        ? conv.participant2 
        : conv.participant1;
      
      const unreadCount = conv.messages?.filter(
        (msg: any) => msg.sender_id !== profile.id && !msg.is_read
      ).length || 0;

      return {
        id: conv.id,
        otherParticipant,
        lastMessage: conv.last_message_preview,
        lastMessageAt: conv.last_message_at,
        unreadCount,
        createdAt: conv.created_at
      };
    });

    return NextResponse.json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Error in GET /api/chat/conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { otherUserId } = await request.json();

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'Other user ID is required' },
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

    const { data: conversation, error } = await supabase
      .rpc('get_or_create_conversation', {
        user1_id: profile.id,
        user2_id: otherUserId
      });

    if (error) {
      console.error('Error creating conversation:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversationId: conversation });
  } catch (error) {
    console.error('Error in POST /api/chat/conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}