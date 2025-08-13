import type { Config, Plugin } from 'payload'

import type { VivaWalletPluginConfig } from './types/index.js'

// Import collections
import { PaymentOrdersCollection } from './collections/PaymentOrders.js'
import { VivaSettingsGlobal } from './collections/Settings.js'
import { TransactionsCollection } from './collections/Transactions.js'
// Import endpoint handlers
import { createOrderHandler, verifyWebhookHandler, webhookHandler } from './endpoints/handlers.js'

/**
 * Viva Wallet Smart Checkout Plugin for Payload CMS
 * 
 * Integrates Viva Wallet payment gateway with Payload CMS applications
 * 
 * @param pluginOptions - Plugin configuration options
 * @returns Plugin function to extend Payload config
 */
export const vivaWalletPlugin = (
  pluginOptions: VivaWalletPluginConfig = {}
): Plugin => {
  // Set defaults
  const options: VivaWalletPluginConfig = {
    admin: {
      dashboard: pluginOptions.admin?.dashboard !== false,
      settings: pluginOptions.admin?.settings !== false,
      ...pluginOptions.admin,
    },
    collections: {
      paymentOrders: pluginOptions.collections?.paymentOrders || 'viva-payment-orders',
      transactions: pluginOptions.collections?.transactions || 'viva-transactions',
      ...pluginOptions.collections,
    },
    enabled: pluginOptions.enabled !== false,
    environment: pluginOptions.environment || 'demo',
    webhooks: {
      autoVerify: pluginOptions.webhooks?.autoVerify !== false,
      endpoint: pluginOptions.webhooks?.endpoint || '/api/viva-wallet/webhook',
      ...pluginOptions.webhooks,
    },
    ...pluginOptions,
  }

  // Helper functions to reduce cognitive complexity
  const initializeConfigArrays = (config: Config): void => {
    config.collections = config.collections || []
    config.globals = config.globals || []
    config.endpoints = config.endpoints || []
  }

  const addCoreCollections = (config: Config, options: VivaWalletPluginConfig): void => {
    config.collections!.push(PaymentOrdersCollection(options))
    config.collections!.push(TransactionsCollection(options))
    config.globals!.push(VivaSettingsGlobal(options))
  }

  const createOrdersExtensionFields = () => ({
    name: 'vivaPayment',
    type: 'group' as const,
    admin: {
      position: 'sidebar' as const,
    },
    fields: [
      {
        name: 'orderCode',
        type: 'text' as const,
        admin: {
          readOnly: true,
        },
        label: 'Order Code',
      },
      {
        name: 'status',
        type: 'select' as const,
        admin: {
          readOnly: true,
        },
        label: 'Payment Status',
        options: [
          { label: 'Pending', value: 'pending' },
          { label: 'Completed', value: 'completed' },
          { label: 'Failed', value: 'failed' },
          { label: 'Cancelled', value: 'cancelled' },
        ],
      },
      {
        name: 'checkoutUrl',
        type: 'text' as const,
        admin: {
          readOnly: true,
        },
        label: 'Checkout URL',
      },
    ],
    label: 'Viva Wallet Payment',
  })

  const createProductsExtensionFields = () => ({
    name: 'vivaWallet',
    type: 'group' as const,
    fields: [
      {
        name: 'enabled',
        type: 'checkbox' as const,
        defaultValue: true,
        label: 'Enable Viva Wallet for this product',
      },
      {
        name: 'sourceCode',
        type: 'text' as const,
        admin: {
          description: 'Optional: Use a different source code for this product',
        },
        label: 'Source Code Override',
      },
    ],
    label: 'Viva Wallet Settings',
  })

  const extendCollections = (config: Config, options: VivaWalletPluginConfig): void => {
    if (!options.collections?.extend) {return}

    // Extend Orders collection
    if (options.collections.extend.orders) {
      const ordersCollection = config.collections!.find(col => col.slug === 'orders')
      if (ordersCollection) {
        ordersCollection.fields.push(createOrdersExtensionFields())
      }
    }

    // Extend Products collection
    if (options.collections.extend.products) {
      const productsCollection = config.collections!.find(col => col.slug === 'products')
      if (productsCollection) {
        productsCollection.fields.push(createProductsExtensionFields())
      }
    }
  }

  const setupAdminComponents = (config: Config, options: VivaWalletPluginConfig): void => {
    // Initialize admin structure
    config.admin = config.admin || {}
    config.admin.components = config.admin.components || {}

    // Add dashboard widget if enabled
    if (options.admin?.dashboard) {
      config.admin.components.beforeDashboard = config.admin.components.beforeDashboard || []
      config.admin.components.beforeDashboard.push(
        'viva-wallet-plugin/client#VivaDashboardWidget'
      )
    }

    // Add custom views for settings if enabled
    if (options.admin?.settings) {
      config.admin.components.views = config.admin.components.views || {}
      config.admin.components.views.VivaWalletSettings = {
        Component: 'viva-wallet-plugin/client#VivaSettingsView',
        path: '/admin/viva-wallet-settings',
      }
    }
  }

  const addApiEndpoints = (config: Config, options: VivaWalletPluginConfig): void => {
    // Create Order endpoint
    config.endpoints!.push({
      handler: createOrderHandler,
      method: 'post',
      path: '/api/viva-wallet/create-order',
    })
    
    // Webhook endpoint (POST for receiving webhooks)
    config.endpoints!.push({
      handler: webhookHandler,
      method: 'post',
      path: options.webhooks?.endpoint || '/api/viva-wallet/webhook',
    })
    
    // Webhook verification endpoint (GET for Viva verification)
    config.endpoints!.push({
      handler: verifyWebhookHandler,
      method: 'get',
      path: options.webhooks?.endpoint || '/api/viva-wallet/webhook',
    })
  }

  return (config: Config): Config => {
    // Initialize required arrays
    initializeConfigArrays(config)

    // Add core collections and globals
    addCoreCollections(config, options)

    // Extend existing collections if requested
    extendCollections(config, options)

    /**
     * If the plugin is disabled, we still want to keep added collections/fields 
     * so the database schema is consistent which is important for migrations.
     */
    if (options.disabled) {
      return config
    }

    // Add API endpoints
    addApiEndpoints(config, options)

    // Setup admin UI components
    setupAdminComponents(config, options)

    // Add onInit hook for initial setup
    const incomingOnInit = config.onInit

    config.onInit = async (payload) => {
      // Execute any existing onInit functions
      if (incomingOnInit) {
        await incomingOnInit(payload)
      }

      // Initialize Viva Wallet settings if not present
      try {
        const settings = await payload.findGlobal({
          slug: 'viva-settings',
        })
        
        if (!settings) {
          await payload.updateGlobal({
            slug: 'viva-settings',
            data: {
              environment: options.environment || 'demo',
              webhookUrl: `${payload.config.serverURL}${options.webhooks?.endpoint || '/api/viva-wallet/webhook'}`,
            },
          })
        }

        // Viva Wallet Plugin initialized successfully
      } catch (error) {
        // Failed to initialize Viva Wallet Plugin
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to initialize Viva Wallet Plugin:', error)  
        }
      }
    }

    return config
  }
}

export type {
  CreateOrderRequest,
  CreateOrderResponse,
  TokenResponse,
} from './types/api.js'

// Export types for external use
export type { 
  PaymentOrder,
  PaymentStatus,
  Transaction,
  TransactionStatusId,
  VivaSettings,
  VivaWalletPluginConfig,
} from './types/index.js'

export type {
  TransactionEventData,
  WebhookEvent,
  WebhookEventType,
  WebhookHeaders,
} from './types/webhook.js'