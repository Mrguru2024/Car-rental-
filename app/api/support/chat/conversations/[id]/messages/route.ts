/**
 * Support Chat Messages API
 * GET - Get messages for a conversation
 * POST - Send a new message
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify user has access to this conversation
    const { data: conversation } = await supabase
      .from('support_chat_conversations')
      .select('*')
      .eq('id', id)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const isAdmin = ['admin', 'prime_admin', 'super_admin'].includes(profile.role)
    if (!isAdmin && conversation.user_id !== profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = createAdminClient()

    const { data: messages, error } = await adminSupabase
      .from('support_chat_messages')
      .select(`
        *,
        profiles!support_chat_messages_sender_id_fkey(full_name)
      `)
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    // Mark messages as read
    await adminSupabase
      .from('support_chat_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', id)
      .neq('sender_id', profile.id)
      .eq('is_read', false)

    return NextResponse.json({ messages: messages || [] })
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify user has access to this conversation
    const { data: conversation } = await supabase
      .from('support_chat_conversations')
      .select('*')
      .eq('id', id)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const isAdmin = ['admin', 'prime_admin', 'super_admin'].includes(profile.role)
    if (!isAdmin && conversation.user_id !== profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { message } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Determine sender role
    let senderRole = profile.role
    if (isAdmin) {
      senderRole = 'support_agent'
    }

    const { data: chatMessage, error } = await adminSupabase
      .from('support_chat_messages')
      .insert({
        conversation_id: id,
        sender_id: profile.id,
        sender_role: senderRole,
        message: message.trim(),
        is_read: false,
      })
      .select(`
        *,
        profiles!support_chat_messages_sender_id_fkey(full_name)
      `)
      .single()

    if (error || !chatMessage) {
      throw error || new Error('Failed to send message')
    }

    // Update conversation status if needed
    if (conversation.status === 'closed') {
      await adminSupabase
        .from('support_chat_conversations')
        .update({ status: 'open' })
        .eq('id', id)
    }

    return NextResponse.json({ message: chatMessage })
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
