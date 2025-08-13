# Viva Wallet Plugin Endpoints

## Important Note for Payload v3

In Payload CMS v3 with Next.js App Router, custom endpoints are created as Route Handlers in the Next.js app directory, NOT through the config.endpoints array.

## Implementation

The actual endpoints should be created in your Next.js app directory:

```
app/
└── api/
    └── viva-wallet/
        ├── create-order/
        │   └── route.ts      # POST endpoint
        ├── webhook/
        │   └── route.ts      # POST and GET endpoints
        └── verify-payment/
            └── [id]/
                └── route.ts  # GET endpoint
```

## Example Route Handler

```typescript
// app/api/viva-wallet/create-order/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { createOrderHandler } from 'viva-wallet-plugin/endpoints'

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config })
  return createOrderHandler(req, payload)
}
```

The handlers in this directory are utilities that can be imported and used in your Next.js route handlers.