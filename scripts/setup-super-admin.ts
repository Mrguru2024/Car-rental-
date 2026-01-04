/**
 * One-time script to set up super admin account
 * 
 * Run this once using: npx tsx scripts/setup-super-admin.ts
 * Or create a Next.js API route and call it once
 * 
 * Requires: SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createAdminClient } from '../lib/supabase/admin'

async function setupSuperAdmin() {
  const adminSupabase = createAdminClient()
  const email = '5epmgllc@gmail.com'
  const password = 'Destiny@2028'
  const role = 'super_admin'

  try {
    console.log(`Setting up super admin for: ${email}`)

    // Step 1: Find the user
    const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers()
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`)
    }

    const user = users.find((u) => u.email === email)

    if (!user) {
      throw new Error(`User with email ${email} not found`)
    }

    console.log(`Found user: ${user.id}`)

    // Step 2: Update password
    const { data: updatedUser, error: updateError } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      {
        password: password,
      }
    )

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`)
    }

    console.log('Password updated successfully')

    // Step 3: Add super_admin role
    const { data: profileId, error: roleError } = await adminSupabase.rpc('add_admin_user', {
      p_user_id: user.id,
      p_role: role,
      p_full_name: 'Super Admin',
    })

    if (roleError) {
      throw new Error(`Failed to add admin role: ${roleError.message}`)
    }

    console.log(`Super admin role assigned successfully. Profile ID: ${profileId}`)

    // Step 4: Verify
    const { data: adminUsers, error: verifyError } = await adminSupabase.rpc('list_admin_users')

    if (verifyError) {
      console.warn('Warning: Could not verify admin users list')
    } else {
      const admin = adminUsers?.find((a: any) => a.email === email)
      if (admin) {
        console.log('\n✅ Success! Admin user created:')
        console.log(`   Email: ${admin.email}`)
        console.log(`   Role: ${admin.role}`)
        console.log(`   User ID: ${user.id}`)
        console.log(`\nYou can now log in at /auth with:`)
        console.log(`   Email: ${email}`)
        console.log(`   Password: ${password}`)
      }
    }
  } catch (error: any) {
    console.error('Error setting up super admin:', error.message)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  setupSuperAdmin()
    .then(() => {
      console.log('\n✅ Setup complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Setup failed:', error)
      process.exit(1)
    })
}

export { setupSuperAdmin }
