# Requirements Document - Payment Provider Integration

## Introduction

The Payment Provider Integration feature enables real payment processing through iyzico and PayTR payment gateways with 3D Secure 2.2 compliance, webhook/callback handling, idempotency guarantees, and reconciliation capabilities. This closes the payment loop in the VORTE e-commerce platform, transitioning from mock payments to production-ready payment processing with proper notification and settlement flows.

## Glossary

- **Payment System**: The backend service responsible for orchestrating payment flows with external providers
- **iyzico**: Turkish payment gateway supporting 3DS2 with IYZWSv2 authentication
- **PayTR**: Turkish payment gateway with Direct API and hash-based callback verification
- **3DS (3D Secure)**: EMV 3-D Secure v2.2 authentication protocol for card payments
- **Webhook**: Server-to-server HTTP callback from payment provider (iyzico)
- **Callback**: Server-to-server HTTP POST from payment provider (PayTR) requiring hash validation and "OK" response
- **Idempotency Manager**: Component ensuring duplicate payment requests produce identical results
- **Payment Event Store**: Collection storing webhook/callback events with deduplication
- **Reconciliation Worker**: Background job matching payment statuses with provider records
- **Minor Units**: Currency amount representation (e.g., 1000 = 10.00 TRY)

## Requirements

### Requirement 1: iyzico Payment Initialization

**User Story:** As a customer, I want to initiate payment with iyzico, so that I can complete 3D Secure authentication and authorize the transaction.

#### Acceptance Criteria

1. WHEN a customer sends a POST request to `/api/v1/payments/iyzico/initialize` without an Idempotency-Key header, THE Payment System SHALL return HTTP 428 Precondition Required with RFC 9457 problem+json response.

2. WHEN a customer sends a POST request with valid Idempotency-Key, orderId, amount, currency, customer details, and card or token, THE Payment System SHALL create a payment record with status INITIATED, call iyzico 3DS Initialize API with IYZWSv2 signature, store iyzico paymentId in providerRefs, and return HTTP 200 with threeDSHtmlContent (Base64-encoded HTML for 3DS flow) and local paymentId.

3. THE Payment System SHALL transition payment status from INITIATED to PENDING_3DS after receiving threeDSHtmlContent from iyzico.

4. **Note**: iyzico returns threeDSHtmlContent as Base64-encoded string; frontend MUST decode before rendering in iframe or redirect.

4. THE Payment System SHALL store 3DS version, status, ECI, and CAVV in the threeDS field when available.

5. WHEN the same Idempotency-Key is used within 24 hours, THE Payment System SHALL return the cached response without calling iyzico API again.

### Requirement 2: iyzico Webhook Handling

**User Story:** As the Payment System, I want to receive and process iyzico webhooks, so that I can update payment status based on provider notifications.

#### Acceptance Criteria

1. WHEN iyzico sends a webhook to `/api/v1/webhooks/iyzico`, THE Payment System SHALL validate the request using iyzico webhook verification rules and HTTPS requirement.

2. WHEN a webhook event is received, THE Payment System SHALL extract externalEventId and check payment_events collection for duplicate using unique index on (externalEventId, provider).

3. IF the event is a duplicate, THEN THE Payment System SHALL return HTTP 200 without processing.

4. WHEN a webhook indicates successful authorization (fund/auth event), THE Payment System SHALL transition payment status to AUTHORIZED and order status to PAID within same MongoDB transaction.

5. WHEN a webhook indicates 3DS completion, THE Payment System SHALL update threeDS fields and transition status accordingly.

6. WHEN a webhook indicates failure, THE Payment System SHALL transition payment status to FAILED and log failure reason.

7. THE Payment System SHALL mask PII in raw provider response before storing in payments.raw field.

### Requirement 3: PayTR Payment Initialization

**User Story:** As a customer, I want to initiate payment with PayTR, so that I can complete 3D Secure authentication via PayTR's hosted page.

#### Acceptance Criteria

