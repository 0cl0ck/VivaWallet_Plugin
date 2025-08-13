import type { Config } from 'payload'

/**
 * Main plugin configuration
 */
export interface VivaWalletPluginConfig {
  /**
   * Admin UI configuration
   */
  admin?: {
    /**
     * Show dashboard widget
     * @default true
     */
    dashboard?: boolean
    
    /**
     * Show settings in admin
     * @default true
     */
    settings?: boolean
  }
  
  /**
   * Collection customization
   */
  collections?: {
    /**
     * Extend existing collections with payment fields
     */
    extend?: {
      orders?: boolean
      products?: boolean
    }
    
    /**
     * Custom slug for payment orders collection
     * @default 'viva-payment-orders'
     */
    paymentOrders?: string
    
    /**
     * Custom slug for transactions collection
     * @default 'viva-transactions'
     */
    transactions?: string
  }
  
  /**
   * Viva Wallet API credentials
   * Can be provided here or via environment variables
   */
  credentials?: {
    apiKey?: string
    clientId?: string
    clientSecret?: string
    merchantId?: string
    sourceCode?: string
  }
  
  /**
   * Disable plugin without removing schema
   */
  disabled?: boolean
  
  /**
   * Enable or disable the plugin
   */
  enabled?: boolean
  
  /**
   * Viva Wallet environment
   */
  environment?: 'demo' | 'live'
  
  /**
   * URL configuration for callbacks
   */
  urls?: {
    /**
     * Failure redirect URL after payment
     */
    failureUrl?: string
    
    /**
     * Success redirect URL after payment
     */
    successUrl?: string
  }
  
  /**
   * Webhook configuration
   */
  webhooks?: {
    /**
     * Auto-verify payments after webhook
     * @default true
     */
    autoVerify?: boolean
    
    /**
     * Custom webhook endpoint path
     * @default '/api/viva-wallet/webhook'
     */
    endpoint?: string
  }
}

/**
 * Internal service configuration
 */
export interface VivaWalletConfig {
  apiKey?: string
  clientId: string
  clientSecret: string
  environment: 'demo' | 'live'
  merchantId?: string
  sourceCode: string
}

/**
 * Payment order status
 */
export type PaymentStatus = 'cancelled' | 'completed' | 'failed' | 'pending'

/**
 * Transaction status from Viva
 */
export type TransactionStatusId = 'A' | 'E' | 'F' // Failed, Authorized/Success, Error

/**
 * Plugin context for internal use
 */
export interface VivaWalletContext {
  config: VivaWalletPluginConfig
  service?: import('../services/VivaWalletService.js').VivaWalletService // eslint-disable-line @typescript-eslint/consistent-type-imports
  settings?: VivaSettings
}

/**
 * Global settings interface
 */
export interface VivaSettings {
  apiKey?: string
  clientId: string
  clientSecret: string
  createdAt?: Date
  environment: 'demo' | 'live'
  id?: string
  lastTokenRefresh?: Date
  merchantId?: string
  sourceCode: string
  updatedAt?: Date
  webhookKey?: string
  webhookUrl?: string
}

/**
 * Payment order interface
 */
export interface PaymentOrder {
  amount: number // Amount in cents
  checkoutUrl?: string
  createdAt?: Date
  customerEmail?: string
  customerName?: string
  id?: string
  merchantReference?: string
  metadata?: Record<string, unknown>
  orderCode: string // 16-digit string
  sourceCode: string
  status: PaymentStatus
  updatedAt?: Date
}

/**
 * Transaction interface
 */
export interface Transaction {
  amount: number
  createdAt?: Date
  eventData?: Record<string, unknown>
  eventTypeId: number
  id?: string
  orderCode: string // Relation to PaymentOrder
  processedAt?: Date
  statusId: TransactionStatusId
  transactionId: string
  updatedAt?: Date
  vivaDeliveryId?: string
}

/**
 * Plugin-augmented Payload Config
 */
export type VivaWalletPlugin = (config: Config) => Config