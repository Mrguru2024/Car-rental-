/**
 * Data Encryption Utilities
 * Provides encryption/decryption for sensitive data at rest
 */

import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || ''
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16

if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: DATA_ENCRYPTION_KEY not set. Sensitive data encryption disabled.')
}

/**
 * Encrypt sensitive data
 */
export function encryptSensitiveData(text: string): string {
  if (!ENCRYPTION_KEY) {
    // In development, return as-is if key not set
    if (process.env.NODE_ENV === 'development') {
      return text
    }
    throw new Error('Encryption key not configured')
  }

  try {
    const iv = crypto.randomBytes(IV_LENGTH)
    const salt = crypto.randomBytes(SALT_LENGTH)
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha512')
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    // Return: salt:iv:tag:encrypted
    return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt sensitive data')
  }
}

/**
 * Decrypt sensitive data
 */
export function decryptSensitiveData(encryptedText: string): string {
  if (!ENCRYPTION_KEY) {
    // In development, return as-is if key not set
    if (process.env.NODE_ENV === 'development') {
      return encryptedText
    }
    throw new Error('Encryption key not configured')
  }

  try {
    const parts = encryptedText.split(':')
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format')
    }

    const [saltHex, ivHex, tagHex, encrypted] = parts
    const salt = Buffer.from(saltHex, 'hex')
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha512')
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt sensitive data')
  }
}

/**
 * Hash sensitive data (one-way, for verification)
 */
export function hashSensitiveData(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}

/**
 * Mask sensitive data for display (e.g., credit cards, SSN)
 */
export function maskSensitiveData(text: string, type: 'ssn' | 'license' | 'phone' | 'email' = 'phone'): string {
  if (!text) return ''
  
  switch (type) {
    case 'ssn':
      // Show only last 4 digits: XXX-XX-1234
      return `XXX-XX-${text.slice(-4)}`
    case 'license':
      // Show only last 4 characters
      return `XXXX${text.slice(-4)}`
    case 'phone':
      // Show only last 4 digits: (XXX) XXX-1234
      const cleaned = text.replace(/\D/g, '')
      if (cleaned.length >= 4) {
        return `(XXX) XXX-${cleaned.slice(-4)}`
      }
      return text
    case 'email':
      // Show first 2 chars and domain: ab***@example.com
      const [local, domain] = text.split('@')
      if (local && domain) {
        return `${local.slice(0, 2)}***@${domain}`
      }
      return text
    default:
      return text
  }
}
