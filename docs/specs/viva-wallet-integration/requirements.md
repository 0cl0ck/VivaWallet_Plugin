# Requirements Specification - Viva Wallet Smart Checkout Plugin for Payload CMS

## Executive Summary
This document defines the requirements for a Payload CMS plugin that integrates Viva Wallet Smart Checkout payment gateway. The plugin will provide seamless payment processing capabilities within Payload CMS applications.

## 1. Functional Requirements

### 1.1 Payment Order Management

#### REQ-001: Create Payment Order
**Priority**: P0 (Critical)
**Description**: The system SHALL create payment orders via Viva Wallet API
**Acceptance Criteria**:
- Send POST request to `https://{demo-}api.vivapayments.com/checkout/v2/orders`
- Include required fields: amount (in cents), sourceCode (4-digit)
- Store orderCode as string (16-digit integer)
- Generate checkout URL: `https://{demo.|www.}vivapayments.com/web/checkout?ref={OrderCode}`
- Handle OAuth2 bearer token authentication

#### REQ-002: Payment Status Tracking
**Priority**: P0 (Critical)
**Description**: The system SHALL track payment order status through webhooks
**Acceptance Criteria**:
- Process Transaction Payment Created event (EventTypeId: 1796)
- Process Transaction Failed event (EventTypeId: 1798)
- Update order status: pending → completed/failed
- Store transaction details from webhook payload

### 1.2 Authentication & Security

#### REQ-003: OAuth2 Token Management
**Priority**: P0 (Critical)
**Description**: The system SHALL implement OAuth2 client credentials flow
**Acceptance Criteria**:
- Request tokens from `https://{demo-}accounts.vivapayments.com/connect/token`
- Use Basic Auth with Base64 encoded `clientId:clientSecret`
- Send as `application/x-www-form-urlencoded` with `grant_type=client_credentials`
- Cache tokens for ~1 hour (3600 seconds)
- Implement automatic token refresh before expiry

#### REQ-004: Webhook Signature Verification
**Priority**: P0 (Critical)
**Description**: The system SHALL verify webhook signatures
**Acceptance Criteria**:
- Verify `Viva-Signature-256` header using HMAC-SHA256
- Obtain the raw request body by calling `await req.arrayBuffer()` on the `Request` object in the Payload v3 endpoint handler.
- Implement timing-safe comparison
- Optional: Support `Viva-Signature` (SHA-1) as fallback

#### REQ-005: Webhook URL Verification
**Priority**: P0 (Critical)
**Description**: The system SHALL handle webhook URL verification
**Acceptance Criteria**:
- Respond to GET request with JSON `{"Key": "generated-verification-key"}`
- Store verification key for future reference
- Support both manual and automatic verification

### 1.3 Data Management

#### REQ-006: Payment Order Collection
**Priority**: P0 (Critical)
**Description**: The system SHALL store payment orders in a dedicated collection
**Fields**:
- `orderCode`: string (unique, indexed) - 16-digit order identifier
- `amount`: number (required) - Amount in cents
- `sourceCode`: string - 4-digit payment source
- `status`: enum ['pending', 'completed', 'failed', 'cancelled']
- `customerEmail`: string
- `customerName`: string
- `merchantReference`: string
- `checkoutUrl`: string
- `metadata`: JSON

#### REQ-007: Transaction Collection
**Priority**: P0 (Critical)
**Description**: The system SHALL store transaction details
**Fields**:
- `transactionId`: string (unique, indexed)
- `orderCode`: relationship to payment-orders
- `eventTypeId`: number (1796, 1798, etc.)
- `statusId`: string (F=Failed, A=Success, etc.)
- `amount`: number
- `vivaDeliveryId`: string (for idempotency)
- `eventData`: JSON (complete webhook payload)

#### REQ-008: Settings Collection
**Priority**: P0 (Critical)
**Description**: The system SHALL store Viva Wallet configuration
**Fields**:
- `environment`: enum ['demo', 'live']
- `clientId`: string (encrypted)
- `clientSecret`: string (encrypted)
- `merchantId`: string (encrypted)
- `apiKey`: string (encrypted)
- `sourceCode`: string
- `webhookKey`: string (auto-generated)
- `webhookUrl`: string (auto-generated)
**Acceptance Criteria**:
- Encryption for sensitive fields MUST be implemented using `beforeChange` and `afterRead` Field Hooks.

### 1.4 Admin Interface

#### REQ-009: Settings Management
**Priority**: P1 (High)
**Description**: The system SHALL provide admin UI for configuration
**Acceptance Criteria**:
- Global settings page for Viva Wallet credentials
- Environment selector (demo/live)
- Webhook URL display and verification status
- Test connection button