1. WHEN a customer sends a POST request to `/api/v1/payments/paytr/initialize` without an Idempotency-Key header, THE Payment System SHALL return HTTP 428 Precondition Required.

2. WHEN a customer sends a POST request with valid Idempotency-Key, orderId, amount, currency, and customer details, THE Payment System SHALL create a payment record with status INITIATED, generate PayTR form parameters including merchant_oid, calculate paytr_token hash, and return HTTP 200 with form POST parameters and paymentId.

3. THE Payment System SHALL store merchant_oid in providerRefs.paytr_merchant_oid field.

4. THE Payment System SHALL calculate paytr_token using HMAC-SHA256 with merchant_id, user_ip, merchant_oid, email, payment_amount, user_basket, no_installment, max_installment, currency, test_mode, and merchant_salt.

5. WHEN the same Idempotency-Key is used within 24 hours, THE Payment System SHALL return the cached response without generating new merchant_oid.

### Requirement 4: PayTR Callback Handling

**User Story:** As the Payment System, I want to receive and process PayTR callbacks, so that I can finalize payment status and respond with "OK" to prevent "Devam Ediyor" status.

#### Acceptance Criteria

1. WHEN PayTR sends a callback to `/api/v1/callbacks/paytr`, THE Payment System SHALL validate the hash using merchant_oid, status, total_amount, and merchant_salt.

2. IF the hash validation fails, THEN THE Payment System SHALL log error with code PAYTR_HASH_MISMATCH, return HTTP 400, and trigger alert.

3. WHEN hash validation succeeds and status is "success", THE Payment System SHALL transition payment status to AUTHORIZED, transition order status to PAID within MongoDB transaction, store event in payment_events with deduplication, and return HTTP 200 with body **exactly "OK" (plain text, not JSON)**.

4. WHEN hash validation succeeds and status is "failed", THE Payment System SHALL transition payment status to FAILED, log failure reason, and return HTTP 200 with body **exactly "OK" (plain text, not JSON)**.

5. **CRITICAL**: IF THE Payment System does not return exactly "OK" in response body (e.g., returns JSON, HTML, or empty response), THEN PayTR SHALL keep transaction in "Devam Ediyor" (In Progress) status and will retry callback indefinitely per PayTR protocol.

6. THE Payment System SHALL use unique index on (externalEventId, provider) in payment_events to ensure idempotent callback processing.

### Requirement 5: Payment Status Query

**User Story:** As a customer or admin, I want to query payment status for an order, so that I can verify transaction state.

#### Acceptance Criteria

1. WHEN an authenticated user sends a GET request to `/api/v1/orders/{orderId}/payment`, THE Payment System SHALL return HTTP 200 with payment status, amount, provider, threeDS details, and timestamps.

2. IF the user is not the order owner and not an admin, THEN THE Payment System SHALL return HTTP 403 Forbidden.

3. THE Payment System SHALL mask sensitive fields (card number, CVV) in the response.

### Requirement 6: Payment Refund (Phase 2)

**User Story:** As an admin, I want to initiate full or partial refunds, so that I can process returns and cancellations.

#### Acceptance Criteria

1. WHEN an admin sends a POST request to `/api/v1/payments/{id}/refund` without an Idempotency-Key header, THE Payment System SHALL return HTTP 428 Precondition Required.

2. WHEN an admin sends a POST request with valid Idempotency-Key and refund amount, THE Payment System SHALL validate payment is in AUTHORIZED or CAPTURED status, call provider refund API, create refund record, and return HTTP 200 with refund details.

3. IF the payment is not refundable, THEN THE Payment System SHALL return HTTP 422 with error code PAYMENT_NOT_REFUNDABLE.

4. THE Payment System SHALL support partial refunds up to original payment amount.

### Requirement 7: Reconciliation Worker

**User Story:** As a system operator, I want automatic reconciliation of pending payments, so that stuck transactions are recovered.

#### Acceptance Criteria

1. THE Payment System SHALL run a background worker every 10 minutes to query payments with status PENDING_3DS or INITIATED older than 15 minutes.

