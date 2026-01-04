# WebAuthn/Fingerprint Authentication Implementation Guide

## Overview

This document outlines the implementation of WebAuthn (Fingerprint/Passkey) authentication for admin users. WebAuthn allows users to authenticate using biometrics (fingerprint, face ID) or hardware security keys.

## Prerequisites

1. **Install WebAuthn Library:**
   ```bash
   npm install @simplewebauthn/server @simplewebauthn/typescript-types
   ```

2. **Run Database Migration:**
   ```bash
   # Run migration 024_add_webauthn_support.sql in Supabase SQL Editor
   ```

3. **Environment Variables:**
   ```
   NEXT_PUBLIC_RP_ID=yourdomain.com  # Relying Party ID (your domain)
   NEXT_PUBLIC_RP_NAME=Carsera       # Your app name
   ```

## Implementation Status

✅ **Completed:**
- Database migration (024_add_webauthn_support.sql)
- Phone number login support in auth page
- Database schema for credentials and challenges

⏳ **Pending:**
- WebAuthn API routes (registration and authentication)
- WebAuthn client-side utilities
- WebAuthn UI components
- Admin settings page for managing passkeys

## API Routes Needed

### 1. POST /api/webauthn/register/options
Generate registration challenge for new credential

### 2. POST /api/webauthn/register/verify
Verify and store new credential

### 3. POST /api/webauthn/authenticate/options
Generate authentication challenge

### 4. POST /api/webauthn/authenticate/verify
Verify authentication and create session

### 5. GET /api/webauthn/credentials
List user's credentials

### 6. DELETE /api/webauthn/credentials/:id
Remove a credential

## Next Steps

Due to the complexity of WebAuthn implementation and the need for proper testing, the full implementation should be done in phases:

1. Install dependencies
2. Implement server-side utilities (challenge generation, verification)
3. Create API routes
4. Create client-side WebAuthn helpers
5. Add UI components to auth page
6. Create admin settings page for managing passkeys
7. Test with real devices

## Security Considerations

- Challenges expire after 5 minutes
- Credential IDs are unique and indexed
- Counter values prevent replay attacks
- RLS policies restrict credential access
- Only authenticated users can manage their credentials

## References

- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)
- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