#### REQ-010: Order Management UI
**Priority**: P1 (High)
**Description**: The system SHALL provide order management interface
**Acceptance Criteria**:
- List view with filters (status, date, amount)
- Order details view with transaction history
- Payment status badges
- Search by orderCode, email, reference

### 1.5 Integration Features

#### REQ-011: Webhook Idempotency
**Priority**: P1 (High)
**Description**: The system SHALL handle duplicate webhook deliveries
**Acceptance Criteria**:
- Use `Viva-Delivery-Id` header for deduplication (if provided)
- Store processed delivery IDs
- Skip processing for duplicate deliveries
- Return 2xx status for duplicates

#### REQ-012: Collection Hooks
**Priority**: P2 (Medium)
**Description**: The system SHALL integrate with existing Payload collections
**Acceptance Criteria**:
- Optional field injection for Orders/Products collections
- BeforeChange hooks for payment initiation
- AfterChange hooks for status synchronization

### 1.6 Future Features (Phase 2)

#### REQ-013: Refund Processing
**Priority**: P3 (Low - Phase 2)
**Description**: The system SHALL support refund operations
**Acceptance Criteria**:
- Call `DELETE /api/transactions/{id}?amount={amount}`
- Support full and partial refunds
- Track refund status
- Require admin permissions

## 2. Non-Functional Requirements

### 2.1 Performance

#### NFR-001: Response Time
- Payment order creation: < 2 seconds
- Webhook processing: < 500ms
- Admin UI operations: < 1 second

#### NFR-002: Availability
- 99.9% uptime for webhook endpoints
- Graceful degradation if Viva API unavailable
- Retry mechanism with exponential backoff

### 2.2 Security

#### NFR-003: Data Encryption
- Encrypt sensitive credentials at rest
- Use TLS 1.2+ for all API communications
- Secure storage of webhook signatures

#### NFR-004: Access Control
- Role-based permissions for admin operations
- Audit logging for all payment operations
- PCI DSS compliance (no card data storage)

### 2.3 Compatibility

#### NFR-005: Platform Support
- Payload CMS v3.37.0+
- Node.js 18+
- TypeScript 5.7+ (strict mode)
- MongoDB, PostgreSQL, SQLite adapters

### 2.4 Reliability

#### NFR-006: Error Handling
- Comprehensive error messages
- Fallback mechanisms for API failures
- Transaction consistency guarantees

#### NFR-007: Monitoring
- Structured logging for all operations
- Webhook delivery tracking
- Performance metrics collection

## 3. Technical Constraints

### 3.1 API Limitations
- OAuth2 tokens expire after ~1 hour
- Webhook retry: 24 attempts over 24 hours
- OrderCode must be handled as string (exceeds JS MAX_SAFE_INTEGER)

### 3.2 Environment Requirements
- Separate credentials for demo/live environments
- IP whitelisting may be required for webhooks
- Currency tied to account/source (not configurable per order)

## 4. Testing Requirements

### 4.1 Unit Tests
- Service layer methods
- Webhook signature verification
- Token management logic

### 4.2 Integration Tests
- Payment order creation flow
- Webhook processing pipeline
- Database operations

### 4.3 E2E Tests
- Complete payment flow (demo environment)
- Admin UI interactions
- Error scenarios

## 5. Documentation Requirements

### 5.1 Installation Guide
- Environment setup
- Credential configuration
- Webhook URL setup in Viva dashboard

### 5.2 API Documentation
- REST endpoint specifications
- GraphQL schema documentation
- Webhook payload examples

### 5.3 User Guide
- Admin interface walkthrough
- Payment flow explanation
- Troubleshooting guide

## 6. Acceptance Criteria Summary

The plugin will be considered complete when:
1. Payment orders can be created and tracked
2. Webhooks are verified and processed securely
3. OAuth2 authentication works with automatic refresh
4. Admin UI provides configuration and monitoring
5. All data is stored securely with proper encryption
6. Test coverage exceeds 80%
7. Documentation is complete and accurate

## Appendix A: Viva Wallet API Endpoints

- **OAuth2 Token**: `POST https://{demo-}accounts.vivapayments.com/connect/token`
- **Create Order**: `POST https://{demo-}api.vivapayments.com/checkout/v2/orders`
- **Checkout URL**: `https://{demo.|www.}vivapayments.com/web/checkout?ref={OrderCode}`
- **Refund** (Phase 2): `DELETE https://{demo.}vivapayments.com/api/transactions/{id}`

## Appendix B: Webhook Event Types

| EventTypeId | Name | Description |
|-------------|------|-------------|
| 1796 | Transaction Payment Created | Payment successful |
| 1798 | Transaction Failed | Payment failed |
| 1799 | Transaction Payment Created Offline | Offline payment (optional) |