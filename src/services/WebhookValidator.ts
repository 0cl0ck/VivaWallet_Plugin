import { createHmacSignature, timingSafeCompare } from '../utils/encryption.js'

/**
 * WebhookValidator handles signature verification for Viva Wallet webhooks
 * - Supports HMAC-SHA256 (primary)
 * - Supports HMAC-SHA1 (fallback/legacy)
 * - Implements timing-safe comparison to prevent timing attacks
 */
export class WebhookValidator {
  private readonly allowUnsigned: boolean
  private readonly webhookSecret: string
  
  constructor(webhookSecret: string, options?: { allowUnsigned?: boolean }) {
    this.webhookSecret = webhookSecret
    this.allowUnsigned = options?.allowUnsigned || process.env.NODE_ENV === 'development'
    
    if (!this.webhookSecret && !this.allowUnsigned) {
      throw new Error('WebhookValidator requires a webhook secret in production')
    }
  }
  
  /**
   * Validate HMAC-SHA1 signature (legacy/fallback)
   */
  private validateHMAC1(rawBody: Buffer | string, signature: string): boolean {
    try {
      if (!this.webhookSecret) {
        // Cannot validate signature without webhook secret
        return false
      }
      
      const calculated = createHmacSignature(rawBody, this.webhookSecret, 'sha1')
      
      // Use timing-safe comparison to prevent timing attacks
      const isValid = timingSafeCompare(signature.toLowerCase(), calculated.toLowerCase())
      
      if (isValid) {
        // Webhook signature validated (SHA-1, legacy)
      } else {
        // Invalid webhook signature (SHA-1)
      }
      
      return isValid
    } catch (error) {
      // Error validating SHA-1 signature
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error validating SHA-1 signature:', error)  
      }
      return false
    }
  }
  
  /**
   * Validate HMAC-SHA256 signature
   */
  private validateHMAC256(rawBody: Buffer | string, signature: string): boolean {
    try {
      if (!this.webhookSecret) {
        // Cannot validate signature without webhook secret
        return false
      }
      
      const calculated = createHmacSignature(rawBody, this.webhookSecret, 'sha256')
      
      // Use timing-safe comparison to prevent timing attacks
      const isValid = timingSafeCompare(signature.toLowerCase(), calculated.toLowerCase())
      
      if (isValid) {
        // Webhook signature validated (SHA-256)
      } else {
        // Invalid webhook signature (SHA-256)
      }
      
      return isValid
    } catch (error) {
      // Error validating SHA-256 signature
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error validating SHA-256 signature:', error)  
      }
      return false
    }
  }
  
  /**
   * Create a signature for testing purposes
   * 
   * @param payload - The payload to sign
   * @param algorithm - The algorithm to use
   * @returns The calculated signature
   */
  createTestSignature(
    payload: Buffer | string,
    algorithm: 'sha1' | 'sha256' = 'sha256'
  ): string {
    if (!this.webhookSecret) {
      throw new Error('Cannot create signature without webhook secret')
    }
    
    return createHmacSignature(payload, this.webhookSecret, algorithm)
  }
  
  /**
   * Check if unsigned webhooks are allowed
   */
  isUnsignedAllowed(): boolean {
    return this.allowUnsigned
  }
  
  /**
   * Validate webhook signature
   * 
   * @param rawBody - The raw request body (string or Buffer)
   * @param signature256 - The Viva-Signature-256 header value (HMAC-SHA256)
   * @param signature - The Viva-Signature header value (HMAC-SHA1, legacy)
   * @returns true if signature is valid, false otherwise
   */
  validateSignature(
    rawBody: Buffer | string,
    signature256?: string,
    signature?: string
  ): boolean {
    // If no secret is configured and unsigned is allowed, accept the webhook
    if (!this.webhookSecret && this.allowUnsigned) {
      // Webhook received without signature verification (development mode)
      return true
    }
    
    // If we have a secret but no signature, check if unsigned is allowed
    if (this.webhookSecret && !signature256 && !signature) {
      if (this.allowUnsigned) {
        // Webhook received without signature (unsigned allowed)
        return true
      }
      // Webhook received without signature
      return false
    }
    
    // Prefer SHA-256 over SHA-1
    if (signature256) {
      return this.validateHMAC256(rawBody, signature256)
    }
    
    if (signature) {
      return this.validateHMAC1(rawBody, signature)
    }
    
    // No signature provided and not in development mode
    return false
  }
}