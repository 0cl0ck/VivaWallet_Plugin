import type { Payload } from 'payload'

import config from '@payload-config'
import { createPayloadRequest, getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { createOrderHandler, verifyWebhookHandler, webhookHandler } from '../src/endpoints/handlers.js'

let payload: Payload

afterAll(async () => {
  if (payload && 'destroy' in payload && typeof payload.destroy === 'function') {
    await payload.destroy()
  }
})

beforeAll(async () => {
  payload = await getPayload({ config })
})

describe('Viva Wallet Plugin integration tests', () => {
  test('should have Viva Wallet collections available', () => {
    // Check that payment orders collection exists
    const paymentOrdersCollection = payload.collections['viva-payment-orders']
    expect(paymentOrdersCollection).toBeDefined()

    // Check that transactions collection exists
    const transactionsCollection = payload.collections['viva-transactions']
    expect(transactionsCollection).toBeDefined()
  })

  test('should have Viva Settings global available', () => {
    // Check that the global exists
    const vivaSettingsKey = 'viva-settings' as keyof typeof payload.globals
    const vivaSettings = payload.globals[vivaSettingsKey]
    expect(vivaSettings).toBeDefined()
  })

  test('should be able to create a payment order', async () => {
    const order = await payload.create({
      collection: 'viva-payment-orders',
      data: {
        amount: 1000, // €10.00
        checkoutUrl: 'https://demo.vivapayments.com/checkout/test',
        orderCode: '1234567890123456', // 16 digits as required
        sourceCode: '1234', // 4 digits as required
        status: 'pending',
      },
    })

    expect(order.orderCode).toBe('1234567890123456')
    expect(order.amount).toBe(1000)
    expect(order.status).toBe('pending')
  })

  test('should be able to create a transaction', async () => {
    // First create a payment order
    const order = await payload.create({
      collection: 'viva-payment-orders',
      data: {
        amount: 2000, // €20.00
        checkoutUrl: 'https://demo.vivapayments.com/checkout/test456',
        orderCode: '9876543210987654', // 16 digits as required
        sourceCode: '5678', // 4 digits as required
        status: 'pending',
      },
    })

    // Then create a transaction
    const transaction = await payload.create({
      collection: 'viva-transactions',
      data: {
        amount: 2000,
        eventTypeId: 1796, // Payment Created
        orderCode: '9876543210987654', // Match the order code
        paymentOrder: order.id,
        processedAt: new Date().toISOString(),
        statusId: 'A',
        transactionId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
      },
    })

    expect(transaction.transactionId).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(transaction.orderCode).toBe('9876543210987654')
    expect(transaction.statusId).toBe('A')
  })

  test('create order endpoint should exist', async () => {
    const request = new Request('http://localhost:3000/api/viva-wallet/create-order', {
      body: JSON.stringify({
        amount: 1000,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    const _payloadReq = await createPayloadRequest({ 
      config, 
      request,
    })

    // The endpoint should exist and be callable
    expect(createOrderHandler).toBeDefined()
    expect(typeof createOrderHandler).toBe('function')
  })

  test('webhook endpoints should exist', () => {
    // Test webhook verification endpoint
    expect(verifyWebhookHandler).toBeDefined()
    expect(typeof verifyWebhookHandler).toBe('function')

    // Test webhook handler endpoint
    expect(webhookHandler).toBeDefined()
    expect(typeof webhookHandler).toBe('function')
  })
})