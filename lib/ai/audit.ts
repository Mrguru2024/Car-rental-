/**
 * AI Audit Logging
 * Logs all AI agent calls to Supabase for auditability
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface LogAICallParams {
  agentName: string
  inputJson: any
  outputJson: any
  createdBy?: string
  bookingId?: string
  dealerId?: string
  renterId?: string
  status: 'success' | 'failed'
  errorMessage?: string
}

/**
 * Log an AI agent call to the database
 */
export async function logAICall(params: LogAICallParams): Promise<string> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ai_runs')
    .insert({
      agent_name: params.agentName,
      input_json: params.inputJson,
      output_json: params.outputJson,
      created_by: params.createdBy || null,
      booking_id: params.bookingId || null,
      dealer_id: params.dealerId || null,
      renter_id: params.renterId || null,
      status: params.status,
      error_message: params.errorMessage || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to log AI call:', error)
    // Don't throw - logging failure shouldn't break the main flow
    return ''
  }

  return data.id
}
