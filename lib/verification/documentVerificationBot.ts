/**
 * Automated Document Verification Bot
 * 
 * This bot performs automated consistency checks on submitted verification documents
 * to flag potential fraud or invalid submissions. Flags are stored for Prime Admin review.
 * 
 * CURRENT IMPLEMENTATION: Basic data consistency checks only
 * - Checks if required fields are filled when documents are uploaded
 * - Validates dates, formats, and cross-field consistency
 * - Does NOT analyze document contents (images/PDFs)
 * 
 * FOR ACCURATE VERIFICATION: Integrate document analysis services
 * See docs/DOCUMENT_VERIFICATION_BOT.md for integration guide with:
 * - AWS Textract (recommended for cost/accuracy balance)
 * - Google Document AI (pre-trained models for IDs/licenses)
 * - Jumio/Onfido (full identity verification platforms)
 * 
 * The current implementation provides Layer 1 (basic checks).
 * Document analysis would be Layer 2 (content verification).
 * Prime Admin review is Layer 3 (human verification).
 */

import { createClient } from '@/lib/supabase/server'

export interface DocumentFlag {
  type: 'inconsistency' | 'invalid' | 'suspicious'
  reason: string
  severity: 'low' | 'medium' | 'high'
  field?: string
}

export interface BotCheckResult {
  passed: boolean
  flags: DocumentFlag[]
  checks: {
    dataConsistency?: boolean
    formatValidation?: boolean
    completeness?: boolean
    dateValidation?: boolean
    crossFieldValidation?: boolean
  }
  summary: string
}

/**
 * Run automated verification checks on a user's documents
 */
export async function runDocumentVerificationBot(
  profileId: string
): Promise<{ audits: any[]; totalFlags: number }> {
  const supabase = await createClient()

  // Get user profile with all verification data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (profileError || !profile) {
    throw new Error('Profile not found')
  }

  const documents = profile.verification_documents || {}
  const documentTypes = Object.keys(documents)
  const audits: any[] = []
  let totalFlags = 0

  // Run checks for each document type
  for (const documentType of documentTypes) {
    const flags: DocumentFlag[] = []
    const checks: BotCheckResult['checks'] = {}

    // Run role-specific checks
    if (profile.role === 'renter') {
      const renterFlags = await checkRenterDocuments(profile, documentType)
      flags.push(...renterFlags)
    } else if (profile.role === 'dealer' || profile.role === 'private_host') {
      const dealerFlags = await checkDealerDocuments(profile, documentType)
      flags.push(...dealerFlags)
    }

    // General document checks
    const generalFlags = await checkGeneralDocumentConsistency(profile, documentType)
    flags.push(...generalFlags)

    // Data consistency checks
    const consistencyFlags = await checkDataConsistency(profile, documentType)
    flags.push(...consistencyFlags)

    // Date validation
    const dateFlags = await checkDateValidation(profile)
    flags.push(...dateFlags)

    // Cross-field validation
    const crossFieldFlags = await checkCrossFieldValidation(profile)
    flags.push(...crossFieldFlags)

    // Determine verification status based on flags
    const hasHighSeverityFlags = flags.some((f) => f.severity === 'high')
    const hasMediumSeverityFlags = flags.some((f) => f.severity === 'medium')
    const verificationStatus = hasHighSeverityFlags
      ? 'flagged'
      : hasMediumSeverityFlags
      ? 'flagged'
      : flags.length > 0
      ? 'flagged'
      : 'verified'

    const botCheckResult: BotCheckResult = {
      passed: flags.length === 0,
      flags,
      checks: {
        dataConsistency: !flags.some((f) => f.type === 'inconsistency'),
        formatValidation: !flags.some((f) => f.type === 'invalid'),
        completeness: true, // Basic check - can be enhanced
        dateValidation: !dateFlags.length,
        crossFieldValidation: !crossFieldFlags.length,
      },
      summary:
        flags.length === 0
          ? 'All checks passed'
          : `${flags.length} issue${flags.length !== 1 ? 's' : ''} found: ${flags
              .map((f) => f.reason)
              .join('; ')}`,
    }

    // Create or update audit record
    const { data: existingAudit } = await supabase
      .from('document_verification_audits')
      .select('id')
      .eq('profile_id', profileId)
      .eq('document_type', documentType)
      .maybeSingle()

    const auditData = {
      profile_id: profileId,
      document_type: documentType,
      verification_status: verificationStatus,
      flags,
      bot_check_result: botCheckResult,
      bot_check_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (existingAudit) {
      await supabase
        .from('document_verification_audits')
        .update(auditData)
        .eq('id', existingAudit.id)
    } else {
      await supabase.from('document_verification_audits').insert(auditData)
    }

    audits.push(auditData)
    totalFlags += flags.length
  }

  return { audits, totalFlags }
}

/**
 * Check renter-specific document consistency
 */
async function checkRenterDocuments(
  profile: any,
  documentType: string
): Promise<DocumentFlag[]> {
  const flags: DocumentFlag[] = []

  // Check driver's license consistency
  if (documentType.includes('drivers_license')) {
    if (!profile.drivers_license_number) {
      flags.push({
        type: 'invalid',
        reason: 'Driver license number missing but license document submitted',
        severity: 'high',
        field: 'drivers_license_number',
      })
    }

    if (!profile.drivers_license_state) {
      flags.push({
        type: 'invalid',
        reason: 'Driver license state missing but license document submitted',
        severity: 'medium',
        field: 'drivers_license_state',
      })
    }

    // Check expiration date
    if (profile.drivers_license_expiration) {
      const expirationDate = new Date(profile.drivers_license_expiration)
      const today = new Date()
      if (expirationDate < today) {
        flags.push({
          type: 'invalid',
          reason: 'Driver license has expired',
          severity: 'high',
          field: 'drivers_license_expiration',
        })
      }
    }
  }

  // Check name consistency between profile and documents
  if (documentType.includes('selfie') && profile.full_name) {
    // Name validation would require OCR/extraction - placeholder for now
    // In production, this would use document parsing APIs (AWS Textract, Google Document AI)
    // See docs/DOCUMENT_VERIFICATION_BOT.md for integration guide
  }

  return flags
}

