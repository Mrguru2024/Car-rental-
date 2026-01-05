/**
 * Vehicle Tier System
 * Single source of truth for tier computation and validation
 */

export type VehicleTier = 'tier1' | 'tier2' | 'tier3' | 'tier4'
export type TitleType = 'clean' | 'rebuilt' | 'salvage' | 'flood' | 'other'
export type InspectionStatus = 'pending' | 'passed' | 'failed'
export type RenterStandingGrade = 'A' | 'B' | 'C' | 'D' | 'F'

// Platform constants
export const PLATFORM_MIN_YEAR = 2010
export const FORBIDDEN_TITLE_TYPES: TitleType[] = ['salvage', 'flood', 'rebuilt']
export const MIN_PHOTOS_REQUIRED = 3

/**
 * Compute vehicle tier based on model year
 */
export function computeVehicleTier(modelYear: number): VehicleTier {
  if (modelYear >= 2024) {
    return 'tier4'
  } else if (modelYear >= 2020) {
    return 'tier3'
  } else if (modelYear >= 2015) {
    return 'tier2'
  } else if (modelYear >= 2010) {
    return 'tier1'
  }
  // Fallback (should not happen due to constraint)
  return 'tier1'
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: VehicleTier): string {
  const names: Record<VehicleTier, string> = {
    tier1: 'Economy/Value',
    tier2: 'Standard/Mainstream',
    tier3: 'Premium',
    tier4: 'Luxury/Specialty',
  }
  return names[tier]
}

/**
 * Get tier year range
 */
export function getTierYearRange(tier: VehicleTier): string {
  const ranges: Record<VehicleTier, string> = {
    tier1: '2010-2014',
    tier2: '2015-2019',
    tier3: '2020-2023',
    tier4: '2024-Present',
  }
  return ranges[tier]
}

/**
 * Validate vehicle listing input
 */
export interface VehicleListingInput {
  model_year: number
  title_type: TitleType
  inspection_status: InspectionStatus
  photos_count?: number
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
  vehicle_tier?: VehicleTier
}

export function validateVehicleListing(input: VehicleListingInput): ValidationResult {
  const errors: string[] = []
  const tier = computeVehicleTier(input.model_year)

  // Year validation
  if (input.model_year < PLATFORM_MIN_YEAR) {
    errors.push(`Vehicle year must be ${PLATFORM_MIN_YEAR} or newer. Platform minimum is ${PLATFORM_MIN_YEAR}.`)
  }

  // Title type validation
  if (FORBIDDEN_TITLE_TYPES.includes(input.title_type)) {
    errors.push(
      `Title type "${input.title_type}" is not allowed. Platform policy prohibits salvage, flood, and rebuilt titles.`
    )
  }

  // Inspection validation
  if (input.inspection_status === 'failed') {
    errors.push('Vehicle cannot be published with failed inspection status.')
  }

  // Photo validation
  if (input.photos_count !== undefined && input.photos_count < MIN_PHOTOS_REQUIRED) {
    errors.push(`At least ${MIN_PHOTOS_REQUIRED} photos are required to publish a listing.`)
  }

  return {
    ok: errors.length === 0,
    errors,
    vehicle_tier: tier,
  }
}

/**
 * Booking eligibility validation
 */
export interface BookingEligibilityInput {
  vehicle: {
    id: string
    vehicle_tier: VehicleTier
    year: number
    title_type: TitleType
    inspection_status: InspectionStatus
    status: string
  }
  renter: {
    id: string
    standing_grade?: RenterStandingGrade
    is_flagged?: boolean
    verification_status?: string
  }
  dealerPolicy?: {
    min_vehicle_year: number
    allowed_vehicle_tiers: VehicleTier[]
    min_renter_standing_grade: RenterStandingGrade
    block_flagged_renters: boolean
    require_mvr_for_tier3: boolean
    require_mvr_for_tier4: boolean
    require_soft_credit_for_tier3: boolean
    require_soft_credit_for_tier4: boolean
    require_manual_approval: boolean
  }
  screeningSummary?: {
    has_mvr?: boolean
    mvr_status?: string
    has_soft_credit?: boolean
    soft_credit_status?: string
  }
  insuranceSelection?: {
    type: 'premium' | 'standard' | 'basic' | 'byoi'
    is_valid?: boolean
  }
}

export interface EligibilityResult {
  ok: boolean
  blockers: string[]
  conditions: string[]
  required_actions: string[]
}

const GRADE_ORDER: Record<RenterStandingGrade, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  F: 1,
}

function compareGrades(grade1: RenterStandingGrade, grade2: RenterStandingGrade): number {
  return GRADE_ORDER[grade1] - GRADE_ORDER[grade2]
}

