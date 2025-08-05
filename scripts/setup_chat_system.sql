-- Setup Chat System for Credlio
-- This script creates the necessary tables and functions for the chat feature

-- Create conversations table (for direct messages between two users)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_message_preview TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_conversation UNIQUE(participant1_id, participant2_id),
    CONSTRAINT different_participants CHECK (participant1_id != participant2_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create message attachments table
CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create typing indicators table (for real-time typing status)
CREATE TABLE IF NOT EXISTS public.typing_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_typing UNIQUE(conversation_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON public.conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON public.conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read ON public.messages(is_read);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON public.message_attachments(message_id);

-- Function to get or create a conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
    user1_id UUID,
    user2_id UUID
)
RETURNS UUID AS $$
DECLARE
    conversation_uuid UUID;
    p1_id UUID;
    p2_id UUID;
BEGIN
    -- Normalize the order of participants
    IF user1_id < user2_id THEN
        p1_id := user1_id;
        p2_id := user2_id;
    ELSE
        p1_id := user2_id;
        p2_id := user1_id;
    END IF;
    
    -- Try to find existing conversation
    SELECT id INTO conversation_uuid
    FROM public.conversations
    WHERE participant1_id = p1_id AND participant2_id = p2_id;
    
    -- If not found, create new conversation
    IF conversation_uuid IS NULL THEN
        INSERT INTO public.conversations (participant1_id, participant2_id)
        VALUES (p1_id, p2_id)
        RETURNING id INTO conversation_uuid;
    END IF;
    
    RETURN conversation_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to update conversation metadata when a message is sent
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET 
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100),
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update conversation on new message
CREATE TRIGGER update_conversation_after_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_on_message();

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.messages
    SET 
        is_read = TRUE,
        read_at = NOW()
    WHERE 
        conversation_id = p_conversation_id 
        AND sender_id != p_user_id
        AND is_read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO unread_count
    FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE 
        m.is_read = FALSE 
        AND m.sender_id != p_user_id
        AND (c.participant1_id = p_user_id OR c.participant2_id = p_user_id);
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS for chat tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations"
    ON public.conversations FOR SELECT
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.profiles 
            WHERE id = participant1_id OR id = participant2_id
        )
    );

CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT auth_user_id FROM public.profiles 
            WHERE id = participant1_id OR id = participant2_id
        )
    );

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND auth.uid() IN (
                SELECT auth_user_id FROM public.profiles 
                WHERE id = c.participant1_id OR id = c.participant2_id
            )
        )
    );

CREATE POLICY "Users can send messages in their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND auth.uid() IN (
                SELECT auth_user_id FROM public.profiles 
                WHERE id = c.participant1_id OR id = c.participant2_id
            )
        )
        AND sender_id IN (
            SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own messages"
    ON public.messages FOR UPDATE
    USING (
        sender_id IN (
            SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
        )
    );

-- RLS Policies for message attachments
CREATE POLICY "Users can view attachments in their conversations"
    ON public.message_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.conversations c ON m.conversation_id = c.id
            WHERE m.id = message_id
            AND auth.uid() IN (
                SELECT auth_user_id FROM public.profiles 
                WHERE id = c.participant1_id OR id = c.participant2_id
            )
        )
    );

CREATE POLICY "Users can add attachments to their messages"
    ON public.message_attachments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.messages m
            WHERE m.id = message_id
            AND m.sender_id IN (
                SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
            )
        )
    );

-- RLS Policies for typing indicators
CREATE POLICY "Users can view typing indicators in their conversations"
    ON public.typing_indicators FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND auth.uid() IN (
                SELECT auth_user_id FROM public.profiles 
                WHERE id = c.participant1_id OR id = c.participant2_id
            )
        )
    );

CREATE POLICY "Users can manage their own typing indicators"
    ON public.typing_indicators FOR ALL
    USING (
        user_id IN (
            SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.message_attachments TO authenticated;
GRANT ALL ON public.typing_indicators TO authenticated;

-- Add chat-related columns to profiles if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS online_status BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create view for conversation list with user details
CREATE OR REPLACE VIEW public.conversation_list AS
SELECT 
    c.id,
    c.participant1_id,
    c.participant2_id,
    c.last_message_at,
    c.last_message_preview,
    c.created_at,
    p1.full_name as participant1_name,
    p1.profile_picture_url as participant1_avatar,
    p1.online_status as participant1_online,
    p2.full_name as participant2_name,
    p2.profile_picture_url as participant2_avatar,
    p2.online_status as participant2_online,
    (
        SELECT COUNT(*) 
        FROM public.messages m 
        WHERE m.conversation_id = c.id 
        AND m.is_read = FALSE
    ) as unread_count
FROM public.conversations c
JOIN public.profiles p1 ON c.participant1_id = p1.id
JOIN public.profiles p2 ON c.participant2_id = p2.id;

-- Grant access to the view
GRANT SELECT ON public.conversation_list TO authenticated;

COMMENT ON TABLE public.conversations IS 'Stores direct message conversations between users';
COMMENT ON TABLE public.messages IS 'Stores individual messages within conversations';
COMMENT ON TABLE public.message_attachments IS 'Stores file attachments for messages';
COMMENT ON TABLE public.typing_indicators IS 'Tracks real-time typing status for users in conversations';