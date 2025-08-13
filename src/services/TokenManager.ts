import type { TokenResponse } from '../types/api.js'
import type { VivaWalletConfig } from '../types/index.js'

/**
 * TokenManager handles OAuth2 token management for Viva Wallet API
 * - Caches tokens for ~1 hour (3600 seconds)
 * - Automatically refreshes tokens before expiry
 * - Handles environment-specific endpoints
 */
export class TokenManager {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly environment: 'demo' | 'live'
  
  private refreshPromise: null | Promise<string> = null
  private token: null | string = null
  private tokenExpiry: Date | null = null
  
  constructor(config: VivaWalletConfig) {
    this.clientId = config.clientId
    this.clientSecret = config.clientSecret
    this.environment = config.environment
    
    if (!this.clientId || !this.clientSecret) {
      throw new Error('TokenManager requires clientId and clientSecret')
    }
  }
  
  /**
   * Get the OAuth2 token endpoint URL based on environment
   */
  private getAuthUrl(): string {
    return this.environment === 'demo'
      ? 'https://demo-accounts.vivapayments.com/connect/token'
      : 'https://accounts.vivapayments.com/connect/token'
  }
  
  /**
   * Refresh the OAuth2 access token
   */
  private async refreshToken(): Promise<string> {
    const url = this.getAuthUrl()
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
    
    try {
      const response = await fetch(url, {
        body: 'grant_type=client_credentials',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Token request failed: ${response.status} ${response.statusText}. Response: ${errorText}`
        )
      }
      
      const data: TokenResponse = await response.json()
      
      if (!data.access_token) {
        throw new Error('Invalid token response: missing access_token')
      }
      
      // Store the new token
      this.token = data.access_token
      
      // Calculate expiry time (default to 1 hour if not provided)
      const expiresIn = data.expires_in || 3600
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000)
      
      // Token refreshed successfully
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Token refreshed, expires at: ${this.tokenExpiry.toISOString()}`) // eslint-disable-line no-console
      }
      
      return this.token
    } catch (error) {
      // Log error in development
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to refresh Viva Wallet token:', error)  
      }
      
      // Clear any cached token on error
      this.clearToken()
      
      throw new Error(
        `Failed to obtain Viva Wallet access token: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }
  
  /**
   * Clear the cached token
   * Useful for forcing a refresh or on logout
   */
  clearToken(): void {
    this.token = null
    this.tokenExpiry = null
    this.refreshPromise = null
  }
  
  /**
   * Get the current environment
   */
  getEnvironment(): 'demo' | 'live' {
    return this.environment
  }
  
  /**
   * Get a valid access token, refreshing if necessary
   * Implements automatic refresh with 5-minute buffer before expiry
   */
  async getToken(): Promise<string> {
    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise
    }
    
    // Check if cached token is still valid (with 5 minute buffer)
    if (this.token && this.tokenExpiry) {
      const bufferTime = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
      if (this.tokenExpiry > bufferTime) {
        return this.token
      }
    }
    
    // Refresh the token
    this.refreshPromise = this.refreshToken()
    
    try {
      const token = await this.refreshPromise
      return token
    } finally {
      this.refreshPromise = null
    }
  }
  
  /**
   * Get token expiry time
   */
  getTokenExpiry(): Date | null {
    return this.tokenExpiry
  }
  
  /**
   * Check if a token is currently cached and valid
   */
  hasValidToken(): boolean {
    if (!this.token || !this.tokenExpiry) {
      return false
    }
    
    const bufferTime = new Date(Date.now() + 5 * 60 * 1000)
    return this.tokenExpiry > bufferTime
  }
}

/**
 * Create a singleton instance of TokenManager
 * This ensures we reuse tokens across the application
 */
let tokenManagerInstance: null | TokenManager = null

export const getTokenManager = (config?: VivaWalletConfig): TokenManager => {
  if (!tokenManagerInstance && config) {
    tokenManagerInstance = new TokenManager(config)
  }
  
  if (!tokenManagerInstance) {
    throw new Error('TokenManager not initialized. Please provide config on first call.')
  }
  
  return tokenManagerInstance
}

/**
 * Reset the singleton instance
 * Useful for testing or when credentials change
 */
export const resetTokenManager = (): void => {
  if (tokenManagerInstance) {
    tokenManagerInstance.clearToken()
  }
  tokenManagerInstance = null
}