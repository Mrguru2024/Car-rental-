/**
 * Recall Badge & Vehicle Standing Scoring Logic
 * 
 * Computes badge colors/labels and vehicle standing scores based on:
 * - NHTSA recall data
 * - Vehicle listing quality
 * - Dealer verification status
 */

import type { NHTSARecall } from '@/lib/nhtsa/recalls'

export type SeverityLevel = 'none' | 'info' | 'caution' | 'urgent'
export type BadgeColor = 'green' | 'yellow' | 'red' | 'gray'
export type StandingGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface RecallBadge {
  color: BadgeColor
  label: string
  recallCount: number
  severity: SeverityLevel
}

export interface VehicleStanding {
  score: number // 0-100
  grade: StandingGrade
  reasons: string[]
}

/**
 * Severe keywords that trigger urgent badge
 * Case-insensitive matching across summary/consequence/remedy
 */
const SEVERE_KEYWORDS = [
  'do not drive',
  'risk of crash',
  'fire',
  'air bag',
  'airbag',
  'brake failure',
  'steering',
  'fuel leak',
  'explosion',
  'injury',
  'death',
  'loss of control',
]

/**
 * Check if recall contains severe keywords
 */
function hasSevereKeywords(recall: NHTSARecall): boolean {
  const searchText = [
    recall.Summary || '',
    recall.Consequence || '',
    recall.Remedy || '',
    recall.Notes || '',
  ]
    .join(' ')
    .toLowerCase()

  return SEVERE_KEYWORDS.some((keyword) => searchText.includes(keyword.toLowerCase()))
}

/**
 * Compute recall badge based on NHTSA recall data
 */
export function computeRecallBadge(recalls: NHTSARecall[]): RecallBadge {
  const recallCount = recalls.length

  // No recalls
  if (recallCount === 0) {
    return {
      color: 'green',
      label: 'No Recalls Found',
      recallCount: 0,
      severity: 'none',
    }
  }

  // Check for severe keywords
  const hasSevere = recalls.some(hasSevereKeywords)

  // 1-2 recalls without severe keywords
  if (recallCount >= 1 && recallCount <= 2 && !hasSevere) {
    return {
      color: 'yellow',
      label: 'Recalls Reported',
      recallCount,
      severity: 'caution',
    }
  }

  // 3+ recalls OR any severe keywords
  if (recallCount >= 3 || hasSevere) {
    return {
      color: 'red',
      label: hasSevere ? 'Urgent Safety Recall' : 'Safety Attention Needed',
      recallCount,
      severity: 'urgent',
    }
  }

  // Fallback
  return {
    color: 'yellow',
    label: 'Recalls Reported',
    recallCount,
    severity: 'caution',
  }
}

/**
 * Compute vehicle standing score and grade
 * 
 * @param recalls - Array of NHTSA recalls
 * @param photoCount - Number of photos in listing
 * @param dealerVerified - Whether dealer is verified (optional)
 * @returns Standing score, grade, and reasons
 */
export function computeVehicleStanding(
  recalls: NHTSARecall[],
  photoCount: number = 0,
  dealerVerified: boolean = false
): VehicleStanding {
  let score = 100
  const reasons: string[] = []

  const recallCount = recalls.length
  const hasSevere = recalls.some(hasSevereKeywords)

  // Deduct for recalls
  if (recallCount > 0) {
    // -15 per recall, capped at -60
    const recallPenalty = Math.min(recallCount * 15, 60)
    score -= recallPenalty

    if (recallCount === 1) {
      reasons.push('1 recall reported for this vehicle type')
    } else {
      reasons.push(`${recallCount} recalls reported for this vehicle type`)
    }
  } else {
    reasons.push('No recalls reported for this year/make/model')
  }

  // Deduct for severe keywords
  if (hasSevere) {
    score -= 25
    const severeRecall = recalls.find(hasSevereKeywords)
    if (severeRecall) {
      // Find the first severe keyword mentioned
      const searchText = [
        severeRecall.Summary || '',
        severeRecall.Consequence || '',
      ]
        .join(' ')
        .toLowerCase()

      const foundKeyword = SEVERE_KEYWORDS.find((keyword) =>
        searchText.includes(keyword.toLowerCase())
      )

      if (foundKeyword) {
        reasons.push(`Urgent recall keyword detected: '${foundKeyword}'`)
      } else {
        reasons.push('Urgent safety recall detected')
      }
    }
  }

  // Deduct for low photo count
  if (photoCount < 3) {
    score -= 10
    reasons.push('Listing has limited photos')
  }

  // Deduct for unverified dealer (if verification system exists)
  if (!dealerVerified) {
    score -= 10
    reasons.push('Dealer verification pending')
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score))

  // Determine grade
  let grade: StandingGrade
  if (score >= 90) {
    grade = 'A'
  } else if (score >= 80) {
    grade = 'B'
  } else if (score >= 70) {
    grade = 'C'
  } else if (score >= 60) {
    grade = 'D'
  } else {
    grade = 'F'
  }

  return {
    score,
    grade,
    reasons: reasons.length > 0 ? reasons : ['Vehicle information available'],
  }
}
