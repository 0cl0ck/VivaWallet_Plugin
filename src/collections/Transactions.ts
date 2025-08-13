import type { CollectionConfig } from 'payload'

import type { VivaWalletPluginConfig } from '../types/index.js'

/**
 * Transactions Collection
 * Stores all transaction events from Viva Wallet webhooks
 */
export const TransactionsCollection = (
  pluginOptions: VivaWalletPluginConfig,
): CollectionConfig => ({
  slug: pluginOptions.collections?.transactions || 'viva-transactions',

  labels: {
    plural: 'Transactions',
    singular: 'Transaction',
  },

  admin: {
    defaultColumns: ['transactionId', 'orderCode', 'statusId', 'amount', 'processedAt'],
    description: 'Viva Wallet transaction records from webhooks',
    group: 'Viva Wallet',
    useAsTitle: 'transactionId',
  },

  access: {
    create: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => {
      if (!user || !('roles' in user)) {
        return false
      }
      const userWithRoles = user as { roles?: string[] }
      return Boolean(userWithRoles.roles?.includes('admin'))
    },
    read: () => true,
    update: ({ req: { user } }) => {
      if (!user || !('roles' in user)) {
        return false
      }
      const userWithRoles = user as { roles?: string[] }
      return Boolean(userWithRoles.roles?.includes('admin'))
    },
  },

  fields: [
    {
      name: 'transactionId',
      type: 'text',
      admin: {
        description: 'UUID from Viva Wallet',
        readOnly: true,
      },
      index: true,
      label: 'Transaction ID',
      required: true,
      unique: true,
      validate: (value: null | string | string[] | undefined) => {
        const val = typeof value === 'string' ? value : null
        if (!val) {
          return 'Transaction ID is required'
        }
        // Basic UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(val)) {
          return 'Transaction ID must be a valid UUID'
        }
        return true
      },
    },
    {
      name: 'orderCode',
      type: 'text',
      admin: {
        description: '16-digit order code',
        readOnly: true,
      },
      index: true,
      label: 'Order Code',
      required: true,
    },
    {
      name: 'paymentOrder',
      type: 'relationship',
      admin: {
        description: 'Related payment order',
        position: 'sidebar',
      },
      hasMany: false,
      label: 'Payment Order',
      relationTo: (pluginOptions.collections?.paymentOrders ||
        'viva-payment-orders') as 'viva-payment-orders',
    },
    {
      name: 'eventTypeId',
      type: 'number',
      admin: {
        description: 'Webhook event type (1796=Payment Created, 1798=Failed)',
        readOnly: true,
      },
      label: 'Event Type ID',
      required: true,
    },
    {
      name: 'statusId',
      type: 'select',
      admin: {
        position: 'sidebar',
      },
      label: 'Status',
      options: [
        {
          label: 'Success/Authorized',
          value: 'A',
        },
        {
          label: 'Failed',
          value: 'F',
        },
        {
          label: 'Error',
          value: 'E',
        },
      ],
      required: true,
    },
    {
      name: 'amount',
      type: 'number',
      admin: {
        description: 'Transaction amount in cents',
      },
      label: 'Amount (cents)',
      min: 0,
      required: true,
    },
    {
      name: 'vivaDeliveryId',
      type: 'text',
      admin: {
        description: 'Used for webhook idempotency',
        readOnly: true,
      },
      index: true,
      label: 'Viva Delivery ID',
    },
    {
      name: 'customerEmail',
      type: 'email',
      label: 'Customer Email',
    },
    {
      name: 'customerName',
      type: 'text',
      label: 'Customer Name',
    },
    {
      name: 'cardLastFour',
      type: 'text',
      admin: {
        description: 'Last 4 digits of the card used',
      },
      label: 'Card Last 4',
      validate: (value: null | string | string[] | undefined) => {
        if (!value) {
          return true
        } // Optional field
        const val = typeof value === 'string' ? value : null
        if (!val) {
          return true
        }
        if (val.length !== 4 || !/^\d+$/.test(val)) {
          return 'Must be exactly 4 digits'
        }
        return true
      },
    },
    {
      name: 'isRecurring',
      type: 'checkbox',
      admin: {
        position: 'sidebar',
      },
      defaultValue: false,
      label: 'Is Recurring',
    },
    {
      name: 'isPreAuth',
      type: 'checkbox',
      admin: {
        position: 'sidebar',
      },
      defaultValue: false,
      label: 'Is Pre-Authorization',
    },
    {
      name: 'eventData',
      type: 'json',
      admin: {
        description: 'Complete webhook payload from Viva Wallet',
        readOnly: true,
      },
      label: 'Event Data',
    },
    {
      name: 'processedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      defaultValue: () => new Date(),
      label: 'Processed At',
      required: true,
    },
  ],

  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        // Ensure orderCode is always stored as string
        if (data?.orderCode && typeof data.orderCode === 'number') {
          data.orderCode = String(data.orderCode)
        }

        // Auto-link to payment order if not set
        if (operation === 'create' && !data.paymentOrder && data.orderCode) {
          try {
            const { payload } = req
            const paymentOrderSlug =
              pluginOptions.collections?.paymentOrders || 'viva-payment-orders'

            const { docs } = await payload.find({
              collection: paymentOrderSlug as 'viva-payment-orders',
              limit: 1,
              where: {
                orderCode: {
                  equals: data.orderCode,
                },
              },
            })

            if (docs.length > 0) {
              data.paymentOrder = docs[0].id
            }
          } catch (error) {
            // Failed to link transaction to payment order
            if (process.env.NODE_ENV !== 'production') {
              console.error('Failed to link transaction to payment order:', error)
            }
          }
        }

        return data
      },
    ],

    afterChange: [
      async ({ doc, operation, req }) => {
        // Update payment order status based on transaction
        if (operation === 'create' && doc.paymentOrder) {
          try {
            const { payload } = req
            const paymentOrderSlug =
              pluginOptions.collections?.paymentOrders || 'viva-payment-orders'

            // Determine new status based on transaction
            let newStatus: 'cancelled' | 'completed' | 'failed' | 'pending' = 'pending'
            if (doc.statusId === 'A' && doc.eventTypeId === 1796) {
              newStatus = 'completed'
            } else if (doc.statusId === 'F' || doc.eventTypeId === 1798) {
              newStatus = 'failed'
            }

            // Update the payment order
            const orderId =
              typeof doc.paymentOrder === 'string' ? doc.paymentOrder : doc.paymentOrder.id

            await payload.update({
              id: orderId,
              collection: paymentOrderSlug as 'viva-payment-orders',
              data: {
                status: newStatus,
              },
            })

            // Updated order status
          } catch (error) {
            // Failed to update payment order status
            if (process.env.NODE_ENV !== 'production') {
              console.error('Failed to update payment order status:', error)
            }
          }
        }

        return doc
      },
    ],
  },

  // Note: Compound indexes are configured at database level
  // indexes: [
  //   {
  //     fields: {
  //       orderCode: 1,
  //       transactionId: 1,
  //     },
  //     unique: true,
  //   },
  // ],

  timestamps: true,
})

export default TransactionsCollection
