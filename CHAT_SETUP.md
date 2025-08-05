# Chat System Setup Instructions

## Overview
The chat system has been implemented with the following features:
- Direct messaging between users (lenders and borrowers)
- Real-time message updates using Supabase Realtime
- Typing indicators
- Read receipts
- Message history
- Unread message counts
- File attachments support (database ready)

## Database Setup

1. **Run the chat system SQL script:**
   ```bash
   # Navigate to your Supabase SQL editor and run:
   scripts/setup_chat_system.sql
   ```

   This will create:
   - `conversations` table - Stores conversations between two users
   - `messages` table - Stores individual messages
   - `message_attachments` table - Stores file attachments
   - `typing_indicators` table - Tracks typing status
   - Required indexes and RLS policies
   - Helper functions for conversation management

2. **Verify the tables were created:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('conversations', 'messages', 'message_attachments', 'typing_indicators');
   ```

## File Structure

### Components Created:
- `/components/chat/chat-container.tsx` - Main chat container with conversation list and chat window
- `/components/chat/conversation-list.tsx` - Lists all user conversations
- `/components/chat/chat-window.tsx` - Individual chat window with messaging
- `/hooks/use-chat-realtime.ts` - Real-time messaging hook

### API Routes Created:
- `/app/api/chat/conversations/route.ts` - Get conversations, create new conversation
- `/app/api/chat/conversations/[conversationId]/messages/route.ts` - Get/send messages
- `/app/api/chat/typing/route.ts` - Update typing status
- `/app/api/chat/unread/route.ts` - Get unread message count

### Pages:
- `/app/messages/page.tsx` - Main messages page

## Testing the Chat System

### 1. Access the Messages Page
- Log in to your account
- Navigate to `/messages` or click "Messages" in the navigation menu
- The Messages link has been added to:
  - Admin dashboard sidebar
  - Main header dropdown menu

### 2. Start a New Conversation
1. Click the "New Message" button
2. Search for a user by name or email
3. Click on a user to start a conversation
4. Type and send your first message

### 3. Test Real-time Features
1. Open two browser windows/tabs
2. Log in with different user accounts
3. Start a conversation between the two users
4. Send messages from one account and watch them appear instantly in the other
5. Start typing to see the typing indicator appear for the other user

### 4. Test Message Features
- **Send messages:** Type in the input field and press Enter or click Send
- **Read receipts:** Messages show "Read" when viewed by the recipient
- **Timestamps:** Each message shows when it was sent
- **Unread counts:** Conversation list shows unread message badges
- **Auto-scroll:** New messages automatically scroll into view

## Troubleshooting

### If messages aren't appearing:
1. Check browser console for errors
2. Verify database tables were created correctly
3. Check RLS policies are enabled
4. Ensure Supabase Realtime is enabled for the tables:
   ```sql
   -- Enable realtime for chat tables
   ALTER PUBLICATION supabase_realtime ADD TABLE messages;
   ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
   ```

### If real-time updates aren't working:
1. Check Supabase dashboard > Database > Replication
2. Ensure `messages` and `typing_indicators` tables have replication enabled
3. Check browser console for WebSocket connection errors

### If users can't be found:
1. Verify the `/api/users` endpoint is working
2. Check that profiles table has data
3. Ensure RLS policies allow user search

## Security Notes

The chat system implements:
- Row Level Security (RLS) policies to ensure users can only access their own conversations
- Authentication checks on all API endpoints
- Proper validation of message content
- Protection against accessing other users' messages

## Future Enhancements

The system is ready for:
- File/image attachments (database schema ready)
- Group chats (extend conversations table)
- Message reactions
- Message editing/deletion
- Voice/video calls integration
- Push notifications
- Message search functionality

## API Usage Examples

### Get Conversations
```javascript
fetch('/api/chat/conversations')
  .then(res => res.json())
  .then(data => console.log(data.conversations));
```

### Send a Message
```javascript
fetch('/api/chat/conversations/[conversationId]/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Hello!'
  })
});
```

### Start a New Conversation
```javascript
fetch('/api/chat/conversations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    otherUserId: 'user-uuid-here'
  })
});
```