2. WHEN a pending payment is found, THE Payment System SHALL call provider status query API to fetch current state.

3. WHEN provider returns final status (success/failure), THE Payment System SHALL update payment and order status accordingly.

4. THE Payment System SHALL emit metric reconciliation_recovered_total with labels: provider, status.

5. THE Payment System SHALL alert if a payment remains in PENDING_3DS for more than 60 minutes.

### Requirement 8: Idempotency and Concurrency Control

**User Story:** As a system administrator, I want idempotency guarantees on payment operations, so that duplicate requests do not cause double charges.

#### Acceptance Criteria

1. THE Payment System SHALL require Idempotency-Key header on all payment initialization endpoints and return HTTP 428 if missing.

2. WHEN a duplicate Idempotency-Key is received within 24 hours, THE Payment System SHALL return the cached response with original HTTP status code, response body, and critical headers (e.g., ETag, Content-Type) without calling provider API.

3. THE Payment System SHALL cache the complete response including status code, headers, and body for idempotency replay.

4. THE Payment System SHALL use MongoDB transaction to atomically create payment record, update order status, and store idempotency cache.

4. THE Payment System SHALL use unique index on (externalEventId, provider) in payment_events to prevent duplicate webhook/callback processing.

### Requirement 9: Security and Compliance

**User Story:** As a security officer, I want secure payment processing with PII protection, so that customer data is safeguarded.

#### Acceptance Criteria

1. THE Payment System SHALL use IYZWSv2 signature authentication for all iyzico API requests with Authorization header.

2. THE Payment System SHALL validate PayTR callback hash using HMAC-SHA256 before processing.

3. THE Payment System SHALL enforce HTTPS on all webhook and callback endpoints.

4. THE Payment System SHALL implement IP allowlist for webhook/callback endpoints using current IP ranges published in provider admin panels (Settings → Merchant Settings → Merchant Notifications for iyzico); SHALL NOT hard-code static CIDR ranges as providers may update them per merchant account.

5. THE Payment System SHALL ensure NTP time synchronization (≤±2 seconds drift) on all servers for accurate signature and HMAC validation with time-sensitive tokens.

5. THE Payment System SHALL mask card numbers (show only first 6 and last 4 digits), CVV, and full card data in logs and stored responses.

6. THE Payment System SHALL never store plain-text card data and SHALL use provider tokenization for saved cards.

7. THE Payment System SHALL retain payment records for 10 years per Turkish tax law.

### Requirement 10: Observability and Monitoring

**User Story:** As a system operator, I want metrics and alerts for payment operations, so that I can monitor health and respond to issues.

#### Acceptance Criteria

1. THE Payment System SHALL emit Prometheus metrics: payment_initiated_total{provider, result}, payment_authorized_total{provider}, payment_failed_total{provider, reason}.

2. THE Payment System SHALL emit metrics: webhook_received_total{provider, event_type}, webhook_duplicate_total{provider}, callback_hash_failed_total{provider}.

3. THE Payment System SHALL emit metrics: reconciliation_recovered_total{provider, status}, reconciliation_stuck_total{provider}.

4. THE Payment System SHALL alert when payment_failed_total exceeds 5% of payment_initiated_total over 15-minute window.

5. THE Payment System SHALL alert when webhook_received_total is zero for more than 30 minutes during business hours.

6. THE Payment System SHALL alert when callback_hash_failed_total exceeds 3 failures in 5 minutes.

7. THE Payment System SHALL include traceId in all logs and RFC 9457 error responses for distributed tracing.

### Requirement 11: Frontend 3DS Flow

**User Story:** As a customer, I want seamless 3D Secure authentication, so that I can complete payment securely.

#### Acceptance Criteria

1. WHEN iyzico returns threeDSHtmlContent (Base64-encoded), THE Frontend SHALL decode and render the content in an iframe or redirect to complete 3DS authentication per EMVCo 3DS UX guidelines.

