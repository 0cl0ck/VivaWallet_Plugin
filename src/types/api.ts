/**
 * API Types for Viva Wallet Integration
 */

/**
 * OAuth2 Token Request
 */
export interface TokenRequest {
  grant_type: 'client_credentials'
}

/**
 * OAuth2 Token Response
 */
export interface TokenResponse {
  access_token: string
  expires_in: number // Seconds (typically 3600)
  scope?: string
  token_type: 'Bearer'
}

/**
 * Create Payment Order Request
 */
export interface CreateOrderRequest {
  /**
   * Allow recurring payments
   */
  allowRecurring?: boolean
  
  /**
   * Amount in cents (e.g., 1000 = €10.00)
   */
  amount: number
  
  /**
   * Customer information
   */
  customer?: {
    countryCode?: string
    email?: string
    fullName?: string
    phone?: string
    requestLang?: string
  }
  
  /**
   * Customer transaction reference
   */
  customerTrns?: string
  
  /**
   * Disable cash payments
   */
  disableCash?: boolean
  
  /**
   * Disable wallet payments
   */
  disableWallet?: boolean
  
  failUrl?: string
  
  /**
   * Maximum installments allowed
   */
  maxInstallments?: number
  
  /**
   * Merchant transaction reference
   */
  merchantTrns?: string
  
  /**
   * Payment timeout in seconds
   */
  paymentTimeout?: number
  
  /**
   * Pre-authorization flag
   */
  preauth?: boolean
  
  /**
   * Custom redirect URLs
   */
  redirectUrl?: string
  /**
   * 4-digit payment source code
   */
  sourceCode: string
}

/**
 * Create Payment Order Response
 */
export interface CreateOrderResponse {
  /**
   * Correlation ID
   */
  correlationId?: string
  
  /**
   * Error code (0 = success)
   */
  errorCode: number
  
  /**
   * Error message if any
   */
  errorText?: string
  
  /**
   * Event ID
   */
  eventId?: number
  
  /**
   * 16-digit order code (as number in response, store as string)
   */
  orderCode: number
  
  /**
   * Success indicator
   */
  success: boolean
  
  /**
   * Timestamp
   */
  timestamp?: string
}

/**
 * Verify Transaction Request
 */
export interface VerifyTransactionRequest {
  transactionId: string
}

/**
 * Verify Transaction Response
 */
export interface VerifyTransactionResponse {
  amount: number
  cardNumber?: string
  customerTrns?: string
  email?: string
  fullName?: string
  insDate: string
  merchantTrns?: string
  orderCode: number
  statusId: string
  transactionId: string
}

/**
 * API Error Response
 */
export interface VivaApiError {
  correlationId?: string
  errorCode: number
  errorText: string
  eventId?: number
  success: false
  timestamp?: string
}

/**
 * Refund Transaction Request (Phase 2)
 */
export interface RefundRequest {
  amount?: number // Optional for partial refunds
  sourceCode?: string
  transactionId: string
}

/**
 * Refund Transaction Response (Phase 2)
 */
export interface RefundResponse {
  amount: number
  errorCode?: number
  errorText?: string
  statusId: string
  success: boolean
  transactionId: string
}

/**
 * List Transactions Request
 */
export interface ListTransactionsRequest {
  dateFrom?: Date
  dateTo?: Date
  orderCode?: string
  page?: number
  pageSize?: number
}

/**
 * Checkout URL Builder Options
 */
export interface CheckoutUrlOptions {
  color?: string
  environment: 'demo' | 'live'
  lang?: string
  orderCode: string
}