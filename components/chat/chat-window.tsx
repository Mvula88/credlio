'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Paperclip, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useRealtimeMessages } from '@/hooks/use-chat-realtime';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender: {
    id: string;
    full_name: string;
    profile_picture_url: string | null;
  };
  created_at: string;
  is_read: boolean;
  attachments?: any[];
}

interface ChatWindowProps {
  conversationId: string;
  otherParticipant: {
    id: string;
    full_name: string;
    profile_picture_url: string | null;
    online_status?: boolean;
  };
  currentUserId: string;
}

export function ChatWindow({ conversationId, otherParticipant, currentUserId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useRealtimeMessages({
    conversationId,
    onNewMessage: (message) => {
      if (message.sender_id !== currentUserId) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === message.id);
          if (!exists) {
            return [...prev, message];
          }
          return prev;
        });
      }
    },
    onTypingUpdate: (userId, isTyping) => {
      if (userId === otherParticipant.id) {
        setOtherUserTyping(isTyping);
      }
    }
  });

  const fetchMessages = useCallback(async (offset = 0) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/chat/conversations/${conversationId}/messages?limit=50&offset=${offset}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      
      if (offset === 0) {
        setMessages(data.messages);
      } else {
        setMessages(prev => [...data.messages, ...prev]);
      }
      
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const messageContent = newMessage;
    setNewMessage('');

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      setMessages(prev => [...prev, data.message]);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = async () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (!isTyping) {
      setIsTyping(true);
      await fetch('/api/chat/typing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          isTyping: true,
        }),
      });
    }

    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      await fetch('/api/chat/typing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          isTyping: false,
        }),
      });
    }, 1000);
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return format(date, 'HH:mm');
    } else if (date.getFullYear() === today.getFullYear()) {
      return format(date, 'MMM d, HH:mm');
    } else {
      return format(date, 'MMM d yyyy, HH:mm');
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={otherParticipant.profile_picture_url || undefined} />
            <AvatarFallback>
              {otherParticipant.full_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{otherParticipant.full_name}</h3>
            {otherParticipant.online_status && (
              <span className="text-xs text-green-500">Online</span>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {isLoading && messages.length === 0 ? (
          <div className="text-center text-muted-foreground">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground">
            Start a conversation with {otherParticipant.full_name}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isCurrentUser = message.sender_id === currentUserId;
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] ${
                      isCurrentUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    } rounded-lg p-3`}
                  >
                    {!isCurrentUser && (
                      <div className="text-xs font-semibold mb-1">
                        {message.sender.full_name}
                      </div>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <div className={`text-xs mt-1 ${
                      isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {formatMessageTime(message.created_at)}
                      {isCurrentUser && message.is_read && ' • Read'}
                    </div>
                  </div>
                </div>
              );
            })}
            {otherUserTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 max-w-[70%]">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            disabled={isSending}
            className="flex-1"
          />
          <Button type="submit" disabled={isSending || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}