'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  otherParticipant: {
    id: string;
    full_name: string;
    profile_picture_url: string | null;
    online_status?: boolean;
  };
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
}

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string;
}

export function ConversationList({ 
  onSelectConversation, 
  selectedConversationId 
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/chat/conversations');
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastMessageTime = (timestamp: string | null) => {
    if (!timestamp) return '';
    
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <Card className="h-[600px] p-4">
        <div className="text-center text-muted-foreground">
          Loading conversations...
        </div>
      </Card>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card className="h-[600px] p-4">
        <div className="text-center text-muted-foreground">
          No conversations yet
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Messages</h2>
      </div>
      
      <ScrollArea className="h-[calc(600px-65px)]">
        <div className="p-2">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                selectedConversationId === conversation.id
                  ? 'bg-primary/10'
                  : 'hover:bg-muted'
              }`}
            >
              <Avatar>
                <AvatarImage 
                  src={conversation.otherParticipant.profile_picture_url || undefined} 
                />
                <AvatarFallback>
                  {conversation.otherParticipant.full_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium truncate">
                    {conversation.otherParticipant.full_name}
                  </p>
                  {conversation.lastMessageAt && (
                    <span className="text-xs text-muted-foreground">
                      {formatLastMessageTime(conversation.lastMessageAt)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.lastMessage || 'Start a conversation'}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <Badge variant="default" className="ml-2">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}