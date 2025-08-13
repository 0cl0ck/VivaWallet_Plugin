/**
 * Server-side exports for Viva Wallet Plugin
 */

// Collections (for manual registration if needed)
export { PaymentOrdersCollection } from '../collections/PaymentOrders.js'
export { VivaSettingsGlobal } from '../collections/Settings.js'
export { TransactionsCollection } from '../collections/Transactions.js'

// Endpoint handlers for Next.js Route Handlers
export {
  createOrderHandler,
  verifyWebhookHandler,
  webhookHandler,
} from '../endpoints/handlers.js'

// Main plugin
export { vivaWalletPlugin } from '../index.js'

// Services
export { getTokenManager, resetTokenManager, TokenManager } from '../services/TokenManager.js'
export { createVivaWalletService, VivaWalletService } from '../services/VivaWalletService.js'
export { WebhookValidator } from '../services/WebhookValidator.js'

export type {
  CreateOrderRequest,
  CreateOrderResponse,
  TokenResponse,
  VerifyTransactionRequest,
  VerifyTransactionResponse,
} from '../types/api.js'

// Types
export type {
  PaymentOrder,
  PaymentStatus,
  Transaction,
  TransactionStatusId,
  VivaSettings,
  VivaWalletConfig,
  VivaWalletPluginConfig,
} from '../types/index.js'

export type {
  OrderEventData,
  TransactionEventData,
  WebhookEvent,
  WebhookEventType,
  WebhookHeaders,
  WebhookProcessingResult,
} from '../types/webhook.js'

// Utilities
export {
  createEncryptedField,
  createHmacSignature,
  decrypt,
  decryptField,
  encrypt,
  encryptField,
  generateWebhookKey,
  timingSafeCompare,
} from '../utils/encryption.js'

export {
  defaultLogger,
  formatError,
  getLogger,
  type Logger,
} from '../utils/logger.js'