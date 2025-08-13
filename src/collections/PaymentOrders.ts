import type { CollectionConfig } from 'payload'

import type { VivaWalletPluginConfig } from '../types/index.js'

/**
 * Payment Orders Collection
 * Stores all payment orders created through Viva Wallet
 */
export const PaymentOrdersCollection = (
  pluginOptions: VivaWalletPluginConfig
): CollectionConfig => ({
  slug: pluginOptions.collections?.paymentOrders || 'viva-payment-orders',
  
  labels: {
    plural: 'Payment Orders',
    singular: 'Payment Order',
  },
  
  admin: {
    defaultColumns: ['orderCode', 'status', 'amount', 'customerEmail', 'createdAt'],
    description: 'Viva Wallet payment orders',
    group: 'Viva Wallet',
    useAsTitle: 'orderCode',
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
    update: ({ req: { user } }) => Boolean(user),
  },
  
  fields: [
    {
      name: 'orderCode',
      type: 'text',
      admin: {
        description: '16-digit order code from Viva Wallet',
        readOnly: true,
      },
      index: true,
      label: 'Order Code',
      required: true,
      unique: true,
      validate: (value: null | string | string[] | undefined) => {
        const val = typeof value === 'string' ? value : null
        if (!val || val.length !== 16) {
          return 'Order code must be exactly 16 digits'
        }
        if (!/^\d+$/.test(val)) {
          return 'Order code must contain only digits'
        }
        return true
      },
    },
    {
      name: 'amount',
      type: 'number',
      admin: {
        description: 'Amount in cents (e.g., 1000 = €10.00)',
      },
      label: 'Amount (cents)',
      min: 1,
      required: true,
    },
    {
      name: 'sourceCode',
      type: 'text',
      admin: {
        description: '4-digit payment source code',
        readOnly: true,
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
    {
      name: 'status',
      type: 'select',
      admin: {
        position: 'sidebar',
      },
      defaultValue: 'pending',
      label: 'Status',
      options: [
        {
          label: 'Pending',
          value: 'pending',
        },
        {
          label: 'Completed',
          value: 'completed',
        },
        {
          label: 'Failed',
          value: 'failed',
        },
        {
          label: 'Cancelled',
          value: 'cancelled',
        },
      ],
      required: true,
    },
    {
      name: 'customerEmail',
      type: 'email',
      index: true,
      label: 'Customer Email',
    },
    {
      name: 'customerName',
      type: 'text',
      label: 'Customer Name',
    },
    {
      name: 'merchantReference',
      type: 'text',
      admin: {
        description: 'Your internal order reference',
      },
      index: true,
      label: 'Merchant Reference',
    },
    {
      name: 'checkoutUrl',
      type: 'text',
      admin: {
        description: 'Viva Wallet checkout page URL',
        readOnly: true,
      },
      label: 'Checkout URL',
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Additional data for this order',
      },
      label: 'Metadata',
    },
    {
      name: 'transactions',
      type: 'relationship',
      admin: {
        description: 'Related transactions for this order',
        position: 'sidebar',
      },
      hasMany: true,
      label: 'Transactions',
      relationTo: (pluginOptions.collections?.transactions || 'viva-transactions') as 'viva-transactions',
    },
  ],
  
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        // Ensure orderCode is always stored as string
        if (data?.orderCode && typeof data.orderCode === 'number') {
          data.orderCode = String(data.orderCode)
        }
        
        // Set initial status for new orders
        if (operation === 'create' && !data.status) {
          data.status = 'pending'
        }
        
        return data
      },
    ],
    
    afterChange: [
      ({ doc, operation }) => {
        // Log order creation
        if (operation === 'create') {
          // New payment order created
        }
        
        // Log status changes
        if (operation === 'update' && doc.status) {
          // Order status changed
        }
        
        return doc
      },
    ],
  },
  
  timestamps: true,
})

export default PaymentOrdersCollection