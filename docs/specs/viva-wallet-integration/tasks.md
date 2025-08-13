# Implementation Tasks - Viva Wallet Smart Checkout Plugin

## Task Overview

This document outlines the implementation tasks for the Viva Wallet Smart Checkout Payload CMS plugin. Tasks are organized by category with complexity indicators and dependencies.

**Legend**: S=Small (1-4 hours), M=Medium (4-8 hours), L=Large (1-2 days)

---

## 1. Infrastructure & Plugin Foundation

### 1.1 Core Plugin Structure
- [ ] **VW-001**: Create main plugin export function in `src/index.ts`
  - Implement `vivaWalletPlugin(options?: VivaWalletPluginConfig): Plugin`
  - Return function that extends Payload config
  - **Dependencies**: None
  - **Complexity**: S
  - **Testing**: Unit test plugin config extension
  - **References**: REQ-001, Design Section 5.1

### 1.2 TypeScript Type Definitions
- [ ] **VW-002**: Define core interfaces in `src/types/index.ts`
  - `VivaWalletPluginConfig` interface
  - `VivaWalletConfig` for service configuration
  - **Dependencies**: VW-001
  - **Complexity**: S
  - **Testing**: TypeScript compilation validation
  - **References**: Design Section 5.2

- [ ] **VW-003**: Define API types in `src/types/api.ts`
  - `CreateOrderRequest` and `CreateOrderResponse` interfaces
  - OAuth2 token response types
  - **Dependencies**: VW-002
  - **Complexity**: S
  - **Testing**: TypeScript compilation validation
  - **References**: REQ-003, Design Section 3.1

- [ ] **VW-004**: Define webhook types in `src/types/webhook.ts`
  - `WebhookEvent` interface with EventTypeId mapping
  - Transaction status types (F=Failed, A=Success)
  - **Dependencies**: VW-002
  - **Complexity**: S
  - **Testing**: TypeScript compilation validation
  - **References**: REQ-002, REQ-007

---

## 2. Data Collections

### 2.1 Payment Orders Collection
- [ ] **VW-005**: Implement PaymentOrders collection in `src/collections/PaymentOrders.ts`
  - Define collection schema with all required fields
  - Implement unique index on `orderCode` field (string)
  - Add status enum validation
  - **Dependencies**: VW-002
  - **Complexity**: M
  - **Testing**: Collection schema validation, unique constraint testing
  - **References**: REQ-006, Design Section 2.1

### 2.2 Transactions Collection
- [ ] **VW-006**: Implement Transactions collection in `src/collections/Transactions.ts`
  - Define collection schema for transaction storage
  - Implement unique index on `transactionId`
  - Add relationship field to PaymentOrders
  - **Dependencies**: VW-005
  - **Complexity**: M
  - **Testing**: Collection schema validation, relationship testing
  - **References**: REQ-007, Design Section 2.2

### 2.3 Settings Global
- [ ] **VW-007**: Implement Settings global in `src/collections/Settings.ts`
  - Define global schema for Viva Wallet configuration
  - Implement field encryption using beforeChange/afterRead hooks
  - Add environment validation (demo/live)
  - **Dependencies**: VW-011 (encryption utilities)
  - **Complexity**: L
  - **Testing**: Encryption/decryption functionality, field validation
  - **References**: REQ-008, Design Section 2.3, Security Section 6.1

---

## 3. Security & Encryption

### 3.1 Field Encryption System
- [ ] **VW-008**: Create encryption utilities in `src/utils/encryption.ts`
  - Implement `encryptField` beforeChange hook
  - Implement `decryptField` afterRead hook
  - Use strong encryption (AES-256-GCM recommended)
  - **Dependencies**: None
  - **Complexity**: M
  - **Testing**: Encryption/decryption round-trip tests, key management
  - **References**: REQ-008, NFR-003, Design Section 6.1

### 3.2 Webhook Signature Validation
- [ ] **VW-009**: Implement WebhookValidator in `src/services/WebhookValidator.ts`
  - Support HMAC-SHA256 signature verification (priority)
  - Support HMAC-SHA1 as fallback
  - Implement timing-safe comparison
  - Handle development mode without signature
  - **Dependencies**: VW-002
  - **Complexity**: M
  - **Testing**: Signature validation with known test vectors, timing attack resistance
  - **References**: REQ-004, Design Section 3.3

---

## 4. Service Layer

