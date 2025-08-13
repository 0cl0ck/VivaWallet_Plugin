import config from '@payload-config'
import { createPayloadRequest, getPayload } from 'payload'

// Import depuis le plugin local en développement
import { verifyWebhookHandler, webhookHandler } from '../../../../../src/endpoints/handlers.js'

/**
 * GET /api/viva-wallet/webhook
 * Handles Viva Wallet webhook verification request
 */
export async function GET(req: Request) {
  const _payload = await getPayload({ config })
  const payloadReq = await createPayloadRequest({ config, request: req })
  return verifyWebhookHandler(payloadReq)
}

/**
 * POST /api/viva-wallet/webhook
 * Receives and processes webhook notifications from Viva Wallet
 */
export async function POST(req: Request) {
  const _payload = await getPayload({ config })
  const payloadReq = await createPayloadRequest({ config, request: req })
  return webhookHandler(payloadReq)
}
