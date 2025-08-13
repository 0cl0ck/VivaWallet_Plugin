import type { GlobalConfig } from 'payload'

import type { VivaWalletPluginConfig } from '../types/index.js'

import { createEncryptedField, generateWebhookKey } from '../utils/encryption.js'

/**
 * Viva Wallet Settings Global
 * Stores configuration and credentials for the Viva Wallet integration
 */
export const VivaSettingsGlobal = (pluginOptions: VivaWalletPluginConfig): GlobalConfig => ({
  slug: 'viva-settings',

  label: 'Viva Wallet Settings',

  admin: {
    description: 'Configure your Viva Wallet integration settings',
    group: 'Viva Wallet',
  },

  access: {
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) {
        return false
      }
      if (process.env.NODE_ENV !== 'production') {
        return true
      }
      const roles = (user as { roles?: string[] }).roles
      return Array.isArray(roles) && roles.includes('admin')
    },
  },

  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'environment',
              type: 'select',
              admin: {
                description: 'Select the Viva Wallet environment to use',
              },
              defaultValue: pluginOptions.environment || 'demo',
              label: 'Environment',
              options: [
                {
                  label: 'Demo/Sandbox',
                  value: 'demo',
                },
                {
                  label: 'Live/Production',
                  value: 'live',
                },
              ],
              required: true,
            },

            // OAuth2 Credentials
            createEncryptedField('clientId', 'Client ID', {
              admin: {
                description: 'OAuth2 Client ID from Viva Wallet',
                placeholder: 'Enter your Client ID',
              },
              required: true,
            }),

            createEncryptedField('clientSecret', 'Client Secret', {
              admin: {
                type: 'password',
                description: 'OAuth2 Client Secret from Viva Wallet',
                placeholder: 'Enter your Client Secret',
              },
              required: true,
            }),

            {
              name: 'sourceCode',
              type: 'text',
              admin: {
                description: '4-digit payment source code from Viva Wallet',
                placeholder: '0000',
              },
              label: 'Source Code',
              required: true,
              validate: (value: null | string | string[] | undefined) => {
                const val = typeof value === 'string' ? value : null
                if (!val || val.length !== 4) {
                  return 'Source code must be exactly 4 digits'
                }
                if (!/^\d+$/.test(val)) {
                  return 'Source code must contain only digits'
                }
                return true
              },
            },

            // Optional legacy credentials
            createEncryptedField('merchantId', 'Merchant ID', {
              admin: {
                description: 'Optional: Merchant ID for legacy APIs',
                placeholder: 'Enter your Merchant ID (optional)',
              },
              required: false,
            }),

            createEncryptedField('apiKey', 'API Key', {
              admin: {
                type: 'password',
                description: 'Optional: API Key for legacy APIs',
                placeholder: 'Enter your API Key (optional)',
              },
              required: false,
            }),
          ],
          label: 'API Configuration',
        },

        {
          fields: [
            {
              name: 'webhookKey',
              type: 'text',
              admin: {
                description:
                  "Auto-generated key for webhook verification. Do not modify unless you know what you're doing.",
                readOnly: true,
              },
              label: 'Webhook Verification Key',
            },

            {
              name: 'webhookUrl',
              type: 'text',
              admin: {
                description:
                  'Your webhook endpoint URL. Configure this in your Viva Wallet dashboard.',
                readOnly: true,
              },
              label: 'Webhook URL',
            },

            {
              name: 'regenerateWebhookKey',
              type: 'checkbox',
              admin: {
                description: 'Check this box and save to generate a new webhook key',
              },
              defaultValue: false,
              label: 'Regenerate Webhook Key',
            },
          ],
          label: 'Webhook Configuration',
        },

        {
          fields: [
            {
              name: 'successUrl',
              type: 'text',
              admin: {
                description: 'URL to redirect customers after successful payment',
                placeholder: 'https://yoursite.com/payment/success',
              },
              label: 'Success Redirect URL',
            },

            {
              name: 'failureUrl',
              type: 'text',
              admin: {
                description: 'URL to redirect customers after failed payment',
                placeholder: 'https://yoursite.com/payment/failure',
              },
              label: 'Failure Redirect URL',
            },

            {
              name: 'paymentTimeout',
              type: 'number',
              admin: {
                description: 'How long the payment session remains valid (default: 30 minutes)',
              },
              defaultValue: 1800,
              label: 'Payment Timeout (seconds)',
              max: 86400,
              min: 300,
            },

            {
              name: 'maxInstallments',
              type: 'number',
              admin: {
                description: 'Maximum number of installments allowed (0 = disabled)',
              },
              defaultValue: 0,
              label: 'Max Installments',
              max: 36,
              min: 0,
            },

            {
              name: 'disableCash',
              type: 'checkbox',
              admin: {
                description: 'Disable cash payment option at Viva Spots',
              },
              defaultValue: false,
              label: 'Disable Cash Payments',
            },

            {
              name: 'disableWallet',
              type: 'checkbox',
              admin: {
                description: 'Disable Viva Wallet payment option',
              },
              defaultValue: false,
              label: 'Disable Wallet Payments',
            },

            {
              name: 'allowRecurring',
              type: 'checkbox',
              admin: {
                description: 'Enable support for recurring payments',
              },
              defaultValue: false,
              label: 'Allow Recurring Payments',
            },
          ],
          label: 'Advanced Settings',
        },

        {
          fields: [
            {
              name: 'lastTokenRefresh',
              type: 'date',
              admin: {
                date: {
                  pickerAppearance: 'dayAndTime',
                },
                description: 'Last time the OAuth2 token was refreshed',
                readOnly: true,
              },
              label: 'Last Token Refresh',
            },

            {
              name: 'connectionStatus',
              type: 'ui',
              admin: {
                components: {
                  Field: 'viva-wallet-plugin/client#VivaSettingsView',
                },
              },
            },
          ],
          label: 'Status',
        },
      ],
    },
  ],

  hooks: {
    beforeChange: [
      ({ data, req }) => {
        // Generate webhook key if not set
        if (!data.webhookKey || data.regenerateWebhookKey) {
          data.webhookKey = generateWebhookKey()
          // Generated new webhook verification key
        }

        // Always set regenerateWebhookKey to false after processing
        data.regenerateWebhookKey = false

        // Set webhook URL based on server URL
        if (req?.payload?.config?.serverURL) {
          const webhookEndpoint = pluginOptions.webhooks?.endpoint || '/api/viva-wallet/webhook'
          data.webhookUrl = `${req.payload.config.serverURL}${webhookEndpoint}`
        }

        // Use environment variables as fallback for credentials if not provided
        if (!data.clientId && process.env.VIVA_CLIENT_ID) {
          data.clientId = process.env.VIVA_CLIENT_ID
        }

        if (!data.clientSecret && process.env.VIVA_CLIENT_SECRET) {
          data.clientSecret = process.env.VIVA_CLIENT_SECRET
        }

        if (!data.sourceCode && process.env.VIVA_SOURCE_CODE) {
          data.sourceCode = process.env.VIVA_SOURCE_CODE
        }

        if (!data.merchantId && process.env.VIVA_MERCHANT_ID) {
          data.merchantId = process.env.VIVA_MERCHANT_ID
        }

        if (!data.apiKey && process.env.VIVA_API_KEY) {
          data.apiKey = process.env.VIVA_API_KEY
        }

        return data
      },
    ],

    afterChange: [
      ({ doc }) => {
        // Viva Wallet settings updated

        // Clear any cached tokens when credentials change
        // This will be handled by the service layer

        return doc
      },
    ],
  },
})

export default VivaSettingsGlobal