### 4.1 Token Management
- [ ] **VW-010**: Implement TokenManager in `src/services/TokenManager.ts`
  - OAuth2 client credentials flow
  - Token caching with ~1 hour expiry
  - Automatic refresh with 5-minute buffer
  - Environment-specific auth URLs
  - **Dependencies**: VW-002, VW-003
  - **Complexity**: M
  - **Testing**: Token lifecycle management, error handling, cache behavior
  - **References**: REQ-003, Design Section 3.2

### 4.2 Main Viva Wallet Service
- [ ] **VW-011**: Implement VivaWalletService in `src/services/VivaWalletService.ts`
  - Create payment order method
  - Environment-specific API URLs
  - Integration with TokenManager
  - OrderCode handling as string (16-digit)
  - **Dependencies**: VW-010, VW-003
  - **Complexity**: L
  - **Testing**: API integration tests with demo environment, error handling
  - **References**: REQ-001, Design Section 3.1

---

## 5. API Endpoints

### 5.1 Payment Order Creation
- [ ] **VW-012**: Implement create order endpoint in `src/endpoints/create-order.ts`
  - Handle POST requests with order data
  - Validate request parameters
  - Integrate with VivaWalletService
  - Store order in database
  - Return orderCode and checkoutUrl
  - **Dependencies**: VW-011, VW-005
  - **Complexity**: L
  - **Testing**: End-to-end order creation flow, error scenarios
  - **References**: REQ-001, Design Section 4.1

### 5.2 Webhook Handler
- [ ] **VW-013**: Implement webhook handler in `src/endpoints/webhook.ts`
  - Handle POST requests from Viva Wallet
  - Access raw body via `req.arrayBuffer()` for Payload v3
  - Validate webhook signatures
  - Process payment events (EventTypeId 1796, 1798)
  - Update order status based on transaction events
  - **Dependencies**: VW-009, VW-006, VW-005
  - **Complexity**: L
  - **Testing**: Webhook processing with various event types, signature validation
  - **References**: REQ-002, REQ-004, Design Section 4.2

### 5.3 Webhook Verification
- [ ] **VW-014**: Implement webhook verification endpoint in `src/endpoints/verify.ts`
  - Handle GET requests for webhook URL verification
  - Generate and store verification key
  - Return JSON response with verification key
  - **Dependencies**: VW-007
  - **Complexity**: M
  - **Testing**: Verification key generation and retrieval
  - **References**: REQ-005, Design Section 4.3

---

## 6. Plugin Integration

### 6.1 Collection Registration
- [ ] **VW-015**: Register collections in main plugin function
  - Add PaymentOrders and Transactions to config.collections
  - Preserve existing collections using spread syntax
  - **Dependencies**: VW-005, VW-006
  - **Complexity**: S
  - **Testing**: Plugin configuration extension validation
  - **References**: Design Section 5.1

### 6.2 Global Registration
- [ ] **VW-016**: Register Settings global in main plugin function
  - Add Settings global to config.globals
  - Preserve existing globals using spread syntax
  - **Dependencies**: VW-007
  - **Complexity**: S
  - **Testing**: Plugin configuration extension validation
  - **References**: Design Section 5.1

### 6.3 Endpoint Registration
- [ ] **VW-017**: Register API endpoints in main plugin function
  - Add create-order, webhook, and verify endpoints
  - Configure proper HTTP methods and paths
  - **Dependencies**: VW-012, VW-013, VW-014
  - **Complexity**: M
  - **Testing**: Endpoint registration and routing validation
  - **References**: Design Section 5.1

---

## 7. Admin UI Components

### 7.1 Settings Management Interface
- [ ] **VW-018**: Create SettingsView component in `src/components/SettingsView.tsx`
  - Environment selector (demo/live)
  - Credential input fields
  - Connection test button
  - Webhook URL display
  - **Dependencies**: VW-007
  - **Complexity**: L
  - **Testing**: Component rendering, form submission, validation
  - **References**: REQ-009

### 7.2 Order Status Display
- [ ] **VW-019**: Create OrderStatus component in `src/components/OrderStatus.tsx`
  - Status badge rendering
  - Transaction history display
  - Payment flow visualization
  - **Dependencies**: VW-005, VW-006
  - **Complexity**: M
  - **Testing**: Component rendering with different order states
  - **References**: REQ-010

---

## 8. Export System

