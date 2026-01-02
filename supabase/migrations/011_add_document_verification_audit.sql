-- Document Verification Audit System
-- This migration adds support for automated document verification checks and Prime Admin audit workflow

-- 1. Document verification audit flags table
CREATE TABLE IF NOT EXISTS document_verification_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- e.g., 'drivers_license_front', 'business_license', etc.
  verification_status TEXT NOT NULL CHECK (verification_status IN ('pending', 'flagged', 'verified', 'rejected')) DEFAULT 'pending',
  flags JSONB DEFAULT '[]'::jsonb, -- Array of flag objects: {type: 'inconsistency'|'invalid'|'suspicious', reason: string, severity: 'low'|'medium'|'high', field?: string}
  bot_check_result JSONB DEFAULT NULL, -- Automated bot check results
  bot_check_at TIMESTAMPTZ DEFAULT NULL,
  auditor_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Prime Admin who reviewed
  auditor_notes TEXT DEFAULT NULL,
  auditor_decision TEXT CHECK (auditor_decision IN ('approved', 'rejected', 'pending')) DEFAULT NULL,
  auditor_decision_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_verification_audits_profile_id ON document_verification_audits(profile_id);
CREATE INDEX IF NOT EXISTS idx_document_verification_audits_verification_status ON document_verification_audits(verification_status);
CREATE INDEX IF NOT EXISTS idx_document_verification_audits_auditor_decision ON document_verification_audits(auditor_decision);
CREATE INDEX IF NOT EXISTS idx_document_verification_audits_created_at ON document_verification_audits(created_at DESC);

COMMENT ON TABLE document_verification_audits IS 'Document verification audit trail with automated bot checks and Prime Admin reviews';
COMMENT ON COLUMN document_verification_audits.flags IS 'JSONB array of flag objects indicating inconsistencies or issues';
COMMENT ON COLUMN document_verification_audits.bot_check_result IS 'Results from automated bot verification checks';
COMMENT ON COLUMN document_verification_audits.auditor_id IS 'Prime Admin who reviewed and made the final decision';
