'use client';

import { useState, useEffect } from 'react';
import { ConversationList } from './conversation-list';
import { ChatWindow } from './chat-window';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, MessageSquarePlus, Users } from 'lucide-react';
import { toast } from 'sonner';

interface ChatContainerProps {
  currentUserId: string;
}

export function ChatContainer({ currentUserId }: ChatContainerProps) {
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSelectConversation = (conversation: any) => {
    setSelectedConversation(conversation);
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users?search=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const data = await response.json();
      setSearchResults(data.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartConversation = async (otherUserId: string) => {
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otherUserId }),
      });

      if (!response.ok) {
        throw new Error('Failed to start conversation');
      }

      const data = await response.json();
      
      const userResponse = await fetch(`/api/users?id=${otherUserId}`);
      const userData = await userResponse.json();
      
      setSelectedConversation({
        id: data.conversationId,
        otherParticipant: userData.user,
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
        createdAt: new Date().toISOString()
      });
      
      setIsNewChatOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      
      toast.success('Conversation started');
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <div className="mb-4">
            <Button 
              onClick={() => setIsNewChatOpen(true)}
              className="w-full"
            >
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              New Message
            </Button>
          </div>
          
          <ConversationList
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversation?.id}
          />
        </div>

        <div className="md:col-span-2">
          {selectedConversation ? (
            <ChatWindow
              conversationId={selectedConversation.id}
              otherParticipant={selectedConversation.otherParticipant}
              currentUserId={currentUserId}
            />
          ) : (
            <div className="h-[600px] flex items-center justify-center border rounded-lg bg-muted/10">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Select a conversation</p>
                <p className="text-sm text-muted-foreground">
                  Choose a conversation from the list or start a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
            <DialogDescription>
              Search for a user to start messaging
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchUsers();
                  }
                }}
              />
              <Button 
                onClick={handleSearchUsers}
                disabled={isSearching}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {isSearching && (
              <div className="text-center text-muted-foreground">
                Searching...
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted cursor-pointer"
                    onClick={() => handleStartConversation(user.id)}
                  >
                    <div>
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Button size="sm">
                      Message
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !isSearching && (
              <div className="text-center text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}