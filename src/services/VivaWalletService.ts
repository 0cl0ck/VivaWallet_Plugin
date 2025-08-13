import type {
  CreateOrderRequest,
  CreateOrderResponse,
  RefundResponse,
  VerifyTransactionResponse,
} from '../types/api.js'
import type { VivaWalletConfig } from '../types/index.js'

import { TokenManager } from './TokenManager.js'

/**
 * VivaWalletService handles all API interactions with Viva Wallet
 * - Payment order creation
 * - Transaction verification
 * - Checkout URL generation
 */
export class VivaWalletService {
  private readonly environment: 'demo' | 'live'
  private readonly sourceCode: string
  private tokenManager: TokenManager

  constructor(config: VivaWalletConfig) {
    this.tokenManager = new TokenManager(config)
    this.environment = config.environment
    this.sourceCode = config.sourceCode

    if (!this.sourceCode) {
      throw new Error('VivaWalletService requires sourceCode')
    }
  }

  /**
   * Get the base API URL based on environment
   */
  private getApiBaseUrl(): string {
    return this.environment === 'demo'
      ? 'https://demo-api.vivapayments.com'
      : 'https://api.vivapayments.com'
  }

  /**
   * Clear cached token (useful for testing or credential changes)
   */
  clearToken(): void {
    this.tokenManager.clearToken()
  }

  /**
   * Create a payment order
   */
  async createPaymentOrder(data: Omit<CreateOrderRequest, 'sourceCode'>): Promise<{
    checkoutUrl: string
    orderCode: string
  }> {
    const token = await this.tokenManager.getToken()
    const url = `${this.getApiBaseUrl()}/checkout/v2/orders`

    // Build the request body
    const requestBody: CreateOrderRequest = {
      amount: data.amount, // Already in minor units (e.g., 1000 = €10.00)
      sourceCode: this.sourceCode,
      ...(data.customer && {
        customer: {
          countryCode: data.customer.countryCode,
          email: data.customer.email,
          fullName: data.customer.fullName,
          phone: data.customer.phone,
          requestLang: data.customer.requestLang,
        },
      }),
      ...(data.merchantTrns && { merchantTrns: data.merchantTrns }),
      ...(data.customerTrns && { customerTrns: data.customerTrns }),
      ...(data.preauth !== undefined && { preauth: data.preauth }),
      ...(data.allowRecurring !== undefined && { allowRecurring: data.allowRecurring }),
      ...(data.maxInstallments !== undefined && { maxInstallments: data.maxInstallments }),
      ...(data.paymentTimeout !== undefined && { paymentTimeout: data.paymentTimeout }),
      ...(data.disableCash !== undefined && { disableCash: data.disableCash }),
      ...(data.disableWallet !== undefined && { disableWallet: data.disableWallet }),
      ...(data.redirectUrl && { redirectUrl: data.redirectUrl }),
      ...(data.failUrl && { failUrl: data.failUrl }),
    }

    try {
      const response = await fetch(url, {
        body: JSON.stringify(requestBody),
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      const result = (await response.json()) as CreateOrderResponse

      // Check for API errors
      // Viva Wallet API returns errorCode 0 for success, non-zero for errors
      if (!response.ok || (result.errorCode && result.errorCode !== 0)) {
        const errorMessage = result.errorText || 'Unknown error'
        const errorCode = result.errorCode || response.status
        throw new Error(`Viva API Error [${errorCode}]: ${errorMessage}`)
      }

      // Check if we have a valid success response
      if (!result.orderCode) {
        throw new Error(`Invalid response: missing orderCode. Response: ${JSON.stringify(result)}`)
      }

      // Convert orderCode to string to handle 16-digit numbers safely
      const orderCode = String(result.orderCode)
      const checkoutUrl = this.getCheckoutUrl(orderCode)

      // Payment order created successfully

      return {
        checkoutUrl,
        orderCode,
      }
    } catch (error) {
      // Error creating payment order

      if (error instanceof Error) {
        throw error
      }

      throw new Error('Failed to create payment order')
    }
  }

  /**
   * Get the checkout URL for a payment order
   */
  getCheckoutUrl(orderCode: string): string {
    const domain =
      this.environment === 'demo' ? 'https://demo.vivapayments.com' : 'https://www.vivapayments.com'

    return `${domain}/web/checkout?ref=${orderCode}`
  }

  /**
   * Get the current environment
   */
  getEnvironment(): 'demo' | 'live' {
    return this.environment
  }

  /**
   * Get the configured source code
   */
  getSourceCode(): string {
    return this.sourceCode
  }

  /**
   * Get transaction details
   * Similar to verify but might return different data
   */
  async getTransaction(transactionId: string): Promise<VerifyTransactionResponse> {
    const token = await this.tokenManager.getToken()
    const url = `${this.getApiBaseUrl()}/checkout/v2/transactions/${transactionId}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`Failed to get transaction: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Cancel/Refund a transaction (Phase 2 - not in MVP)
   *
   * @param transactionId - The transaction to refund
   * @param amount - Optional amount for partial refunds (in cents)
   */
  async refundTransaction(transactionId: string, amount?: number): Promise<RefundResponse> {
    const token = await this.tokenManager.getToken()

    // Build URL with optional amount parameter
    let url = `${this.getApiBaseUrl()}/transactions/${transactionId}`
    if (amount !== undefined) {
      url += `?amount=${amount}`
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to refund transaction: ${response.status} ${response.statusText}. Response: ${errorText}`,
      )
    }

    const result = await response.json()

    // Transaction refunded successfully

    return result
  }

  /**
   * Verify a transaction by ID
   * Note: This requires the transaction to be completed
   */
  async verifyTransaction(transactionId: string): Promise<VerifyTransactionResponse> {
    const token = await this.tokenManager.getToken()
    const url = `${this.getApiBaseUrl()}/checkout/v2/transactions/${transactionId}`

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'GET',
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Failed to verify transaction: ${response.status} ${response.statusText}. Response: ${errorText}`,
        )
      }

      const result: VerifyTransactionResponse = await response.json()

      // Transaction verified successfully

      return result
    } catch (error) {
      // Error verifying transaction

      if (error instanceof Error) {
        throw error
      }

      throw new Error('Failed to verify transaction')
    }
  }
}

/**
 * Create a service instance with configuration
 */
export const createVivaWalletService = (config: VivaWalletConfig): VivaWalletService => {
  return new VivaWalletService(config)
}
