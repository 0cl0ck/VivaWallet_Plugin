/**
 * Webhook Types for Viva Wallet
 */

/**
 * Webhook Event Type IDs
 */
export enum WebhookEventType {
  /**
   * Order Updated - Order status changed
   */
  ORDER_UPDATED = 4865,
  
  /**
   * Transaction Failed - Payment failed
   */
  TRANSACTION_FAILED = 1798,
  
  /**
   * Transaction Payment Created - Payment successful
   */
  TRANSACTION_PAYMENT_CREATED = 1796,
  
  /**
   * Transaction Payment Created Offline (optional, not in MVP)
   */
  TRANSACTION_PAYMENT_CREATED_OFFLINE = 1799,
}

/**
 * Main webhook event payload
 */
export interface WebhookEvent {
  /**
   * Created date
   */
  Created?: string
  
  /**
   * Event data (varies by event type)
   */
  EventData?: OrderEventData | Record<string, unknown> | TransactionEventData
  
  /**
   * Event type identifier
   */
  EventTypeId: number | WebhookEventType
  
  /**
   * Expiration date
   */
  ExpirationDate?: string
  
  /**
   * Merchant ID
   */
  MerchantId?: string
  
  /**
   * Timestamp in milliseconds
   */
  Moto: number
  
  /**
   * URL for additional data
   */
  Url?: string
}

/**
 * Transaction Payment Created Event Data
 */
export interface TransactionEventData {
  /**
   * Amount in cents
   */
  Amount: number
  
  /**
   * Bank ID
   */
  BankId?: string
  
  /**
   * Card last 4 digits
   */
  CardNumber?: string
  
  /**
   * Card type
   */
  CardTypeId?: number
  
  /**
   * Clearing date
   */
  ClearanceDate?: string
  
  /**
   * Currency code (e.g., 'EUR')
   */
  CurrencyCode: string
  
  /**
   * Customer reference
   */
  CustomerTrns?: string
  
  /**
   * Digital wallet indicator
   */
  DigitalWalletId?: number
  
  /**
   * Customer email
   */
  Email?: string
  
  /**
   * Customer full name
   */
  FullName?: string
  
  /**
   * Insert date
   */
  InsDate?: string
  
  /**
   * Installments
   */
  Installments?: number
  
  /**
   * Pre-authorization indicator
   */
  IsPreAuth?: boolean
  
  /**
   * Recurring transaction indicator
   */
  IsRecurring?: boolean
  
  /**
   * Merchant reference
   */
  MerchantTrns?: string
  
  /**
   * 16-digit order code
   */
  OrderCode: number
  
  /**
   * Customer phone
   */
  Phone?: string
  
  /**
   * Response code
   */
  ResponseCode?: string
  
  /**
   * Response description
   */
  ResponseDescription?: string
  
  /**
   * Source code
   */
  SourceCode?: string
  
  /**
   * Transaction status ID
   * F = Failed
   * A = Authorized/Success
   * E = Error
   */
  StatusId: 'A' | 'E' | 'F'
  
  /**
   * Terminal ID
   */
  TerminalId?: number
  
  /**
   * Transaction ID (UUID format)
   */
  TransactionId: string
}

/**
 * Order Updated Event Data
 */
export interface OrderEventData {
  /**
   * Amount
   */
  Amount?: number
  
  /**
   * Customer reference
   */
  CustomerTrns?: string
  
  /**
   * Insert date
   */
  InsDate?: string
  
  /**
   * Cancellation indicator
   */
  IsCancelled?: boolean
  
  /**
   * Merchant reference
   */
  MerchantTrns?: string
  
  /**
   * Order code
   */
  OrderCode: number
  
  /**
   * Source code
   */
  SourceCode?: string
  
  /**
   * State ID
   */
  StateId?: number
  
  /**
   * Order status
   */
  StatusId?: string
  
  /**
   * Tags
   */
  Tags?: string[]
}

/**
 * Webhook verification response
 */
export interface WebhookVerificationResponse {
  /**
   * Verification key
   */
  Key: string
}

/**
 * Webhook headers
 */
export interface WebhookHeaders {
  /**
   * Delivery ID for idempotency
   */
  'viva-delivery-id'?: string
  
  /**
   * Event type
   */
  'viva-event-type'?: string
  
  /**
   * HMAC-SHA1 signature (legacy)
   */
  'viva-signature'?: string
  
  /**
   * HMAC-SHA256 signature
   */
  'viva-signature-256'?: string
  
  /**
   * Webhook ID
   */
  'viva-webhook-id'?: string
}

/**
 * Webhook processing result
 */
export interface WebhookProcessingResult {
  error?: string
  message?: string
  orderCode?: string
  success: boolean
  transactionId?: string
}

/**
 * Webhook validation result
 */
export interface WebhookValidationResult {
  deliveryId?: string
  error?: string
  isDuplicate?: boolean
  isValid: boolean
}