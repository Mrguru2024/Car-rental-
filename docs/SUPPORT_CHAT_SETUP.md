# Support Chat System Setup

This document explains the customer support chat system implementation.

## Overview

The support chat system provides:
- **Authenticated Users**: Real-time chat interface with support team
- **Guests**: Email support option (no chat access)
- **Real-time Updates**: Messages appear instantly using Supabase subscriptions
- **Persistent Conversations**: Chat history is saved and accessible across sessions

## Database Setup

### Migration

Run the migration file to create the necessary tables:

```sql
supabase/migrations/024_add_support_chat_system.sql
```

This creates:
1. **support_chat_conversations** - Conversation records
2. **support_chat_messages** - Message history
3. **support_chat_attachments** - File attachments (optional)

### Tables

#### support_chat_conversations
- `id` - UUID primary key
- `user_id` - Reference to profiles table
- `subject` - Conversation subject/title
- `status` - open, waiting, closed, resolved
- `priority` - low, normal, high, urgent
- `assigned_to` - Admin/support agent assigned
- `last_message_at` - Timestamp of last message
- `created_at`, `updated_at` - Timestamps

#### support_chat_messages
- `id` - UUID primary key
- `conversation_id` - Reference to conversation
- `sender_id` - Reference to profiles table
- `sender_role` - Role of sender
- `message` - Message content
- `is_read` - Read status
- `read_at` - When message was read
- `created_at` - Timestamp

## Features

### For Users

1. **Chat Widget**
   - Appears on all pages (bottom-right corner)
   - Floating button when closed
   - Expandable chat window
   - Minimize/maximize functionality

2. **Real-time Messaging**
   - Instant message delivery
   - Read receipts
   - Unread message indicators
   - Message timestamps

3. **Conversation Management**
   - Automatic conversation creation
   - Resume existing conversations
   - View conversation history

### For Guests

- **Email Support Button**
  - Opens default email client
  - Pre-filled with support email
  - Subject line included

### For Admins

- View all conversations
- Assign conversations
- Set priority levels
- Update conversation status
- Respond to messages

## Component Structure

### ChatWidget Component

Location: `components/Support/ChatWidget/index.tsx`

**Features:**
- Authentication check
- Conversation loading
- Real-time message subscriptions
- Message sending
- UI state management (open/closed/minimized)

**Props:** None (uses context and hooks)

### API Endpoints

#### GET /api/support/chat/conversations
- Lists conversations for authenticated user
- Admins see all conversations
- Users see only their own

#### POST /api/support/chat/conversations
- Creates new conversation
- Returns existing open conversation if available
- Requires authentication

#### GET /api/support/chat/conversations/[id]/messages
- Gets all messages for a conversation
- Marks messages as read
- Requires access to conversation

#### POST /api/support/chat/conversations/[id]/messages
- Sends a new message
- Updates conversation timestamp
- Requires access to conversation

## Usage

### For Users

1. **Starting a Chat**
   - Click the "Support Chat" button (bottom-right)
   - Click "Start Chat" if no conversation exists
   - Type your message and press Enter or click Send

2. **Continuing a Chat**
   - Existing open conversations load automatically
   - Click the chat button to resume
   - Unread messages show a red indicator

3. **Minimizing Chat**
   - Click the minimize button (up arrow)
   - Chat stays accessible but minimized
   - Click again to expand

### For Admins

Admins can access all conversations through the admin panel (to be implemented) or directly via API.

## Real-time Updates

The chat uses Supabase real-time subscriptions to:
- Receive new messages instantly
- Update unread counts
- Show typing indicators (future enhancement)

## Security

### Row Level Security (RLS)

- Users can only view their own conversations
- Admins can view all conversations
- Messages are protected by conversation access
- All operations require authentication

### API Security

- All endpoints require authentication
- User access is verified before operations
- Admin operations require admin role

## Customization

### Email Address

Update the support email in `components/Support/ChatWidget/index.tsx`:

```tsx
window.location.href = 'mailto:YOUR_EMAIL@domain.com?subject=Support Request'
```

### Styling

The component uses Tailwind CSS classes and can be customized:
- Colors: `brand-blue`, `brand-green`, etc.
- Sizes: Adjust `h-[600px] w-96` for window size
- Position: Change `bottom-4 right-4` for placement

### Features to Add

Potential enhancements:
- File attachments
- Typing indicators
- Read receipts
- Message reactions
- Admin dashboard for managing conversations
- Email notifications for new messages
- Chat history search
- Conversation categories/tags

## Troubleshooting

### Chat Not Appearing

1. **Check Authentication**
   - Ensure user is logged in
   - Verify profile exists in database

2. **Check Database**
   - Verify migration ran successfully
   - Check RLS policies are enabled

3. **Check Console**
   - Look for JavaScript errors
   - Check network requests

### Messages Not Sending

1. **Check API Response**
   - Open browser DevTools → Network tab
   - Look for failed requests to `/api/support/chat/...`

2. **Check Permissions**
   - Verify user has profile
   - Check RLS policies allow access

3. **Check Database**
   - Ensure conversation exists
   - Verify user_id matches

### Real-time Not Working

1. **Check Supabase Connection**
   - Verify Supabase URL and keys
   - Check network connectivity

2. **Check Subscriptions**
   - Look for subscription errors in console
   - Verify channel name is correct

## Production Considerations

1. **Rate Limiting**
   - Implement rate limiting on message endpoints
   - Prevent spam/abuse

2. **Message Limits**
   - Consider message length limits
   - Implement file size limits for attachments

3. **Monitoring**
   - Monitor conversation volumes
   - Track response times
   - Set up alerts for high-priority conversations

4. **Backup**
   - Regular database backups
   - Archive old conversations

5. **Performance**
   - Index database tables properly
   - Paginate message history for long conversations
   - Optimize real-time subscriptions
