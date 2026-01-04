-- WebAuthn / Passkey Support
-- Enables fingerprint and other WebAuthn authentication methods for admin users

-- Table to store WebAuthn credentials
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE, -- Base64URL encoded credential ID
  public_key BYTEA NOT NULL, -- Public key in CBOR format
  counter BIGINT NOT NULL DEFAULT 0, -- Signature counter for replay attack prevention
  device_name TEXT, -- User-friendly name (e.g., "iPhone 14 Pro", "MacBook Pro")
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  -- Additional metadata
  aaguid UUID, -- Authenticator Attestation Globally Unique Identifier
  credential_backed_up BOOLEAN DEFAULT false,
  transports TEXT[] -- Array of transports: ['usb', 'nfc', 'ble', 'internal', 'hybrid']
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON webauthn_credentials(credential_id);

-- Enable RLS
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own credentials
CREATE POLICY "Users can view their own webauthn credentials"
  ON webauthn_credentials FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own credentials (during registration)
CREATE POLICY "Users can create their own webauthn credentials"
  ON webauthn_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own credentials (counter, last_used_at)
CREATE POLICY "Users can update their own webauthn credentials"
  ON webauthn_credentials FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own credentials
CREATE POLICY "Users can delete their own webauthn credentials"
  ON webauthn_credentials FOR DELETE
  USING (auth.uid() = user_id);

-- Admin roles can view all credentials (for management)
CREATE POLICY "Admin roles can view all webauthn credentials"
  ON webauthn_credentials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Table to store WebAuthn challenges (for registration and authentication)
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL UNIQUE, -- Base64URL encoded challenge
  type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user_id ON webauthn_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_challenge ON webauthn_challenges(challenge);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires_at ON webauthn_challenges(expires_at);

-- Enable RLS
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for challenges
-- Service role only (challenges are created/validated server-side)
CREATE POLICY "Service role can manage webauthn challenges"
  ON webauthn_challenges FOR ALL
  USING (false) -- Only service role can access (bypasses RLS)
  WITH CHECK (false);

-- Function to clean up expired challenges (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_webauthn_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM webauthn_challenges
  WHERE expires_at < NOW();
END;
$$;

-- Comment on tables
COMMENT ON TABLE webauthn_credentials IS 'Stores WebAuthn/Passkey credentials for user authentication';
COMMENT ON TABLE webauthn_challenges IS 'Temporary storage for WebAuthn challenges (registration and authentication)';
