/**
 * Support Chat Conversations API
 * GET - List conversations
 * POST - Create new conversation
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const adminSupabase = createAdminClient()

    // Admins can see all conversations, users see only their own
    let query = adminSupabase
      .from('support_chat_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })

    if (!['admin', 'prime_admin', 'super_admin'].includes(profile.role)) {
      query = query.eq('user_id', profile.id)
    }

    const { data: conversations, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ conversations: conversations || [] })
  } catch (error: any) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { subject } = body

    const adminSupabase = createAdminClient()

    // Check for existing open conversation
    const { data: existing } = await adminSupabase
      .from('support_chat_conversations')
      .select('*')
      .eq('user_id', profile.id)
      .in('status', ['open', 'waiting'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ conversation: existing })
    }

    // Create new conversation
    const { data: conversation, error } = await adminSupabase
      .from('support_chat_conversations')
      .insert({
        user_id: profile.id,
        subject: subject || 'Support Request',
        status: 'open',
      })
      .select()
      .single()

    if (error || !conversation) {
      throw error || new Error('Failed to create conversation')
    }

    return NextResponse.json({ conversation })
  } catch (error: any) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
