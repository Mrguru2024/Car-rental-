-- Support Chat System
-- Adds tables for customer support chat functionality

-- 1. Support Chat Conversations Table
CREATE TABLE IF NOT EXISTS support_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting', 'closed', 'resolved')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_chat_conversations_user_id ON support_chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_chat_conversations_status ON support_chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_chat_conversations_assigned_to ON support_chat_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_chat_conversations_last_message_at ON support_chat_conversations(last_message_at DESC);

-- 2. Support Chat Messages Table
CREATE TABLE IF NOT EXISTS support_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES support_chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('renter', 'dealer', 'private_host', 'admin', 'prime_admin', 'super_admin', 'support_agent')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_chat_messages_conversation_id ON support_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_chat_messages_sender_id ON support_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_support_chat_messages_created_at ON support_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_chat_messages_is_read ON support_chat_messages(is_read);

-- 3. Support Chat Attachments Table (optional, for file uploads)
CREATE TABLE IF NOT EXISTS support_chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES support_chat_messages(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_chat_attachments_message_id ON support_chat_attachments(message_id);

-- RLS Policies
ALTER TABLE support_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_chat_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversations
CREATE POLICY "Users can view their own conversations"
  ON support_chat_conversations
  FOR SELECT
  USING (auth.uid()::text = (SELECT user_id::text FROM profiles WHERE id = support_chat_conversations.user_id));

-- Users can create their own conversations
CREATE POLICY "Users can create their own conversations"
  ON support_chat_conversations
  FOR INSERT
  WITH CHECK (auth.uid()::text = (SELECT user_id::text FROM profiles WHERE id = support_chat_conversations.user_id));

-- Users can update their own conversations (status, etc.)
CREATE POLICY "Users can update their own conversations"
  ON support_chat_conversations
  FOR UPDATE
  USING (auth.uid()::text = (SELECT user_id::text FROM profiles WHERE id = support_chat_conversations.user_id));

-- Admins can view all conversations
CREATE POLICY "Admins can view all conversations"
  ON support_chat_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Admins can update all conversations
CREATE POLICY "Admins can update all conversations"
  ON support_chat_conversations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
  ON support_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_chat_conversations
      WHERE support_chat_conversations.id = support_chat_messages.conversation_id
      AND (
        auth.uid()::text = (SELECT user_id::text FROM profiles WHERE id = support_chat_conversations.user_id)
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
        )
      )
    )
  );

-- Users can send messages in their conversations
CREATE POLICY "Users can send messages in their conversations"
  ON support_chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_chat_conversations
      WHERE support_chat_conversations.id = support_chat_messages.conversation_id
      AND (
        auth.uid()::text = (SELECT user_id::text FROM profiles WHERE id = support_chat_conversations.user_id)
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
        )
      )
    )
    AND auth.uid()::text = (SELECT user_id::text FROM profiles WHERE id = support_chat_messages.sender_id)
  );

-- Users can update their own messages (mark as read, etc.)
CREATE POLICY "Users can update messages in their conversations"
  ON support_chat_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM support_chat_conversations
      WHERE support_chat_conversations.id = support_chat_messages.conversation_id
      AND (
        auth.uid()::text = (SELECT user_id::text FROM profiles WHERE id = support_chat_conversations.user_id)
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
        )
      )
    )
  );

-- Users can view attachments in their conversations
CREATE POLICY "Users can view attachments in their conversations"
  ON support_chat_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_chat_messages
      JOIN support_chat_conversations ON support_chat_conversations.id = support_chat_messages.conversation_id
      WHERE support_chat_messages.id = support_chat_attachments.message_id
      AND (
        auth.uid()::text = (SELECT user_id::text FROM profiles WHERE id = support_chat_conversations.user_id)
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
        )
      )
    )
  );

-- Function to update last_message_at on conversation
CREATE OR REPLACE FUNCTION update_support_chat_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_chat_conversations
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp when message is added
CREATE TRIGGER update_support_chat_conversation_on_message
  AFTER INSERT ON support_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_support_chat_conversation_timestamp();
