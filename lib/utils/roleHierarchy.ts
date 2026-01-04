/**
 * Role Hierarchy and Permission Helpers
 * Defines role ordering and permission checks
 */

export type UserRole = 'renter' | 'dealer' | 'private_host' | 'admin' | 'prime_admin' | 'super_admin'

type RoleInput = UserRole | string | null | undefined

/**
 * Role hierarchy (higher number = more permissions)
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  renter: 1,
  dealer: 2,
  private_host: 2, // Same level as dealer
  admin: 3,
  prime_admin: 4,
  super_admin: 5,
}

/**
 * Check if a role has at least the permissions of another role
 */
export function hasRoleOrHigher(userRole: RoleInput, requiredRole: UserRole): boolean {
  if (!userRole) return false
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] || 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole]
  return userLevel >= requiredLevel
}

/**
 * Check if user is any admin role
 */
export function isAdmin(userRole: RoleInput): boolean {
  return hasRoleOrHigher(userRole, 'admin')
}

/**
 * Check if user is Prime Admin or higher
 */
export function isPrimeAdminOrHigher(userRole: RoleInput): boolean {
  return hasRoleOrHigher(userRole, 'prime_admin')
}

/**
 * Check if user is Super Admin
 */
export function isSuperAdmin(userRole: RoleInput): boolean {
  return userRole === 'super_admin'
}

/**
 * Get allowed roles for admin operations
 */
export function getAdminRoles(): UserRole[] {
  return ['admin', 'prime_admin', 'super_admin']
}

/**
 * Get allowed roles for Prime Admin operations
 */
export function getPrimeAdminRoles(): UserRole[] {
  return ['prime_admin', 'super_admin']
}

/**
 * Check if role is in allowed list
 */
export function isRoleAllowed(userRole: RoleInput, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false
  return allowedRoles.includes(userRole as UserRole)
}
