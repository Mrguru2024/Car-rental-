import { Database } from '@/lib/types/database'

type BookingInsuranceElection = Database['public']['Tables']['booking_insurance_elections']['Row']
type ByoiDocument = Database['public']['Tables']['byoi_documents']['Row']
type LiabilityAcceptance = Database['public']['Tables']['liability_acceptances']['Row']

/**
 * Check if BYOI document is approved
 */
export function isByoiApproved(byoiDoc: ByoiDocument | null): boolean {
  return byoiDoc?.status === 'approved'
}

/**
 * Check if liability acceptance exists
 */
export function hasLiabilityAcceptance(acceptance: LiabilityAcceptance | null): boolean {
  return acceptance !== null
}

/**
 * Check if BYOI coverage is valid (approved doc + acceptance)
 */
export function isByoiValid(byoiDoc: ByoiDocument | null, acceptance: LiabilityAcceptance | null): boolean {
  return isByoiApproved(byoiDoc) && hasLiabilityAcceptance(acceptance)
}

/**
 * Check if platform plan election is valid
 */
export function isPlatformPlanValid(election: BookingInsuranceElection | null): boolean {
  return election !== null && 
         election.coverage_type === 'platform_plan' && 
         election.protection_plan_id !== null
}

/**
 * Check if insurance election is valid for checkout
 */
export function isInsuranceElectionValid(
  election: BookingInsuranceElection | null,
  byoiDoc: ByoiDocument | null,
  acceptance: LiabilityAcceptance | null
): boolean {
  if (!election) return false
  
  if (election.coverage_type === 'byoi') {
    return isByoiValid(byoiDoc, acceptance)
  }
  
  if (election.coverage_type === 'platform_plan') {
    return isPlatformPlanValid(election)
  }
  
  return false
}