export function validateBookingEligibility(input: BookingEligibilityInput): EligibilityResult {
  const blockers: string[] = []
  const conditions: string[] = []
  const required_actions: string[] = []

  const { vehicle, renter, dealerPolicy, screeningSummary, insuranceSelection } = input

  // Basic vehicle checks
  if (vehicle.status !== 'active') {
    blockers.push('Vehicle is not available for booking.')
  }

  if (vehicle.inspection_status === 'failed') {
    blockers.push('Vehicle has failed inspection and cannot be booked.')
  }

  if (FORBIDDEN_TITLE_TYPES.includes(vehicle.title_type)) {
    blockers.push('Vehicle has an invalid title type and cannot be booked.')
  }

  // Renter verification
  if (renter.verification_status !== 'approved') {
    blockers.push('Renter verification must be approved before booking.')
  }

  // Dealer policy checks
  if (dealerPolicy) {
    // Vehicle year check
    if (vehicle.year < dealerPolicy.min_vehicle_year) {
      blockers.push(
        `Vehicle year ${vehicle.year} is below dealer minimum of ${dealerPolicy.min_vehicle_year}.`
      )
    }

    // Allowed tiers check
    if (!dealerPolicy.allowed_vehicle_tiers.includes(vehicle.vehicle_tier)) {
      blockers.push(
        `Vehicle tier ${vehicle.vehicle_tier} is not allowed by dealer policy. Allowed tiers: ${dealerPolicy.allowed_vehicle_tiers.join(', ')}.`
      )
    }

    // Renter standing check
    if (renter.standing_grade) {
      if (compareGrades(renter.standing_grade, dealerPolicy.min_renter_standing_grade) < 0) {
        blockers.push(
          `Renter standing grade ${renter.standing_grade} is below dealer minimum of ${dealerPolicy.min_renter_standing_grade}.`
        )
      }
    } else {
      // Default to 'F' if no standing
      if (compareGrades('F', dealerPolicy.min_renter_standing_grade) < 0) {
        blockers.push(
          `Renter standing grade is below dealer minimum of ${dealerPolicy.min_renter_standing_grade}.`
        )
      }
    }

    // Flagged renter check
    if (dealerPolicy.block_flagged_renters && renter.is_flagged) {
      blockers.push('Renter is flagged and blocked by dealer policy.')
    }

    // Tier-based requirements
    if (vehicle.vehicle_tier === 'tier3') {
      if (dealerPolicy.require_mvr_for_tier3) {
        if (!screeningSummary?.has_mvr || screeningSummary.mvr_status !== 'completed') {
          blockers.push('Tier 3 vehicles require MVR screening.')
          required_actions.push('run_mvr')
        }
      }

      if (dealerPolicy.require_soft_credit_for_tier3) {
        if (!screeningSummary?.has_soft_credit || screeningSummary.soft_credit_status !== 'completed') {
          blockers.push('Tier 3 vehicles require Soft Credit screening.')
          required_actions.push('run_soft_credit')
        }
      }
    }

    if (vehicle.vehicle_tier === 'tier4') {
      if (dealerPolicy.require_mvr_for_tier4) {
        if (!screeningSummary?.has_mvr || screeningSummary.mvr_status !== 'completed') {
          blockers.push('Tier 4 vehicles require MVR screening.')
          required_actions.push('run_mvr')
        }
      }

      if (dealerPolicy.require_soft_credit_for_tier4) {
        if (!screeningSummary?.has_soft_credit || screeningSummary.soft_credit_status !== 'completed') {
          blockers.push('Tier 4 vehicles require Soft Credit screening.')
          required_actions.push('run_soft_credit')
        }
      }

      // Tier 4 requires premium insurance
      if (insuranceSelection?.type !== 'premium' && insuranceSelection?.type !== 'byoi') {
        blockers.push('Tier 4 vehicles require Premium protection plan or BYOI.')
        required_actions.push('choose_premium_plan')
      }
    }

    // Manual approval requirement
    if (dealerPolicy.require_manual_approval) {
      conditions.push('Booking requires dealer manual approval.')
    }
  } else {
    // Default platform requirements if no dealer policy
    if (vehicle.vehicle_tier === 'tier3' || vehicle.vehicle_tier === 'tier4') {
      if (!screeningSummary?.has_mvr || screeningSummary.mvr_status !== 'completed') {
        blockers.push(`${vehicle.vehicle_tier === 'tier3' ? 'Tier 3' : 'Tier 4'} vehicles require MVR screening.`)
        required_actions.push('run_mvr')
      }
    }

    if (vehicle.vehicle_tier === 'tier4') {
      if (!screeningSummary?.has_soft_credit || screeningSummary.soft_credit_status !== 'completed') {
        blockers.push('Tier 4 vehicles require Soft Credit screening.')
        required_actions.push('run_soft_credit')
      }

      if (insuranceSelection?.type !== 'premium' && insuranceSelection?.type !== 'byoi') {
        blockers.push('Tier 4 vehicles require Premium protection plan or BYOI.')
        required_actions.push('choose_premium_plan')
      }
    }
  }

  return {
    ok: blockers.length === 0,
    blockers,
    conditions,
    required_actions,
  }
}

/**
 * Validate dealer policy (ensure it doesn't weaken platform rules)
 */
export interface DealerPolicyInput {
  min_vehicle_year: number
  allowed_vehicle_tiers: VehicleTier[]
}

export function validateDealerPolicy(input: DealerPolicyInput): ValidationResult {
  const errors: string[] = []

  if (input.min_vehicle_year < PLATFORM_MIN_YEAR) {
    errors.push(`Minimum vehicle year cannot be below platform minimum of ${PLATFORM_MIN_YEAR}.`)
  }

  const validTiers: VehicleTier[] = ['tier1', 'tier2', 'tier3', 'tier4']
  const invalidTiers = input.allowed_vehicle_tiers.filter((tier) => !validTiers.includes(tier))
  if (invalidTiers.length > 0) {
    errors.push(`Invalid vehicle tiers: ${invalidTiers.join(', ')}. Valid tiers are: ${validTiers.join(', ')}.`)
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}
