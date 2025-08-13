/**
 * GET /api/viva-wallet/webhook
 * Handles Viva Wallet webhook verification request
 */
export declare function GET(req: Request): Promise<any>
/**
 * POST /api/viva-wallet/webhook
 * Receives and processes webhook notifications from Viva Wallet
 */
export declare function POST(req: Request): Promise<any>
