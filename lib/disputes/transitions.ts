/**
 * Dispute Status Transition Validator
 * Validates status transitions based on role and current status
 */

export type DisputeStatus =
  | 'open'
  | 'awaiting_response'
  | 'under_review'
  | 'resolved'
  | 'escalated'
  | 'closed'

export type DisputeDecision =
  | 'no_action'
  | 'partial_refund'
  | 'full_refund'
  | 'fee_waived'
  | 'escalate_to_coverage'
  | 'close'
  | 'reverse'
  | 'flag'
  | 'lock'

export type UserRole =
  | 'renter'
  | 'dealer'
  | 'private_host'
  | 'admin'
  | 'prime_admin'
  | 'super_admin'

/**
 * Validate if a status transition is allowed
 */
export function validateStatusTransition(
  role: UserRole,
  fromStatus: DisputeStatus,
  toStatus: DisputeStatus
): { allowed: boolean; reason?: string } {
  // Only admins can change status
  if (!['admin', 'prime_admin', 'super_admin'].includes(role)) {
    return { allowed: false, reason: 'Only admins can change dispute status' }
  }

  // Closed disputes cannot be changed (except by prime admin for override)
  if (fromStatus === 'closed' && toStatus !== 'closed') {
    if (!['prime_admin', 'super_admin'].includes(role)) {
      return { allowed: false, reason: 'Closed disputes cannot be reopened except by prime admin' }
    }
  }

  // Valid transitions
  const validTransitions: Record<DisputeStatus, DisputeStatus[]> = {
    open: ['awaiting_response', 'under_review', 'resolved', 'escalated', 'closed'],
    awaiting_response: ['under_review', 'resolved', 'escalated', 'closed'],
    under_review: ['resolved', 'escalated', 'closed'],
    resolved: ['closed'],
    escalated: ['resolved', 'closed'],
    closed: ['closed'], // Can only stay closed (or be reopened by prime admin)
  }

  const allowed = validTransitions[fromStatus]?.includes(toStatus) || false

  if (!allowed) {
    return {
      allowed: false,
      reason: `Invalid status transition from ${fromStatus} to ${toStatus}`,
    }
  }

  return { allowed: true }
}

/**
 * Map decision to status change
 */
export function decisionToStatus(decision: DisputeDecision): DisputeStatus {
  const decisionStatusMap: Record<DisputeDecision, DisputeStatus> = {
    no_action: 'resolved',
    partial_refund: 'resolved',
    full_refund: 'resolved',
    fee_waived: 'resolved',
    escalate_to_coverage: 'escalated',
    close: 'closed',
    reverse: 'resolved', // Prime admin override - restore to resolved
    flag: 'under_review', // Prime admin override - flag for review
    lock: 'closed', // Prime admin override - lock/close
  }

  return decisionStatusMap[decision]
}

/**
 * Check if a dispute can have messages added
 */
export function canAddMessage(status: DisputeStatus): boolean {
  return status !== 'closed'
}

/**
 * Check if a dispute can have evidence added
 */
export function canAddEvidence(status: DisputeStatus): boolean {
  return status !== 'closed'
}
