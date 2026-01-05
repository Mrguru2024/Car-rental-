/**
 * EvidencePack AI - Dispute Evidence Organization
 * POST /api/ai/disputes/evidence-pack
 * 
 * Structures dispute evidence into a timeline and summary.
 * Does NOT decide fault or liability.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { EvidencePackInputSchema, EvidencePackOutputSchema } from '@/lib/ai/schemas'
import { callAIAgent, getSystemPrompt } from '@/lib/ai/openai-client'
import { logAICall } from '@/lib/ai/audit'
import type { EvidencePackInput, EvidencePackOutput } from '@/lib/ai/schemas'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can request evidence packs
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !['admin', 'prime_admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedInput = EvidencePackInputSchema.parse(body)

    // Call AI agent
    const systemPrompt = getSystemPrompt('evidencepack_ai')
    const userPrompt = JSON.stringify(validatedInput, null, 2)

    let aiOutput: EvidencePackOutput
    let aiRunId = ''
    let errorMessage: string | undefined

    try {
      aiOutput = await callAIAgent<EvidencePackOutput>({
        agentName: 'evidencepack_ai',
        systemPrompt,
        userPrompt,
      })

      // Validate output
      aiOutput = EvidencePackOutputSchema.parse(aiOutput)

      // Log to database
      aiRunId = await logAICall({
        agentName: 'evidencepack_ai',
        inputJson: validatedInput,
        outputJson: aiOutput,
        createdBy: profile.id,
        bookingId: validatedInput.booking_id,
        status: 'success',
      })
    } catch (error: any) {
      errorMessage = error.message || 'AI call failed'
      console.error('EvidencePack AI error:', error)

      // Log failure
      await logAICall({
        agentName: 'evidencepack_ai',
        inputJson: validatedInput,
        outputJson: {},
        createdBy: profile.id,
        bookingId: validatedInput.booking_id,
        status: 'failed',
        errorMessage,
      })

      return NextResponse.json(
        { error: 'AI evidence pack failed', details: errorMessage },
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

    console.error('Evidence pack error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