### 8.1 Server-Side Exports
- [ ] **VW-020**: Configure server exports in `src/exports/index.ts`
  - Export main plugin function
  - Export service classes for custom implementations
  - Export TypeScript interfaces
  - **Dependencies**: All service components
  - **Complexity**: S
  - **Testing**: Import validation in test environment
  - **References**: Plugin architecture requirements

### 8.2 Client-Side Exports
- [ ] **VW-021**: Configure client exports in `src/exports/client.ts`
  - Export React components for admin UI
  - Configure proper import map references
  - **Dependencies**: VW-018, VW-019
  - **Complexity**: S
  - **Testing**: Component import validation
  - **References**: Plugin architecture requirements

---

## 9. Error Handling & Resilience

### 9.1 Retry Mechanism
- [ ] **VW-022**: Implement RetryableService utility in `src/services/RetryableService.ts`
  - Exponential backoff strategy
  - Configurable retry attempts
  - Skip retry for client errors (4xx)
  - **Dependencies**: None
  - **Complexity**: M
  - **Testing**: Retry behavior with various error scenarios
  - **References**: NFR-002, Design Section 7.1

### 9.2 Webhook Idempotency
- [ ] **VW-023**: Add idempotency handling to webhook processor
  - Use Viva-Delivery-Id header for deduplication
  - Store processed delivery IDs
  - Return success for duplicate deliveries
  - **Dependencies**: VW-013
  - **Complexity**: M
  - **Testing**: Duplicate webhook delivery handling
  - **References**: REQ-011

---

## 10. Testing Implementation

### 10.1 Unit Tests
- [ ] **VW-024**: Write service layer unit tests
  - TokenManager token lifecycle tests
  - VivaWalletService API integration tests
  - WebhookValidator signature verification tests
  - **Dependencies**: All service components
  - **Complexity**: L
  - **Testing**: 80%+ test coverage for service layer
  - **References**: NFR requirements, Section 4.1

### 10.2 Integration Tests
- [ ] **VW-025**: Write collection and endpoint integration tests
  - Payment order creation flow
  - Webhook processing pipeline
  - Database operations with encryption
  - **Dependencies**: All main components
  - **Complexity**: L
  - **Testing**: End-to-end workflow validation
  - **References**: NFR requirements, Section 4.2

### 10.3 E2E Tests
- [ ] **VW-026**: Write E2E tests for demo environment
  - Complete payment flow with Viva Wallet demo API
  - Admin UI interactions
  - Error scenario testing
  - **Dependencies**: Complete plugin implementation
  - **Complexity**: L
  - **Testing**: Real-world usage scenarios
  - **References**: NFR requirements, Section 4.3

---

## 11. Documentation & Deployment

### 11.1 API Documentation
- [ ] **VW-027**: Create API documentation
  - REST endpoint specifications
  - Webhook payload examples
  - Integration guide with code examples
  - **Dependencies**: Complete implementation
  - **Complexity**: M
  - **Testing**: Documentation accuracy validation
  - **References**: Section 5.2

### 11.2 Configuration Guide
- [ ] **VW-028**: Create setup and configuration guide
  - Installation instructions
  - Environment setup
  - Viva Wallet dashboard configuration
  - Troubleshooting guide
  - **Dependencies**: Complete implementation
  - **Complexity**: M
  - **Testing**: Guide validation with fresh installation
  - **References**: Section 5.1, 5.3

---

## Task Dependencies Summary

**Critical Path**: VW-001 → VW-002 → VW-008 → VW-007 → VW-010 → VW-011 → VW-012 → VW-013 → VW-017

**Parallel Development Tracks**:
- Types & Collections: VW-002 → VW-005, VW-006
- Security: VW-008 → VW-009
- Services: VW-010 → VW-011
- UI Components: VW-018, VW-019 (can develop in parallel)
- Testing: VW-024, VW-025, VW-026 (develop after core components)

**Estimated Total Effort**: 25-30 development days

**MVP Completion Criteria**:
1. All P0 requirements implemented (VW-001 through VW-017)
2. Core security features operational (VW-008, VW-009)
3. Basic admin UI functional (VW-018)
4. Unit and integration tests passing (VW-024, VW-025)
5. Demo environment validation successful

**Phase 2 Features** (excluded from MVP):
- Refund processing functionality
- Advanced reporting and analytics
- Multiple payment sources support
- Recurring payments