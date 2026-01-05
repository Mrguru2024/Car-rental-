/**
 * TrustGate AI - Booking Risk Assessment
 * POST /api/ai/trustgate/assess
 * 
 * Advisory-only risk assessment for bookings.
 * Returns risk tier and recommended conditions.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { TrustGateInputSchema, TrustGateOutputSchema } from '@/lib/ai/schemas'
import { callAIAgent, getSystemPrompt } from '@/lib/ai/openai-client'
import { logAICall } from '@/lib/ai/audit'
import type { TrustGateInput, TrustGateOutput } from '@/lib/ai/schemas'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins, dealers, and renters can request assessments
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    
    // Validate input
    const validatedInput = TrustGateInputSchema.parse(body)
    const bookingId = validatedInput.booking.booking_id

    // Verify user has access to this booking
    const adminSupabase = createAdminClient()
    const { data: booking } = await adminSupabase
      .from('bookings')
      .select('renter_id, vehicles(dealer_id)')
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const vehicle = booking.vehicles as any
    const isRenter = booking.renter_id === user.id
    const isDealer = vehicle?.dealer_id === profile.id
    const isAdmin = ['admin', 'prime_admin', 'super_admin'].includes(profile.role)

    if (!isRenter && !isDealer && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Call AI agent
    const systemPrompt = getSystemPrompt('trustgate_ai')
    const userPrompt = JSON.stringify(validatedInput, null, 2)

    let aiOutput: TrustGateOutput
    let aiRunId = ''
    let errorMessage: string | undefined

    try {
      aiOutput = await callAIAgent<TrustGateOutput>({
        agentName: 'trustgate_ai',
        systemPrompt,
        userPrompt,
      })

      // Validate output
      aiOutput = TrustGateOutputSchema.parse(aiOutput)

      // Log to database
      aiRunId = await logAICall({
        agentName: 'trustgate_ai',
        inputJson: validatedInput,
        outputJson: aiOutput,
        createdBy: profile.id,
        bookingId,
        dealerId: vehicle?.dealer_id,
        renterId: booking.renter_id,
        status: 'success',
      })

      // Store recommendation
      if (aiRunId) {
        await adminSupabase.from('trustgate_recommendations').insert({
          booking_id: bookingId,
          risk_tier: aiOutput.risk_tier,
          conditions: aiOutput.recommended_conditions,
          confidence: aiOutput.confidence,
          why: aiOutput.why,
          missing_data: aiOutput.missing_data,
          ai_run_id: aiRunId,
        })
      }
    } catch (error: any) {
      errorMessage = error.message || 'AI call failed'
      console.error('TrustGate AI error:', error)

      // Log failure
      await logAICall({
        agentName: 'trustgate_ai',
        inputJson: validatedInput,
        outputJson: {},
        createdBy: profile.id,
        bookingId,
        dealerId: vehicle?.dealer_id,
        renterId: booking.renter_id,
        status: 'failed',
        errorMessage,
      })

      return NextResponse.json(
        { error: 'AI assessment failed', details: errorMessage },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...aiOutput,
      ai_run_id: aiRunId,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('TrustGate assess error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
