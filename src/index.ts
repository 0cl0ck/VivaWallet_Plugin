import type { Config, Plugin } from 'payload'

import type { VivaWalletPluginConfig } from './types/index.js'

// Import collections
import { PaymentOrdersCollection } from './collections/PaymentOrders.js'
import { VivaSettingsGlobal } from './collections/Settings.js'
import { TransactionsCollection } from './collections/Transactions.js'

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

  return (config: Config): Config => {
    // Initialize arrays if not present
    if (!config.collections) {
      config.collections = []
    }

    if (!config.globals) {
      config.globals = []
    }

    if (!config.endpoints) {
      config.endpoints = []
    }

    // Add Payment Orders collection
    config.collections.push(PaymentOrdersCollection(options))

    // Add Transactions collection
    config.collections.push(TransactionsCollection(options))

    // Add Settings global
    config.globals.push(VivaSettingsGlobal(options))

    // Extend existing collections if requested
    if (options.collections?.extend) {
      // Extend Orders collection
      if (options.collections.extend.orders) {
        const ordersCollection = config.collections.find(
          (col) => col.slug === 'orders'
        )
        
        if (ordersCollection) {
          ordersCollection.fields.push({
            name: 'vivaPayment',
            type: 'group',
            admin: {
              position: 'sidebar',
            },
            fields: [
              {
                name: 'orderCode',
                type: 'text',
                admin: {
                  readOnly: true,
                },
                label: 'Order Code',
              },
              {
                name: 'status',
                type: 'select',
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
                type: 'text',
                admin: {
                  readOnly: true,
                },
                label: 'Checkout URL',
              },
            ],
            label: 'Viva Wallet Payment',
          })
        }
      }

      // Extend Products collection
      if (options.collections.extend.products) {
        const productsCollection = config.collections.find(
          (col) => col.slug === 'products'
        )
        
        if (productsCollection) {
          productsCollection.fields.push({
            name: 'vivaWallet',
            type: 'group',
            fields: [
              {
                name: 'enabled',
                type: 'checkbox',
                defaultValue: true,
                label: 'Enable Viva Wallet for this product',
              },
              {
                name: 'sourceCode',
                type: 'text',
                admin: {
                  description: 'Optional: Use a different source code for this product',
                },
                label: 'Source Code Override',
              },
            ],
            label: 'Viva Wallet Settings',
          })
        }
      }
    }

    /**
     * If the plugin is disabled, we still want to keep added collections/fields 
     * so the database schema is consistent which is important for migrations.
     */
    if (options.disabled) {
      return config
    }

    // Add API endpoints
    // Create Order endpoint
    // TODO: Uncomment when endpoint is created
    // config.endpoints.push({
    //   path: '/api/viva-wallet/create-order',
    //   method: 'post',
    //   handler: createOrderHandler,
    // })

    // Webhook endpoint (POST for receiving webhooks)
    // TODO: Uncomment when endpoint is created
    // config.endpoints.push({
    //   path: options.webhooks.endpoint!,
    //   method: 'post',
    //   handler: webhookHandler,
    // })

    // Webhook verification endpoint (GET for Viva verification)
    // TODO: Uncomment when endpoint is created
    // config.endpoints.push({
    //   path: options.webhooks.endpoint!,
    //   method: 'get',
    //   handler: verifyWebhookHandler,
    // })

    // Add admin UI components
    if (!config.admin) {
      config.admin = {}
    }

    if (!config.admin.components) {
      config.admin.components = {}
    }

    // Add dashboard widget if enabled
    if (options.admin?.dashboard) {
      if (!config.admin.components.beforeDashboard) {
        config.admin.components.beforeDashboard = []
      }

      // TODO: Uncomment when components are created
      // config.admin.components.beforeDashboard.push(
      //   'viva-wallet-plugin/client#VivaDashboardWidget'
      // )
    }

    // Add custom views for settings if enabled
    if (options.admin?.settings) {
      if (!config.admin.components.views) {
        config.admin.components.views = {}
      }

      // TODO: Uncomment when components are created
      // config.admin.components.views.VivaWalletSettings = {
      //   Component: 'viva-wallet-plugin/client#VivaSettingsView',
      //   path: '/admin/viva-wallet-settings',
      // }
    }

    // Add onInit hook for initial setup
    const incomingOnInit = config.onInit

    config.onInit = async (payload) => {
      // Execute any existing onInit functions
      if (incomingOnInit) {
        await incomingOnInit(payload)
      }

      // Initialize Viva Wallet settings if not present
      try {
        // TODO: Check if settings exist and create default if not
        // const settings = await payload.findGlobal({
        //   slug: 'viva-settings',
        // })
        
        // if (!settings) {
        //   await payload.updateGlobal({
        //     slug: 'viva-settings',
        //     data: {
        //       environment: options.environment,
        //       webhookUrl: `${payload.config.serverURL}${options.webhooks.endpoint}`,
        //     },
        //   })
        // }

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