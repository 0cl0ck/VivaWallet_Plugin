import type { NextRequest } from 'next/server'

import config from '@payload-config'
import { getPayload } from 'payload'

// Import depuis le plugin local en développement
import { verifyWebhookHandler, webhookHandler } from '../../../../../src/endpoints/handlers'

/**
 * GET /api/viva-wallet/webhook
 * Handles Viva Wallet webhook verification request
 */
export async function GET(req: NextRequest) {
  const payload = await getPayload({ config })
  return verifyWebhookHandler(req, payload)
}

/**
 * POST /api/viva-wallet/webhook
 * Receives and processes webhook notifications from Viva Wallet
 */
export async function POST(req: NextRequest) {
  const payload = await getPayload({ config })
  return webhookHandler(req, payload)
}