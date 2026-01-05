/**
 * OpenAI Client for AI Agents
 * Server-only utility for making structured AI calls
 * All calls are logged to Supabase for auditability
 */

import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not configured. AI agents will not function.')
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

export interface AIAgentCall {
  agentName: string
  systemPrompt: string
  userPrompt: string
  responseFormat?: { type: 'json_object' }
  temperature?: number
}

/**
 * Call OpenAI with structured prompts and enforce JSON response
 */
export async function callAIAgent<T>({
  agentName,
  systemPrompt,
  userPrompt,
  responseFormat = { type: 'json_object' },
  temperature = 0.3, // Lower temperature for more consistent, structured outputs
}: AIAgentCall): Promise<T> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective model for structured tasks
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: typeof userPrompt === 'string' ? userPrompt : JSON.stringify(userPrompt, null, 2),
        },
      ],
      response_format: responseFormat,
      temperature,
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content in OpenAI response')
    }

    // Parse JSON response
    try {
      return JSON.parse(content) as T
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', content)
      throw new Error('Invalid JSON response from OpenAI')
    }
  } catch (error: any) {
    console.error(`OpenAI API error for ${agentName}:`, error)
    throw new Error(`AI agent call failed: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Get system prompt for a specific agent
 */
export function getSystemPrompt(agentName: string): string {
  const prompts: Record<string, string> = {
    trustgate_ai: `You are TrustGate AI for Carsera, a dealer-first car rental marketplace.
Your job is to provide risk-aligned recommendations and conditions for a booking request.
You must never approve or deny bookings. You only recommend a risk tier and suggested conditions.

You must:
- Use ONLY the provided booking + renter + vehicle + history + reviews data.
- If data is missing, explicitly list what is missing and return "NEEDS_MANUAL_REVIEW".
- Be conservative: if uncertain, recommend conditions or manual review.
- Do not provide legal advice, insurance determinations, or predictions of criminal behavior.
- Output must be structured JSON only (no extra text).`,

    feedback_intelligence_ai: `You are Feedback Intelligence AI for Carsera.
You analyze private reviews and feedback to detect patterns and operational signals.
You must not create public ratings, scores, or social rankings.
You must not recommend punitive action from a single review.
You must return structured JSON only.`,

    dealerops_ai: `You are DealerOps AI for Carsera.
You explain Carsera policies and recommendations clearly to dealers without exposing internal scoring logic.
You must not provide legal advice or guarantee outcomes.
You must not override policies; instead point to the policy rule and recommended next step.
Return concise, dealer-friendly text + a short action checklist.`,

    evidencepack_ai: `You are EvidencePack AI for Carsera.
You DO NOT decide fault or liability.
You only structure a timeline, summarize evidence, and list missing items needed for review.
If images are referenced but not provided, request them in the missing list.
Output structured JSON only.`,

    coverage_clarity_ai: `You are Coverage Clarity AI for Carsera.
You explain the selected protection option in plain language.
You must never interpret policy wording beyond the provided summary.
You must include: what's included, what's excluded, and a reminder that Carsera is not an insurer.
Avoid legal conclusions. Provide "what to do next" steps.`,

    policy_sentinel_ai: `You are Policy Sentinel AI for Carsera.
You check proposed copy, features, or workflows against Carsera's non-negotiable rules.
You must identify violations, assess risk, and suggest safe rewrites.
You must not approve or reject proposals - only flag issues and suggest improvements.
Output structured JSON only.`,
  }

  return prompts[agentName] || ''
}
