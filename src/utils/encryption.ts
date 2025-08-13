import type { FieldHook } from 'payload'

import crypto from 'crypto'

/**
 * Encryption configuration
 */
const ALGORITHM = 'aes-256-gcm'
const SALT_LENGTH = 32
const IV_LENGTH = 16
// const TAG_LENGTH = 16 // Unused variable

/**
 * Get or generate encryption key from environment
 */
const getEncryptionKey = (): string => {
  const key = process.env.VIVA_ENCRYPTION_KEY || process.env.PAYLOAD_SECRET
  
  if (!key) {
    throw new Error(
      'Encryption key not found. Please set VIVA_ENCRYPTION_KEY or PAYLOAD_SECRET environment variable.'
    )
  }
  
  // Ensure key is 32 bytes for AES-256
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Encrypt a string value
 * 
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: salt:iv:tag:encrypted
 */
export const encrypt = (text: string): string => {
  if (!text) {return text}
  
  try {
    const key = getEncryptionKey()
    const salt = crypto.randomBytes(SALT_LENGTH)
    const iv = crypto.randomBytes(IV_LENGTH)
    
    // Derive a key from the main key and salt
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256')
    
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    // Combine all parts with colons
    return [
      salt.toString('hex'),
      iv.toString('hex'),
      tag.toString('hex'),
      encrypted,
    ].join(':')
  } catch (error) {
    // Log error in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Encryption error:', error)  
    }
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt a string value
 * 
 * @param encryptedText - Encrypted string in format: salt:iv:tag:encrypted
 * @returns Decrypted plain text
 */
export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) {return encryptedText}
  
  // Check if the text is already decrypted (doesn't match encrypted format)
  if (!encryptedText.includes(':')) {
    return encryptedText
  }
  
  try {
    const key = getEncryptionKey()
    const parts = encryptedText.split(':')
    
    if (parts.length !== 4) {
      // Not encrypted or wrong format, return as is
      return encryptedText
    }
    
    const [saltHex, ivHex, tagHex, encrypted] = parts
    
    const salt = Buffer.from(saltHex, 'hex')
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    
    // Derive the same key from the main key and salt
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256')
    
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    // Log error in development - might be normal if value isn't encrypted
    if (process.env.NODE_ENV === 'development') {
      console.debug('Decryption failed (value might not be encrypted):', error) // eslint-disable-line no-console
    }
    // Return original value if decryption fails
    // This handles cases where the value might not be encrypted
    return encryptedText
  }
}

/**
 * Field hook to encrypt data before saving
 * Use in beforeChange hooks
 */
export const encryptField: FieldHook = ({ value }) => {
  if (!value || typeof value !== 'string') {
    return value
  }
  
  // Skip if already encrypted (contains colons in expected format)
  const parts = value.split(':')
  if (parts.length === 4 && parts.every(part => /^[a-f0-9]+$/i.test(part))) {
    return value
  }
  
  return encrypt(value)
}

/**
 * Field hook to decrypt data after reading
 * Use in afterRead hooks
 */
export const decryptField: FieldHook = ({ value }) => {
  if (!value || typeof value !== 'string') {
    return value
  }
  
  return decrypt(value)
}

/**
 * Batch encrypt multiple fields
 * Useful for encrypting an entire object
 */
export const encryptFields = (
  data: Record<string, string | undefined>,
  fields: string[]
): Record<string, string | undefined> => {
  const encrypted = { ...data }
  
  for (const field of fields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encrypt(encrypted[field])
    }
  }
  
  return encrypted
}

/**
 * Batch decrypt multiple fields
 * Useful for decrypting an entire object
 */
export const decryptFields = (
  data: Record<string, string | undefined>,
  fields: string[]
): Record<string, string | undefined> => {
  const decrypted = { ...data }
  
  for (const field of fields) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      decrypted[field] = decrypt(decrypted[field])
    }
  }
  
  return decrypted
}

/**
 * Create encrypted field configuration for Payload
 * This is a helper to create a field with encryption hooks
 */
export const createEncryptedField = (
  name: string,
  label: string,
  options: {
    admin?: {
      description?: string
      placeholder?: string
      readOnly?: boolean
      type?: string
    }
    required?: boolean
    validate?: (value: null | string | string[] | undefined) => string | true
  } = {}
) => ({
  name,
  type: 'text' as const,
  admin: {
    ...options.admin,
    description: '🔒 This field is encrypted at rest',
  },
  hooks: {
    afterRead: [decryptField],
    beforeChange: [encryptField],
  },
  label,
  required: options.required,
  validate: options.validate,
})

/**
 * Hash a value using SHA-256
 * Useful for creating deterministic IDs or checksums
 */
export const hash = (value: string): string => {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/**
 * Generate a random key for webhook verification
 */
export const generateWebhookKey = (): string => {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Create HMAC signature for webhook verification
 */
export const createHmacSignature = (
  payload: Buffer | string,
  secret: string,
  algorithm: 'sha1' | 'sha256' = 'sha256'
): string => {
  return crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest('hex')
}

/**
 * Timing-safe comparison of two strings
 * Prevents timing attacks
 */
export const timingSafeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(a),
    Buffer.from(b)
  )
}