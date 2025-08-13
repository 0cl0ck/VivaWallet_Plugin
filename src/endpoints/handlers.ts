import type { Payload } from 'payload'

// Type definitions for Next.js compatibility
interface NextRequest {
  arrayBuffer(): Promise<ArrayBuffer>
  headers: Headers
  json(): Promise<unknown>
}

type NextResponse = Response

const NextResponse = {
  json(body: unknown, init?: ResponseInit): Response {
    return new Response(JSON.stringify(body), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    })
  },
}

import type { CreateOrderRequest } from '../types/api.js'
import type { PaymentOrder, VivaSettings } from '../types/index.js'
import type { TransactionEventData, WebhookEvent } from '../types/webhook.js'

import { createVivaWalletService } from '../services/VivaWalletService.js'
import { WebhookValidator } from '../services/WebhookValidator.js'
import { generateWebhookKey } from '../utils/encryption.js'

// Narrow Payload methods to avoid coupling to host GeneratedTypes
// We purposefully use `unknown` (not `any`) to satisfy strict mode and user rules
type UntypedPayload = {
  create(args: unknown): Promise<unknown>
  find(args: unknown): Promise<unknown>
  findGlobal(args: unknown): Promise<unknown>
  update(args: unknown): Promise<unknown>
  updateGlobal(args: unknown): Promise<unknown>
}

type FindResult<T> = { docs: T[]; totalDocs: number }

/**
 * Create Order Handler
 * Handles payment order creation requests
 */
export async function createOrderHandler(
  req: NextRequest,
  payload: Payload,
  userId?: string,
): Promise<NextResponse> {
  try {
    // Check authentication (from server-resolved user)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const body = (await req.json()) as Partial<CreateOrderRequest>

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Prepare untyped payload to avoid host GeneratedTypes coupling
    const p = payload as unknown as UntypedPayload

    // Get Viva settings
    const settings = (await p.findGlobal({
      slug: 'viva-settings',
      depth: 0,
    })) as VivaSettings

    if (!settings.clientId || !settings.clientSecret || !settings.sourceCode) {
      return NextResponse.json({ error: 'Viva Wallet is not configured' }, { status: 500 })
    }

    // Log the request for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Creating payment order:', {
        amount: body.amount,
        customerEmail: body.customer?.email,
        environment: settings.environment,
        hasCustomer: !!body.customer,
        sourceCode: settings.sourceCode,
      })
    }

    // Initialize service
    const service = createVivaWalletService({
      clientId: settings.clientId,
      clientSecret: settings.clientSecret,
      environment: settings.environment,
      sourceCode: settings.sourceCode,
    })

    // Create order with Viva
    const vivaOrder = await service.createPaymentOrder({
      amount: body.amount,
      customer: body.customer,
      customerTrns: body.customerTrns,
      merchantTrns: body.merchantTrns,
    })

    // Store in database
    const order = (await p.create({
      collection: 'viva-payment-orders',
      data: {
        amount: body.amount,
        checkoutUrl: vivaOrder.checkoutUrl,
        customerEmail: body.customer?.email,
        customerName: body.customer?.fullName,
        merchantReference: body.merchantTrns,
        orderCode: vivaOrder.orderCode,
        sourceCode: settings.sourceCode,
        status: 'pending',
      },
    })) as PaymentOrder

    return NextResponse.json({
      checkoutUrl: order.checkoutUrl,
      orderCode: order.orderCode,
      success: true,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create order'

    // In production, you should use a proper logging service
    if (process.env.NODE_ENV !== 'production') {
      console.error('Create order error:', error)
    }

    return NextResponse.json(
      {
        error: errorMessage,
        success: false,
      },
      { status: 500 },
    )
  }
}

/**
 * Webhook Handler
 * Processes webhook notifications from Viva Wallet
 */
