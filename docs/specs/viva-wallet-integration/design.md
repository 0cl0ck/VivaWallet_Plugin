# Technical Design - Viva Wallet Smart Checkout Plugin for Payload CMS

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Payload CMS Application                  │
├─────────────────────────────────────────────────────────────┤
│                  Viva Wallet Plugin Layer                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   API    │  │  Admin   │  │  Hooks   │  │  Service │   │
│  │ Endpoints│  │    UI    │  │  System  │  │   Layer  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer (Collections)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Payment Orders│  │ Transactions │  │   Settings   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    Viva Wallet API                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   OAuth2     │  │   Checkout   │  │   Webhooks   │     │
│  │   /connect   │  │  /checkout   │  │   Events     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Plugin Structure

```
src/
├── index.ts                 # Main plugin entry
├── types/
│   ├── index.ts            # TypeScript interfaces
│   ├── api.ts              # API request/response types
│   └── webhook.ts          # Webhook payload types
├── collections/
│   ├── PaymentOrders.ts    # Payment order collection
│   ├── Transactions.ts     # Transaction collection
│   └── Settings.ts         # Global settings
├── services/
│   ├── VivaWalletService.ts # Main API service
│   ├── TokenManager.ts      # OAuth2 token management
│   └── WebhookValidator.ts  # Signature verification
├── endpoints/
│   ├── create-order.ts      # Create payment order
│   ├── webhook.ts           # Webhook handler
│   └── verify.ts            # Webhook verification
├── hooks/
│   └── index.ts             # Payload hooks
├── components/
│   ├── SettingsView.tsx     # Admin settings UI
│   └── OrderStatus.tsx      # Status display
└── exports/
    ├── index.ts             # Server exports
    └── client.ts            # Client exports
```

### 1.3 Plugin Export Contract

- The plugin MUST export a default function, for example `vivaWalletPlugin(options?: PluginOptions): Plugin`,
  which returns a function to extend the Payload config (e.g. `collections`, `globals`, `endpoints`, `admin`).
- Target Payload v3.x; use TypeScript strict mode and avoid `any`.

## 2. Data Models

### 2.1 Payment Orders Collection

```typescript
interface PaymentOrder {
  id: string;
  orderCode: string;          // 16-digit string (UNIQUE INDEX)
  amount: number;              // Amount in cents
  sourceCode: string;          // 4-digit payment source
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  customerEmail?: string;
  customerName?: string;
  merchantReference?: string;
  checkoutUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 Transactions Collection

```typescript
interface Transaction {
  id: string;
  transactionId: string;       // UNIQUE INDEX
  orderCode: string;           // Relation to PaymentOrder
  eventTypeId: number;         // 1796, 1798, etc.
  statusId: string;            // F=Failed, A=Success
  amount: number;
  vivaDeliveryId?: string;     // For idempotency
  eventData: Record<string, unknown>; // Complete webhook payload
  processedAt: Date;
  createdAt: Date;
}
```

### 2.3 Settings Collection (Global)

```typescript
interface VivaSettings {
  id: string;
  environment: 'demo' | 'live';
  clientId: string;            // Encrypted
  clientSecret: string;        // Encrypted  
  merchantId?: string;         // Optional - legacy/specific APIs (encrypted)
  apiKey?: string;             // Optional - legacy APIs (encrypted)
  sourceCode: string;
  webhookKey: string;          // Auto-generated
  webhookUrl: string;          // Auto-generated
  lastTokenRefresh?: Date;
  updatedAt: Date;
}
```

## 3. Service Layer Design

### 3.1 VivaWalletService

```typescript
class VivaWalletService {
  private tokenManager: TokenManager;
  private environment: 'demo' | 'live';
  
  constructor(config: VivaWalletConfig) {
    this.tokenManager = new TokenManager(config);
    this.environment = config.environment;
  }

  private getBaseUrl(): string {
    return this.environment === 'demo' 
      ? 'https://demo-api.vivapayments.com'
      : 'https://api.vivapayments.com';
  }

  async createPaymentOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
    // OAuth2 token should include scope: urn:viva:payments:core:api:redirectcheckout
    const token = await this.tokenManager.getToken();
    
