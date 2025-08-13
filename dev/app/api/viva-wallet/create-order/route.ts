import config from '@payload-config'
import { createPayloadRequest, getPayload } from 'payload'

// Import depuis le plugin local en développement
import { createOrderHandler } from '../../../../../src/endpoints/handlers.js'

/**
 * POST /api/viva-wallet/create-order
 * Creates a new payment order with Viva Wallet
 */
export async function POST(req: Request) {
  const _payload = await getPayload({ config })
  const payloadReq = await createPayloadRequest({ config, request: req })
  return createOrderHandler(payloadReq)
}