export async function webhookHandler(req: NextRequest, payload: Payload): Promise<NextResponse> {
  try {
    const rawBody = await req.arrayBuffer()
    const bodyBuffer = Buffer.from(rawBody)
    const bodyText = bodyBuffer.toString('utf8')

    // Get headers
    const signature256 = req.headers.get('viva-signature-256') ?? undefined
    const signature = req.headers.get('viva-signature') ?? undefined
    const deliveryId = req.headers.get('viva-delivery-id') ?? undefined

    const p = payload as unknown as UntypedPayload

    // Get webhook secret
    const settings = (await p.findGlobal({
      slug: 'viva-settings',
      depth: 0,
    })) as VivaSettings

    if (!settings.webhookKey) {
      // Webhook key not configured
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    // Validate signature
    const validator = new WebhookValidator(settings.webhookKey)
    if (!validator.validateSignature(bodyBuffer, signature256, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Check idempotency
    if (deliveryId) {
      const existing = (await p.find({
        collection: 'viva-transactions',
        limit: 1,
        where: {
          vivaDeliveryId: { equals: deliveryId },
        },
      })) as FindResult<unknown>

      if (existing.totalDocs > 0) {
        return NextResponse.json({
          message: 'Already processed',
          success: true,
        })
      }
    }

    // Parse event
    const event: WebhookEvent = JSON.parse(bodyText)

    // Process based on event type
    switch (event.EventTypeId) {
      case 1796: // Transaction Payment Created
        await processPaymentSuccess(payload, event, deliveryId)
        break

      case 1798: // Transaction Failed
        await processPaymentFailed(payload, event, deliveryId)
        break

      default:
      // Unhandled event type
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Processing failed'

    // In production, you should use a proper logging service
    if (process.env.NODE_ENV !== 'production') {
      console.error('Webhook processing error:', error)
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

/**
 * Webhook Verification Handler
 * Responds to Viva's webhook verification request
 */
export async function verifyWebhookHandler(
  req: NextRequest,
  payload: Payload,
): Promise<NextResponse> {
  try {
    const p = payload as unknown as UntypedPayload

    // Get or create webhook key
    const settings = (await p.findGlobal({
      slug: 'viva-settings',
      depth: 0,
    })) as VivaSettings

    let webhookKey = settings.webhookKey

    if (!webhookKey) {
      // Generate new key
      webhookKey = generateWebhookKey()

      // Save it
      await p.updateGlobal({
        slug: 'viva-settings',
        data: {
          ...settings,
          webhookKey,
        },
      })
    }

    // Return the expected JSON response
    return NextResponse.json({
      Key: webhookKey,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Verification failed'

    // In production, you should use a proper logging service
    if (process.env.NODE_ENV !== 'production') {
      console.error('Webhook verification error:', error)
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

/**
 * Process successful payment
 */
async function processPaymentSuccess(
  payload: Payload,
  event: WebhookEvent,
  deliveryId?: string,
): Promise<void> {
  const eventData = event.EventData as TransactionEventData
  const p = payload as unknown as UntypedPayload

  // Update order status
  const orders = (await p.find({
    collection: 'viva-payment-orders',
    limit: 1,
    where: {
      orderCode: { equals: String(eventData.OrderCode) },
    },
  })) as FindResult<{ id: string }>

  if (orders.docs.length > 0) {
    await p.update({
      id: orders.docs[0].id,
      collection: 'viva-payment-orders',
      data: {
        status: 'completed',
      },
    })
  }

  // Create transaction record
  await p.create({
    collection: 'viva-transactions',
    data: {
      amount: eventData.Amount,
      cardLastFour: eventData.CardNumber?.slice(-4),
      customerEmail: eventData.Email,
      customerName: eventData.FullName,
      eventData: event,
      eventTypeId: event.EventTypeId,
      orderCode: String(eventData.OrderCode),
      processedAt: new Date(),
      statusId: eventData.StatusId,
      transactionId: String(eventData.TransactionId),
      vivaDeliveryId: deliveryId,
    },
  })
}

/**
 * Process failed payment
 */
async function processPaymentFailed(
  payload: Payload,
  event: WebhookEvent,
  deliveryId?: string,
): Promise<void> {
  const eventData = event.EventData as TransactionEventData
  const p = payload as unknown as UntypedPayload

  // Update order status
  const orders = (await p.find({
    collection: 'viva-payment-orders',
    limit: 1,
    where: {
      orderCode: { equals: String(eventData.OrderCode) },
    },
  })) as FindResult<{ id: string }>

  if (orders.docs.length > 0) {
    await p.update({
      id: orders.docs[0].id,
      collection: 'viva-payment-orders',
      data: {
        status: 'failed',
      },
    })
  }

  // Create transaction record
  await p.create({
    collection: 'viva-transactions',
    data: {
      amount: eventData.Amount,
      eventData: event,
      eventTypeId: event.EventTypeId,
      orderCode: String(eventData.OrderCode),
      processedAt: new Date(),
      statusId: 'F',
      transactionId: String(eventData.TransactionId),
      vivaDeliveryId: deliveryId,
    },
  })
}
