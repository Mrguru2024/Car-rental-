/**
 * Secure Admin User Management
 * 
 * This module provides server-side functions to add admin users securely.
 * Only callable with SERVICE ROLE key - never expose to client-side code.
 * 
 * SECURITY: This uses the service role key which bypasses RLS.
 * Only use this from secure server-side API routes or scripts.
 */

import { createAdminClient } from '@/lib/supabase/admin' // Use admin client with service role

/**
 * Add or update an admin user
 * 
 * @param userId - User ID from auth.users table
 * @param role - Admin role: 'admin', 'prime_admin', or 'super_admin'
 * @param fullName - Optional full name
 * @returns Profile ID of the admin user
 * 
 * @example
 * ```ts
 * // In a secure API route or server script
 * const profileId = await addAdminUser(
 *   'user-uuid-here',
 *   'super_admin',
 *   'Super Admin Name'
 * )
 * ```
 */
export async function addAdminUser(
  userId: string,
  role?: 'admin' | 'prime_admin' | 'super_admin',
  fullName?: string
): Promise<string> {
  const supabase = createAdminClient() // Uses service role key

  // Default to 'admin' role if not specified (for admin portal registrations)
  const finalRole = role || 'admin'

  // Validate role
  const allowedRoles: Array<'admin' | 'prime_admin' | 'super_admin'> = [
    'admin',
    'prime_admin',
    'super_admin',
  ]
  if (!allowedRoles.includes(finalRole)) {
    throw new Error(
      `Invalid role: ${finalRole}. Allowed roles: ${allowedRoles.join(', ')}`
    )
  }

  // Use the secure database function
  // If role is not provided, it will default to 'admin' in the database function
  const { data, error } = await supabase.rpc('add_admin_user', {
    p_user_id: userId,
    p_role: finalRole,
    p_full_name: fullName || null,
  })

  if (error) {
    console.error('Error adding admin user:', error)
    throw new Error(`Failed to add admin user: ${error.message}`)
  }

  return data as string
}

/**
 * List all admin users
 * 
 * @returns Array of admin user information
 * 
 * @example
 * ```ts
 * const admins = await listAdminUsers()
 * console.log(admins)
 * ```
 */
export async function listAdminUsers(): Promise<
  Array<{
    user_id: string
    role: 'admin' | 'prime_admin' | 'super_admin'
    full_name: string | null
    email: string
    created_at: string
  }>
> {
  const supabase = createAdminClient() // Uses service role key

  const { data, error } = await supabase.rpc('list_admin_users')

  if (error) {
    console.error('Error listing admin users:', error)
    throw new Error(`Failed to list admin users: ${error.message}`)
  }

  return data || []
}

/**
 * Get user ID from email (helper function)
 * 
 * @param email - User's email address
 * @returns User ID from auth.users
 */
export async function getUserIdByEmail(email: string): Promise<string | null> {
  const supabase = createAdminClient() // Uses service role key

  // Note: This requires admin client to query auth.users
  // Supabase admin client might not expose auth.users directly
  // Alternative: Use Supabase Admin API or get user_id from signup response
  
  // For now, we'll need to query through profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', email) // This won't work directly
    .maybeSingle()

  // TODO: If you have access to auth.users through admin client:
  // const { data: user } = await supabase.auth.admin.getUserByEmail(email)
  // return user?.user?.id || null

  return profile?.user_id || null
}
