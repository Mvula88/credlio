import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { conversationId } = params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .or(`participant1_id.eq.${profile.id},participant2_id.eq.${profile.id}`)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(
          id,
          full_name,
          profile_picture_url
        ),
        attachments:message_attachments(*)
      `)
      .eq('conversation_id', conversationId)
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.rpc('mark_messages_as_read', {
      p_conversation_id: conversationId,
      p_user_id: profile.id
    });

    return NextResponse.json({ 
      messages: messages?.reverse() || [],
      hasMore: messages?.length === limit 
    });
  } catch (error) {
    console.error('Error in GET /api/chat/conversations/[conversationId]/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { conversationId } = params;
    const { content, attachments } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
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

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .or(`participant1_id.eq.${profile.id},participant2_id.eq.${profile.id}`)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        content: content.trim()
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(
          id,
          full_name,
          profile_picture_url
        )
      `)
      .single();

    if (messageError) {
      console.error('Error sending message:', messageError);
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }

    if (attachments && attachments.length > 0) {
      const attachmentData = attachments.map((att: any) => ({
        message_id: message.id,
        file_name: att.fileName,
        file_url: att.fileUrl,
        file_type: att.fileType,
        file_size: att.fileSize
      }));

      const { error: attachmentError } = await supabase
        .from('message_attachments')
        .insert(attachmentData);

      if (attachmentError) {
        console.error('Error adding attachments:', attachmentError);
      }
    }

    const otherParticipantId = conversation.participant1_id === profile.id
      ? conversation.participant2_id
      : conversation.participant1_id;

    const { data: otherParticipant } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', otherParticipantId)
      .single();

    if (otherParticipant) {
      await supabase
        .from('notifications')
        .insert({
          profile_id: otherParticipantId,
          title: 'New Message',
          message: `${message.sender.full_name} sent you a message`,
          type: 'message',
          metadata: {
            conversation_id: conversationId,
            message_id: message.id,
            sender_id: profile.id
          }
        });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error in POST /api/chat/conversations/[conversationId]/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}