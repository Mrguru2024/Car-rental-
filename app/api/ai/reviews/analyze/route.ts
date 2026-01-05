/**
 * Feedback Intelligence AI - Review Pattern Analysis
 * POST /api/ai/reviews/analyze
 * 
 * Analyzes review patterns to detect operational signals.
 * Does not create public ratings or scores.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import {
  FeedbackIntelligenceInputSchema,
  FeedbackIntelligenceOutputSchema,
} from '@/lib/ai/schemas'
import { callAIAgent, getSystemPrompt } from '@/lib/ai/openai-client'
import { logAICall } from '@/lib/ai/audit'
import type { FeedbackIntelligenceInput, FeedbackIntelligenceOutput } from '@/lib/ai/schemas'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can request review analysis
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !['admin', 'prime_admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedInput = FeedbackIntelligenceInputSchema.parse(body)

    // Call AI agent
    const systemPrompt = getSystemPrompt('feedback_intelligence_ai')
    const userPrompt = JSON.stringify(validatedInput, null, 2)

    let aiOutput: FeedbackIntelligenceOutput
    let aiRunId = ''
    let errorMessage: string | undefined

    try {
      aiOutput = await callAIAgent<FeedbackIntelligenceOutput>({
        agentName: 'feedback_intelligence_ai',
        systemPrompt,
        userPrompt,
      })

      // Validate output
      aiOutput = FeedbackIntelligenceOutputSchema.parse(aiOutput)

      // Log to database
      aiRunId = await logAICall({
        agentName: 'feedback_intelligence_ai',
        inputJson: validatedInput,
        outputJson: aiOutput,
        createdBy: profile.id,
        status: 'success',
      })

      // Store review signal
      if (aiRunId) {
        const adminSupabase = createAdminClient()
        await adminSupabase.from('review_signals').insert({
          entity_type: validatedInput.entity_type,
          entity_id: validatedInput.entity_id,
          pattern_level: aiOutput.pattern_level,
          signals: aiOutput.signals,
          retaliation_risk: aiOutput.retaliation_risk || null,
          recommended_ops_action: aiOutput.recommended_ops_action,
          notes: aiOutput.notes,
          ai_run_id: aiRunId,
        })
      }
    } catch (error: any) {
      errorMessage = error.message || 'AI call failed'
      console.error('Feedback Intelligence AI error:', error)

      // Log failure
      await logAICall({
        agentName: 'feedback_intelligence_ai',
        inputJson: validatedInput,
        outputJson: {},
        createdBy: profile.id,
        status: 'failed',
        errorMessage,
      })

      return NextResponse.json(
        { error: 'AI analysis failed', details: errorMessage },
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

    console.error('Review analyze error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
