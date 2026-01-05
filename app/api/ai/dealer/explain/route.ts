/**
 * DealerOps AI - Policy & Condition Explanation
 * POST /api/ai/dealer/explain
 * 
 * Explains booking conditions and policies to dealers in plain language.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { DealerOpsInputSchema, DealerOpsOutputSchema } from '@/lib/ai/schemas'
import { callAIAgent, getSystemPrompt } from '@/lib/ai/openai-client'
import { logAICall } from '@/lib/ai/audit'
import type { DealerOpsInput, DealerOpsOutput } from '@/lib/ai/schemas'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only dealers and admins can request explanations
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const isDealer = ['dealer', 'private_host'].includes(profile.role)
    const isAdmin = ['admin', 'prime_admin', 'super_admin'].includes(profile.role)

    if (!isDealer && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedInput = DealerOpsInputSchema.parse(body)

    // Verify dealer has access to this booking
    if (isDealer) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('vehicles(dealer_id)')
        .eq('id', validatedInput.booking_id)
        .single()

      const vehicle = booking?.vehicles as any
      if (vehicle?.dealer_id !== profile.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Call AI agent
    const systemPrompt = getSystemPrompt('dealerops_ai')
    const userPrompt = JSON.stringify(validatedInput, null, 2)

    let aiOutput: DealerOpsOutput
    let aiRunId = ''
    let errorMessage: string | undefined

    try {
      aiOutput = await callAIAgent<DealerOpsOutput>({
        agentName: 'dealerops_ai',
        systemPrompt,
        userPrompt,
      })

      // Validate output
      aiOutput = DealerOpsOutputSchema.parse(aiOutput)

      // Log to database
      aiRunId = await logAICall({
        agentName: 'dealerops_ai',
        inputJson: validatedInput,
        outputJson: aiOutput,
        createdBy: profile.id,
        bookingId: validatedInput.booking_id,
        dealerId: isDealer ? profile.id : undefined,
        status: 'success',
      })
    } catch (error: any) {
      errorMessage = error.message || 'AI call failed'
      console.error('DealerOps AI error:', error)

      // Log failure
      await logAICall({
        agentName: 'dealerops_ai',
        inputJson: validatedInput,
        outputJson: {},
        createdBy: profile.id,
        bookingId: validatedInput.booking_id,
        dealerId: isDealer ? profile.id : undefined,
        status: 'failed',
        errorMessage,
      })

      return NextResponse.json(
        { error: 'AI explanation failed', details: errorMessage },
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

    console.error('Dealer explain error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