2. WHEN PayTR initialization succeeds, THE Frontend SHALL submit form POST with PayTR parameters to redirect customer to PayTR hosted page.

3. WHEN 3DS authentication completes, THE Frontend SHALL poll `/api/v1/orders/{orderId}/payment` endpoint every 2 seconds for up to 60 seconds to fetch final status.

4. IF payment status is FAILED, THEN THE Frontend SHALL display error message with failure reason and offer quick retry with same card or option to use different card/payment method per EMVCo 3DS UX best practices.

5. IF payment status is AUTHORIZED, THEN THE Frontend SHALL redirect to order confirmation page.

6. THE Frontend SHALL display loading state during 3DS authentication and status polling.

7. THE Frontend SHALL implement anti-double-submit protection: disable submit button after first click and generate unique Idempotency-Key for each payment attempt.

### Requirement 12: Retry and Error Handling

**User Story:** As a system administrator, I want automatic retry logic for transient failures, so that temporary issues do not cause payment failures.

#### Acceptance Criteria

1. WHEN a provider API call returns HTTP 429 or 5xx, THE Payment System SHALL retry with exponential backoff (1s, 2s, 4s) up to 3 attempts.

2. WHEN a provider API call times out after 30 seconds, THE Payment System SHALL log timeout with code PAYMENT_PROVIDER_TIMEOUT and return HTTP 504 to client.

3. WHEN a webhook/callback processing fails due to database error, THE Payment System SHALL return HTTP 500 to trigger provider retry.

4. THE Payment System SHALL implement circuit breaker pattern: after 10 consecutive provider failures, open circuit for 60 seconds and return HTTP 503.

5. THE Payment System SHALL emit metric provider_circuit_open_total{provider} when circuit opens.

### Requirement 13: Test Mode Support

**User Story:** As a developer, I want to test payment flows in sandbox, so that I can validate integration without real transactions.

#### Acceptance Criteria

1. WHERE environment is development or staging, THE Payment System SHALL use iyzico sandbox base URL and test API keys.

2. WHERE environment is development or staging, THE Payment System SHALL set PayTR test_mode parameter to "1".

3. THE Payment System SHALL log warning when test mode is enabled in production environment.

4. THE Payment System SHALL support test card numbers per provider documentation for 3DS success, failure, and challenge scenarios.

### Requirement 14: Notification Integration (Concurrent)

**User Story:** As a customer, I want to receive email and SMS notifications for payment events, so that I am informed of transaction status.

#### Acceptance Criteria

1. WHEN payment status transitions to AUTHORIZED, THE Payment System SHALL enqueue email notification job with order confirmation details.

2. WHEN payment status transitions to FAILED, THE Payment System SHALL enqueue email notification job with failure reason and retry link.

3. THE Payment System SHALL use SendGrid v3 Mail Send API with EU region support (api.eu.sendgrid.com) or AWS SES for email delivery.

4. WHERE SendGrid is used, THE Payment System SHALL configure EU subuser and base URL for GDPR compliance.

5. THE Payment System SHALL use Netgsm REST API for SMS delivery with rate limiting and queue (BullMQ).

5. WHEN email or SMS delivery fails, THE Payment System SHALL retry up to 3 times with exponential backoff and emit alert after final failure.

6. THE Payment System SHALL store notification API keys in environment variables or secret store.

### Requirement 15: Shipping Integration Preparation (Phase 2)

**User Story:** As an admin, I want to integrate with shipping providers, so that I can generate labels and track shipments.

#### Acceptance Criteria

1. THE Payment System SHALL expose order status webhook endpoint for shipping provider integration.

2. WHEN order status transitions to PAID, THE Payment System SHALL trigger shipping label generation workflow.

3. THE Payment System SHALL support Yurtiçi Kargo, Aras Kargo, and MNG Kargo APIs with provider-specific authentication.

4. THE Payment System SHALL store tracking numbers in order.shipping.tracking_number field.

5. THE Payment System SHALL emit metric shipping_label_generated_total{provider, result}.