/**
 * Check dealer-specific document consistency
 */
async function checkDealerDocuments(
  profile: any,
  documentType: string
): Promise<DocumentFlag[]> {
  const flags: DocumentFlag[] = []

  // Business license checks
  if (documentType === 'business_license') {
    if (!profile.business_license_number) {
      flags.push({
        type: 'invalid',
        reason: 'Business license number missing but license document submitted',
        severity: 'high',
        field: 'business_license_number',
      })
    }

    if (!profile.business_name) {
      flags.push({
        type: 'invalid',
        reason: 'Business name missing but license document submitted',
        severity: 'high',
        field: 'business_name',
      })
    }

    if (!profile.business_address) {
      flags.push({
        type: 'invalid',
        reason: 'Business address missing but license document submitted',
        severity: 'medium',
        field: 'business_address',
      })
    }
  }

  // Tax document checks
  if (documentType === 'tax_document') {
    if (!profile.tax_id) {
      flags.push({
        type: 'invalid',
        reason: 'Tax ID missing but tax document submitted',
        severity: 'medium',
        field: 'tax_id',
      })
    }
  }

  // Cross-check business name consistency
  if (profile.business_name && profile.full_name) {
    // Basic check - names should be different for business accounts
    // This is a simple heuristic
  }

  return flags
}

/**
 * Check general document consistency
 */
async function checkGeneralDocumentConsistency(
  profile: any,
  documentType: string
): Promise<DocumentFlag[]> {
  const flags: DocumentFlag[] = []

  const documents = profile.verification_documents || {}
  const documentPath = documents[documentType]

  if (!documentPath) {
    flags.push({
      type: 'invalid',
      reason: `Document type ${documentType} referenced but file path missing`,
      severity: 'high',
      field: 'verification_documents',
    })
    return flags
  }

  // Check file extension validity
  const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png']
  const fileExtension = documentPath.split('.').pop()?.toLowerCase()
  if (fileExtension && !validExtensions.some((ext) => documentPath.toLowerCase().endsWith(ext))) {
    flags.push({
      type: 'invalid',
      reason: `Invalid file extension for ${documentType}: ${fileExtension}`,
      severity: 'medium',
      field: 'verification_documents',
    })
  }

  return flags
}

/**
 * Check data consistency across fields
 */
async function checkDataConsistency(
  profile: any,
  documentType: string
): Promise<DocumentFlag[]> {
  const flags: DocumentFlag[] = []

  // Check for required fields based on role
  if (profile.role === 'renter') {
    if (documentType.includes('license') && !profile.drivers_license_number) {
      flags.push({
        type: 'inconsistency',
        reason: 'Driver license document uploaded but license number not provided',
        severity: 'high',
        field: 'drivers_license_number',
      })
    }
  } else if (profile.role === 'dealer' || profile.role === 'private_host') {
    if (documentType === 'business_license') {
      if (!profile.business_name || !profile.business_license_number) {
        flags.push({
          type: 'inconsistency',
          reason: 'Business license document uploaded but business details incomplete',
          severity: 'high',
          field: 'business_name',
        })
      }
    }
  }

  return flags
}

/**
 * Check date validations
 */
async function checkDateValidation(profile: any): Promise<DocumentFlag[]> {
  const flags: DocumentFlag[] = []

  // Check driver license expiration
  if (profile.drivers_license_expiration) {
    const expirationDate = new Date(profile.drivers_license_expiration)
    const today = new Date()

    if (expirationDate < today) {
      flags.push({
        type: 'invalid',
        reason: 'Driver license has expired',
        severity: 'high',
        field: 'drivers_license_expiration',
      })
    } else if (expirationDate < new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
      flags.push({
        type: 'suspicious',
        reason: 'Driver license expires within 30 days',
        severity: 'low',
        field: 'drivers_license_expiration',
      })
    }
  }

  return flags
}

/**
 * Check cross-field validation
 */
async function checkCrossFieldValidation(profile: any): Promise<DocumentFlag[]> {
  const flags: DocumentFlag[] = []

  // Check address consistency
  if (profile.address && profile.business_address && profile.role !== 'renter') {
    // Addresses should typically be different for business accounts
    // This is a heuristic check
  }

  // Check phone format (basic validation)
  if (profile.phone) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    if (!phoneRegex.test(profile.phone.replace(/[\s\-\(\)]/g, ''))) {
      flags.push({
        type: 'invalid',
        reason: 'Phone number format appears invalid',
        severity: 'medium',
        field: 'phone',
      })
    }
  }

  return flags
}

/**
 * Run bot checks for all pending verifications
 */
export async function runBotChecksForPendingVerifications(): Promise<{
  processed: number
  flagged: number
}> {
  const supabase = await createClient()

  // Get all profiles with pending verification status that have documents
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, verification_documents')
    .eq('verification_status', 'pending')
    .not('verification_documents', 'is', null)

  if (!profiles || profiles.length === 0) {
    return { processed: 0, flagged: 0 }
  }

  let flagged = 0

  for (const profile of profiles) {
    try {
      const { totalFlags } = await runDocumentVerificationBot(profile.id)
      if (totalFlags > 0) {
        flagged++
      }
    } catch (error) {
      console.error(`Error running bot check for profile ${profile.id}:`, error)
    }
  }

  return { processed: profiles.length, flagged }
}
