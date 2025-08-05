'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeMessagesProps {
  conversationId: string;
  onNewMessage?: (message: any) => void;
  onTypingUpdate?: (userId: string, isTyping: boolean) => void;
}

export function useRealtimeMessages({ 
  conversationId, 
  onNewMessage,
  onTypingUpdate 
}: UseRealtimeMessagesProps) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!conversationId) return;

    const messageChannel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          if (onNewMessage && payload.new) {
            const { data: messageWithSender } = await supabase
              .from('messages')
              .select(`
                *,
                sender:profiles!messages_sender_id_fkey(
                  id,
                  full_name,
                  profile_picture_url
                )
              `)
              .eq('id', payload.new.id)
              .single();
            
            if (messageWithSender) {
              onNewMessage(messageWithSender);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (onTypingUpdate && payload.new) {
            const data = payload.new as any;
            onTypingUpdate(data.user_id, data.is_typing);
          }
        }
      )
      .subscribe();

    setChannel(messageChannel);

    return () => {
      if (messageChannel) {
        supabase.removeChannel(messageChannel);
      }
    };
  }, [conversationId, onNewMessage, onTypingUpdate, supabase]);

  const unsubscribe = useCallback(() => {
    if (channel) {
      supabase.removeChannel(channel);
      setChannel(null);
    }
  }, [channel, supabase]);

  return { unsubscribe };
}

export function useUnreadMessages(userId: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/unread');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          const { data: conversation } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', newMessage.conversation_id)
            .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
            .single();
          
          if (conversation && newMessage.sender_id !== userId) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const updatedMessage = payload.new as any;
          const oldMessage = payload.old as any;
          
          if (!oldMessage.is_read && updatedMessage.is_read) {
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchUnreadCount, supabase]);

  return { unreadCount, refetch: fetchUnreadCount };
}