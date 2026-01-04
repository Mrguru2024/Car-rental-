/**
 * Utility function to automatically mark past bookings as completed
 * This should be called by a cron job or scheduled task
 */
import { createAdminClient } from '@/lib/supabase/admin'

export async function autoCompletePastBookings() {
  const supabase = createAdminClient()
  const now = new Date()

  // Find all confirmed bookings where end_date has passed
  const { data: pastBookings, error } = await supabase
    .from('bookings')
    .select('id, end_date')
    .eq('status', 'confirmed')
    .lt('end_date', now.toISOString())

  if (error) {
    console.error('Error fetching past bookings:', error)
    return { success: false, error }
  }

  if (!pastBookings || pastBookings.length === 0) {
    return { success: true, completed: 0 }
  }

  // Update all past bookings to completed
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'completed',
      completed_at: now.toISOString(),
    })
    .in(
      'id',
      pastBookings.map((b) => b.id)
    )

  if (updateError) {
    console.error('Error updating bookings to completed:', updateError)
    return { success: false, error: updateError }
  }

  console.log(`Auto-completed ${pastBookings.length} bookings`)
  return { success: true, completed: pastBookings.length }
}