    const response = await fetch(`${this.getBaseUrl()}/checkout/v2/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: data.amount,
        sourceCode: data.sourceCode,
        customer: {
          email: data.customerEmail,
          fullName: data.customerName
        },
        merchantTrns: data.merchantReference,
        customerTrns: data.customerReference
      })
    });

    const result = await response.json();
    
    if (!result.orderCode) {
      throw new Error(`Failed to create order: ${result.message}`);
    }

    // Store as string to avoid JS number limits
    return {
      orderCode: String(result.orderCode),
      checkoutUrl: this.getCheckoutUrl(String(result.orderCode))
    };
  }

  private getCheckoutUrl(orderCode: string): string {
    // The checkout URL is based on the environment.
    const domain = this.environment === 'demo' 
      ? 'https://demo.vivapayments.com'
      : 'https://www.vivapayments.com';
    return `${domain}/web/checkout?ref=${orderCode}`;
  }
}
```

### 3.2 TokenManager

```typescript
class TokenManager {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private clientId: string;
  private clientSecret: string;
  private environment: 'demo' | 'live';

  constructor(config: VivaWalletConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.environment = config.environment;
  }

  private getAuthUrl(): string {
    return this.environment === 'demo'
      ? 'https://demo-accounts.vivapayments.com/connect/token'
      : 'https://accounts.vivapayments.com/connect/token';
  }

  async getToken(): Promise<string> {
    // Check if cached token is still valid (with 5 min buffer)
    if (this.token && this.tokenExpiry) {
      const bufferTime = new Date(Date.now() + 5 * 60 * 1000);
      if (this.tokenExpiry > bufferTime) {
        return this.token;
      }
    }

    // Request new token
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await fetch(this.getAuthUrl(), {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    this.token = data.access_token;
    // Token expires in ~1 hour (3600 seconds)
    this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000));
    
    return this.token;
  }

  clearToken(): void {
    this.token = null;
    this.tokenExpiry = null;
  }
}
```

### 3.3 WebhookValidator

```typescript
import crypto from 'crypto';

class WebhookValidator {
  private webhookSecret: string;

  constructor(webhookSecret: string) {
    this.webhookSecret = webhookSecret;
  }

  validateSignature(
    rawBody: string | Buffer,
    signature256?: string,
    signature?: string
  ): boolean {
    // Prefer SHA-256 over SHA-1
    if (signature256) {
      return this.validateHMAC256(rawBody, signature256);
    }
    
    if (signature) {
      return this.validateHMAC1(rawBody, signature);
    }
    
    // In development, allow unsigned webhooks with warning
    if (process.env.NODE_ENV === 'development') {
      console.warn('Webhook received without signature');
      return true;
    }
    
    return false;
  }

  private validateHMAC256(rawBody: string | Buffer, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(rawBody);
    const calculated = hmac.digest('hex');
    
    // Timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculated)
    );
  }

  private validateHMAC1(rawBody: string | Buffer, signature: string): boolean {
    const hmac = crypto.createHmac('sha1', this.webhookSecret);
    hmac.update(rawBody);
    const calculated = hmac.digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculated)
    );
  }
}
```

## 4. API Endpoints

### 4.1 Create Payment Order

```typescript
// src/endpoints/create-order.ts
export const createOrderHandler = async (req: PayloadRequest, res: Response) => {
  try {
    const { amount, customerEmail, customerName, merchantReference } = req.body;
    
    // Get settings
    const settings = await req.payload.findGlobal({
      slug: 'viva-settings'
    });
    
    // Initialize service
    const service = new VivaWalletService({
      clientId: settings.clientId,
      clientSecret: settings.clientSecret,
      sourceCode: settings.sourceCode,
      environment: settings.environment
    });
    
    // Create order with Viva
    const vivaResponse = await service.createPaymentOrder({
      amount,
      sourceCode: settings.sourceCode,
      customerEmail,
      customerName,
      merchantReference
    });
    
    // Store in database
    const order = await req.payload.create({
      collection: 'viva-payment-orders',
      data: {
        orderCode: vivaResponse.orderCode,
        amount,
        sourceCode: settings.sourceCode,
        status: 'pending',
        customerEmail,
        customerName,
        merchantReference,
        checkoutUrl: vivaResponse.checkoutUrl
      }
    });
    
    return res.json({
      success: true,
      orderCode: order.orderCode,
      checkoutUrl: order.checkoutUrl
    });
    
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
```

### 4.2 Webhook Handler

Important:
- In Payload v3, custom endpoints receive a standard Web Request object. The raw request body can be accessed via `req.arrayBuffer()` to enable signature verification.
- Header names are case-insensitive and can be accessed via `req.headers.get('header-name')`.

```typescript
// src/endpoints/webhook.ts
import type { PayloadHandler } from 'payload'

export const webhookHandler: PayloadHandler = async (req) => {
  try {
    // Get raw body for signature verification
    const rawBody = Buffer.from(await req.arrayBuffer());
    const signature256 = req.headers.get('viva-signature-256') ?? '';
    
    // Get webhook secret from globals
    const settings = await req.payload.findGlobal({ slug: 'viva-settings' });
    
    // Validate signature
    const validator = new WebhookValidator(settings.webhookKey);
    if (!validator.validateSignature(rawBody, signature256)) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // ... process the webhook event data from the rawBody ...

    return Response.json({ success: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
};
```

### 4.3 Webhook Verification

```typescript
// src/endpoints/verify.ts
export const verifyWebhookHandler = async (req: PayloadRequest, res: Response) => {
  try {
    // Generate or retrieve verification key
    const settings = await req.payload.findGlobal({
      slug: 'viva-settings'
    });
    
    let webhookKey = settings.webhookKey;
    
    if (!webhookKey) {
      // Generate new key
      webhookKey = crypto.randomBytes(32).toString('hex');
      
      // Save it
      await req.payload.updateGlobal({
        slug: 'viva-settings',
        data: {
          webhookKey
        }
      });
    }
    
    // Return the expected JSON response
    return res.json({
      Key: webhookKey
    });
    
  } catch (error) {
    console.error('Webhook verification error:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
};
```

## 5. Plugin Configuration

### 5.1 Main Plugin Function

```typescript
// src/index.ts
import type { Plugin } from 'payload/config';

export const vivaWalletPlugin = (options: VivaWalletPluginConfig): Plugin => 
  (config: Config): Config => {
    
    // Add collections
    config.collections = [
      ...(config.collections || []),
      PaymentOrdersCollection,
      TransactionsCollection
    ];
    
    // Add global
    config.globals = [
      ...(config.globals || []),
      SettingsGlobal
    ];
    
    // Add endpoints
    config.endpoints = [
      ...(config.endpoints || []),
      {
        path: '/api/viva-wallet/create-order',
        method: 'post',
        handler: createOrderHandler
      },
      {
        path: '/api/viva-wallet/webhook',
        method: 'post',
        handler: webhookHandler,
        custom: {
          rawBody: true // Important for signature verification
        }
      },
      {
        path: '/api/viva-wallet/webhook',
        method: 'get',
        handler: verifyWebhookHandler
      }
    ];
    
    return config;
  };
```

### 5.2 TypeScript Interfaces

```typescript
// src/types/index.ts
export interface VivaWalletPluginConfig {
  enabled?: boolean;
  environment?: 'demo' | 'live';
  credentials?: {
    clientId?: string;
    clientSecret?: string;
    merchantId?: string;
    apiKey?: string;
    sourceCode?: string;
  };
  webhookEndpoint?: string;
  collections?: {
    paymentOrders?: string;
    transactions?: string;
  };
}

export interface CreateOrderRequest {
  amount: number;              // In cents
  sourceCode: string;
  customerEmail?: string;
  customerName?: string;
  merchantReference?: string;
  customerReference?: string;
}

export interface CreateOrderResponse {
  orderCode: string;           // Stored as string
  checkoutUrl: string;
}

export interface WebhookEvent {
  EventTypeId: number;
  TransactionId: string;
  OrderCode: number;          // Comes as number, convert to string
  StatusId: string;
  Amount: number;
  // ... other fields
}
```

## 6. Security Considerations

### 6.1 Sensitive Data Encryption

To securely store sensitive credentials like `clientId` and `clientSecret`, the plugin MUST use Payload's Field Hooks. This ensures data is encrypted before being stored in the database and decrypted only when accessed via the API or Admin panel.

This pattern relies on two hooks:
- `beforeChange`: Encrypts the field's value before it is saved.
- `afterRead`: Decrypts the field's value after it is retrieved.

#### Example Implementation:

```typescript
// src/collections/Settings.ts
import type { Field } from 'payload';
import { encryptField, decryptField } from '../utils/encryption'; // Utility functions

export const clientSecretField: Field = {
  name: 'clientSecret',
  type: 'text',
  hooks: {
    beforeChange: [encryptField], // Encrypts before saving
    afterRead:   [decryptField], // Decrypts on reading
  },
};
```

## 7. Error Handling

### 7.1 Retry Strategy
```typescript
class RetryableService {
  async withRetry<T>(
    fn: () => Promise<T>, 
    maxRetries = 3,
    backoffMs = 1000
  ): Promise<T> {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry client errors
        if (error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
        
        // Exponential backoff
        const delay = backoffMs * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}
```

## 8. Testing Strategy

### 8.1 Unit Tests
- Service methods with mocked API responses
- Webhook signature verification
- Token refresh logic

### 8.2 Integration Tests
- Payment order creation flow
- Webhook processing pipeline
- Database operations

### 8.3 E2E Tests (Demo Environment)
- Complete payment flow
- Admin UI interactions
- Error scenarios

## 9. Deployment Considerations

### 9.1 Environment Variables
```env
VIVA_ENVIRONMENT=demo
VIVA_CLIENT_ID=xxx
VIVA_CLIENT_SECRET=xxx
VIVA_MERCHANT_ID=xxx
VIVA_API_KEY=xxx
VIVA_SOURCE_CODE=1234
```

### 9.2 Webhook URL Configuration
- Development: `https://localhost:3000/api/viva-wallet/webhook`
- Production: `https://yourdomain.com/api/viva-wallet/webhook`
- Must be configured in Viva Wallet dashboard

## 10. Future Enhancements (Phase 2)

- Refund processing (`DELETE /api/transactions/{id}`)
- Recurring payments support
- Multiple payment sources
- Advanced reporting and analytics
- Marketplace/split payments
- Pre-authorization support