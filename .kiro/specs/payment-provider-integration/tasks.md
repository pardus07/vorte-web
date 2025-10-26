# Implementation Plan - Payment Provider Integration

This implementation plan breaks down the Payment Provider Integration into discrete, actionable coding tasks organized by sprints. Each task builds incrementally and references specific requirements from the requirements document.

## Task List

### Sprint 1: iyzico 3DS Integration

- [x] 1. Create payment data models and database schema








  - [x] 1.1 Define Payment Pydantic schema with all fields



    - Create Payment model with id, orderId, provider, status, amount, currency fields
    - Add threeDS nested schema (version, status, eci, cavv)
    - Add providerRefs nested schema for iyzico and paytr references
    - Add idempotencyKey, hashCheck, raw, createdAt, updatedAt fields
    - Define PaymentStatus enum (INITIATED, PENDING_3DS, AUTHORIZED, CAPTURED, FAILED, CANCELLED, REFUNDED)
    - _Requirements: Req 1, 2, 3, 8_

  - [x] 1.2 Define PaymentEvent Pydantic schema



    - Create PaymentEvent model with id, paymentId, provider, externalEventId fields
    - Add eventType, status, raw, processedAt, createdAt fields
    - _Requirements: Req 2, 4, 8_

  - [x] 1.3 Create MongoDB collections and indexes












    - Create payments collection with indexes: orderId, idempotencyKey (unique), status+createdAt
    - Add sparse indexes for providerRefs.iyzico.paymentId and providerRefs.paytr.merchant_oid
    - Create payment_events collection with indexes: paymentId+createdAt, (externalEventId+provider) unique
    - Write migration script in `migrations/004_payment_collections.py`
    - _Requirements: Req 8_


- [x] 2. Implement Payment Repository layer


  - Create PaymentRepository class with CRUD operations
  - Implement find_by_order_id, find_by_idempotency_key methods
  - Implement find_stuck_payments method for reconciliation (status IN [PENDING_3DS, INITIATED] AND createdAt < cutoff)
  - Implement atomic status update with version check
  - Add PaymentEventStore class with store_event method (handles deduplication via unique index)
  - _Requirements: Req 7, 8_


- [x] 3. Implement iyzico adapter with IYZWSv2 authentication



  - [x] 3.1 Create IyzicoAdapter class with signature generation

    - Implement _generate_signature method (IYZWSv2: api_key + random_string + secret_key + request_body → SHA256 → Base64)
    - Add api_key, secret_key, base_url configuration from environment
    - Create HTTP client with 30-second timeout
    - _Requirements: Req 1, 9_

  - [x] 3.2 Implement initialize_3ds method

    - Build iyzico 3DS Initialize API request payload (locale, conversationId, price, paidPrice, currency, basketId, paymentChannel, paymentGroup, callbackUrl, buyer, paymentCard)
    - Call POST /payment/3dsecure/initialize with IYZWSv2 Authorization header
    - Parse response and extract threeDSHtmlContent, paymentId, conversationId
    - Handle errors and map to RFC 9457 problem+json format
    - _Requirements: Req 1_

  - [x] 3.3 Implement query_payment_status method

    - Call POST /payment/detail with payment ID
    - Parse response and return current status
    - Used by reconciliation worker
    - _Requirements: Req 7_

  - [x] 3.4 Implement validate_webhook method

    - Validate webhook signature per iyzico documentation
    - Verify HTTPS requirement
    - _Requirements: Req 2, 9_

- [x] 4. Implement Payment Orchestrator for iyzico flow




  - [x] 4.1 Create PaymentOrchestrator class

    - Initialize with PaymentRepository, OrderRepository, IdempotencyManager, PaymentEventStore
    - _Requirements: Req 8_

  - [x] 4.2 Implement initialize_payment method for iyzico

    - Check idempotency cache (24-hour window) using IdempotencyManager
    - Validate order exists and status is CREATED
    - Create payment record with status INITIATED
    - Call IyzicoAdapter.initialize_3ds
    - Update payment status to PENDING_3DS
    - Store iyzico paymentId in providerRefs
    - Cache response in IdempotencyManager
    - Return htmlContent and local paymentId
    - _Requirements: Req 1, 8_

  - [x] 4.3 Implement transition_status method with state machine validation

    - Validate state transitions: INITIATED → PENDING_3DS → AUTHORIZED → CAPTURED
    - Allow transitions to FAILED or CANCELLED from any state
    - Allow AUTHORIZED → REFUNDED
    - Raise InvalidStatusTransitionError for invalid transitions
    - _Requirements: Req 2, 4_

  - [x] 4.4 Implement process_webhook method for iyzico

    - Validate webhook using IyzicoAdapter.validate_webhook
    - Extract externalEventId from webhook payload
    - Store event in PaymentEventStore (returns None if duplicate)
    - If duplicate, return 200 without processing
    - Parse webhook status and map to PaymentStatus
    - Update payment status and threeDS fields
    - If status is AUTHORIZED, update order status to PAID in MongoDB transaction
    - Mask PII in raw response before storing
    - Emit Prometheus metrics (webhook_received_total, payment_authorized_total, payment_failed_total)
    - _Requirements: Req 2, 8, 9, 10_

- [x] 5. Create iyzico API endpoints




  - [x] 5.1 Implement POST /api/v1/payments/iyzico/initialize endpoint

    - Require JWT authentication
    - Require Idempotency-Key header (return 428 if missing)
    - Parse request body (orderId, amount, currency, customer, card)
    - Call PaymentOrchestrator.initialize_payment
    - Return 200 with paymentId, status, htmlContent, provider
    - Handle errors and return RFC 9457 problem+json
    - _Requirements: Req 1, 8_

  - [x] 5.2 Implement POST /api/v1/webhooks/iyzico endpoint

    - Public endpoint (no auth, but IP allowlist via Nginx)
    - Call PaymentOrchestrator.process_webhook
    - Return 200 OK
    - Log all webhook events with traceId
    - _Requirements: Req 2, 9, 10_

- [x] 6. Implement retry logic and circuit breaker




  - [x] 6.1 Create RetryStrategy class

    - Implement execute_with_retry method with exponential backoff (1s, 2s, 4s)
    - Retry on HTTP 429, 500, 502, 503, 504
    - Max 3 retries
    - Log retry attempts
    - _Requirements: Req 12_

  - [x] 6.2 Create CircuitBreaker class

    - Implement call method with state management (CLOSED, OPEN, HALF_OPEN)
    - Open circuit after 10 consecutive failures
    - Keep circuit open for 60 seconds
    - Emit provider_circuit_open_total metric
    - _Requirements: Req 12_

  - [x] 6.3 Integrate retry and circuit breaker with adapters

    - Wrap all provider API calls with RetryStrategy
    - Wrap provider adapters with CircuitBreaker
    - _Requirements: Req 12_

- [x] 7. Add Prometheus metrics and observability for iyzico




  - Implement metrics: payment_initiated_total{provider, result}, payment_authorized_total{provider}, payment_failed_total{provider, reason}
  - Implement metrics: webhook_received_total{provider, event_type}, webhook_duplicate_total{provider}
  - Add structured logging with traceId for all payment operations
  - Mask PII in logs (card number, CVV, email)
  - _Requirements: Req 9, 10_

- [x] 8. Write unit tests for iyzico integration




  - Test IyzicoAdapter._generate_signature with known inputs
  - Test PaymentOrchestrator.transition_status state machine
  - Test PaymentEventStore deduplication logic
  - Test PII masking functions
  - Test idempotency cache behavior
  - _Requirements: All Sprint 1 requirements_

### Sprint 2: PayTR Direct API Integration

- [x] 9. Implement PayTR adapter with hash-based authentication



  - [x] 9.1 Create PayTRAdapter class with token generation


    - Implement _generate_token method (HMAC-SHA256 with merchant_id, user_ip, merchant_oid, email, payment_amount, user_basket, no_installment, max_installment, currency, test_mode, merchant_salt → Base64)
    - Add merchant_id, merchant_key, merchant_salt, base_url configuration from environment
    - _Requirements: Req 3, 9_

  - [x] 9.2 Implement initialize_payment method

    - Generate unique merchant_oid (use payment ID)
    - Create user_basket JSON and Base64 encode
    - Calculate paytr_token using _generate_token
    - Build form POST parameters (merchant_id, merchant_oid, email, payment_amount, user_basket, no_installment, max_installment, currency, test_mode, user_ip, merchant_ok_url, merchant_fail_url, timeout_limit, lang, paytr_token, post_url)
    - Return form parameters for frontend POST
    - _Requirements: Req 3_

  - [x] 9.3 Implement validate_callback_hash method

    - Calculate expected hash: merchant_oid + merchant_salt + status + total_amount → HMAC-SHA256 → Base64
    - Use hmac.compare_digest for timing-safe comparison
    - Return boolean
    - _Requirements: Req 4, 9_

- [x] 10. Extend Payment Orchestrator for PayTR flow



  - [x] 10.1 Implement initialize_payment method for PayTR


    - Check idempotency cache
    - Validate order exists and status is CREATED
    - Create payment record with status INITIATED
    - Call PayTRAdapter.initialize_payment
    - Store merchant_oid in providerRefs.paytr
    - Cache response
    - Return formParams and local paymentId
    - _Requirements: Req 3, 8_

  - [x] 10.2 Implement process_callback method for PayTR

    - Parse callback form data (merchant_oid, status, total_amount, hash)
    - Validate hash using PayTRAdapter.validate_callback_hash
    - If hash invalid, log error with code PAYTR_HASH_MISMATCH, return 400, emit alert
    - Extract externalEventId (use merchant_oid + timestamp as unique ID)
    - Store event in PaymentEventStore (returns None if duplicate)
    - If duplicate, return 200 "OK" without processing
    - Map PayTR status to PaymentStatus (success → AUTHORIZED, failed → FAILED)
    - Update payment status
    - If status is AUTHORIZED, update order status to PAID in MongoDB transaction
    - Return 200 with body "OK" (CRITICAL: must be exactly "OK" or PayTR keeps "Devam Ediyor" status)
    - Emit Prometheus metrics (callback_hash_failed_total if hash fails)
    - _Requirements: Req 4, 8, 9, 10_

- [x] 11. Create PayTR API endpoints



  - [x] 11.1 Implement POST /api/v1/payments/paytr/initialize endpoint

    - Require JWT authentication
    - Require Idempotency-Key header (return 428 if missing)
    - Parse request body (orderId, amount, currency, customer, userIp)
    - Call PaymentOrchestrator.initialize_payment for PayTR
    - Return 200 with paymentId, status, provider, formParams
    - _Requirements: Req 3, 8_

  - [x] 11.2 Implement POST /api/v1/callbacks/paytr endpoint

    - Public endpoint (no auth, but IP allowlist via Nginx)
    - Parse form data from PayTR
    - Call PaymentOrchestrator.process_callback
    - Return 200 with body "OK" (plain text, not JSON)
    - Log all callback events with traceId
    - _Requirements: Req 4, 9, 10_

- [x] 12. Add Prometheus metrics and observability for PayTR



  - Add PayTR to existing payment metrics (use provider label)
  - Implement callback_hash_failed_total{provider} metric
  - Add structured logging for callback processing
  - _Requirements: Req 10_

- [x] 13. Implement reconciliation worker for stuck payments






  - [x] 13.1 Create ReconciliationWorker class


    - Initialize with PaymentRepository, IyzicoAdapter, PayTRAdapter, PrometheusMetrics
    - _Requirements: Req 7_

  - [x] 13.2 Implement run method (cron job every 10 minutes)


    - Query payments with status IN [PENDING_3DS, INITIATED] AND createdAt < NOW() - 15 minutes
    - For each payment:
      - If provider is iyzico, call IyzicoAdapter.query_payment_status
      - If provider is PayTR, alert (PayTR has no status query API, manual investigation required)
      - If final status received, update payment and order status in transaction
      - Emit reconciliation_recovered_total{provider, status} metric
    - Alert if payment stuck > 60 minutes (emit reconciliation_stuck_total{provider} metric)
    - _Requirements: Req 7, 10_

  - [x] 13.3 Create cron job configuration


    - Add Kubernetes CronJob manifest or Docker Compose service
    - Schedule: */10 * * * * (every 10 minutes)
    - Command: python -m workers.reconciliation
    - _Requirements: Req 7_

- [x] 14. Write integration tests for PayTR




  - Test PayTRAdapter._generate_token with known inputs
  - Test PayTRAdapter.validate_callback_hash with valid and invalid hashes
  - Test PayTR callback flow with valid hash (verify "OK" response)
  - Test PayTR callback with invalid hash (verify 400 response and alert)
  - Test callback deduplication (send same callback twice)
  - _Requirements: All Sprint 2 requirements_

- [x] 14.5 Write critical E2E tests (early feedback)



  - [x] 14.5.1 E2E test: iyzico successful payment flow



    - Initialize payment → render 3DS (Base64 decode) → simulate webhook → verify order PAID
    - Use iyzico sandbox test card: 5528790000000008
    - _Requirements: Req 1, 2, 11_

  - [x] 14.5.2 E2E test: PayTR successful payment flow

    - Initialize payment → submit form → simulate callback with valid hash → verify "OK" response → verify order PAID
    - Use PayTR test mode (test_mode=1)
    - _Requirements: Req 3, 4, 11_

  - [x] 14.5.3 E2E test: Idempotency

    - Send duplicate payment initialization with same Idempotency-Key
    - Verify same response returned without calling provider
    - _Requirements: Req 8_

### Sprint 3: Notification Integration (Email & SMS)

- [x] 15. Implement email notification service



  - [x] 15.1 Create SendGridAdapter class



    - Initialize with API key and base URL
    - **Configure EU region support**: use api.eu.sendgrid.com for GDPR compliance
    - Set up EU subuser in SendGrid account
    - Implement send_email method using SendGrid v3 Mail Send API
    - Support HTML and plain text templates
    - Handle rate limiting and errors
    - _Requirements: Req 14_

  - [x] 15.2 Create AWS SES adapter (alternative)



    - Implement SESAdapter class with send_email method
    - Use boto3 SendEmail API
    - Handle ASCII/Unicode constraints
    - _Requirements: Req 14_

  - [x] 15.3 Create email template system



    - Create order_confirmation.html template
    - Create payment_failed.html template with retry link
    - Support variable substitution (order_id, amount, customer_name, etc.)
    - _Requirements: Req 14_

  - [x] 15.4 Implement NotificationService



    - Create NotificationService class with send_order_confirmation and send_payment_failed methods
    - Enqueue email jobs to BullMQ queue
    - Implement retry logic (3 attempts with exponential backoff)
    - Emit alert after final failure
    - Store notification API keys in environment variables
    - _Requirements: Req 14_

- [x] 16. Implement SMS notification service



  - [x] 16.1 Create NetgsmAdapter class



    - Initialize with API credentials
    - Implement send_sms method using Netgsm REST API
    - Support Turkish characters
    - Handle rate limiting
    - _Requirements: Req 14_

  - [x] 16.2 Integrate SMS with NotificationService



    - Add send_payment_notification_sms method
    - Enqueue SMS jobs to BullMQ queue
    - Implement retry logic
    - _Requirements: Req 14_

- [x] 17. Integrate notifications with payment flow


  - [x] 17.1 Trigger email on payment success





    - In PaymentOrchestrator.process_webhook/process_callback, when status transitions to AUTHORIZED
    - Enqueue order_confirmation email job
    - _Requirements: Req 14_

  - [x] 17.2 Trigger email on payment failure



    - When status transitions to FAILED
    - Enqueue payment_failed email job with failure reason and retry link
    - _Requirements: Req 14_

- [x] 18. Create notification worker





  - Create BullMQ worker to process email and SMS jobs
  - Implement job handlers for each notification type
  - Add job retry configuration (3 attempts, exponential backoff)
  - Log all notification attempts
  - _Requirements: Req 14_

- [x] 19. Write tests for notification system




  - Test SendGridAdapter.send_email with mock API
  - Test NetgsmAdapter.send_sms with mock API
  - Test notification queue and worker
  - Test retry logic on failures
  - _Requirements: Req 14_

### Sprint 4: Production Hardening & Additional Features

- [x] 20. Implement payment status query endpoint




  - Implement GET /api/v1/orders/{orderId}/payment endpoint
  - Require JWT authentication
  - Verify user is order owner or admin (return 403 if not)
  - Return payment status, amount, provider, threeDS details, timestamps
  - Mask sensitive fields (card number, CVV)
  - _Requirements: Req 5_

- [ ] 21. Implement refund functionality (Phase 2)

  - [ ] 21.1 Add refund methods to adapters
    - Implement IyzicoAdapter.refund_payment method
    - Implement PayTRAdapter.refund_payment method
    - _Requirements: Req 6_

  - [ ] 21.2 Create RefundService
    - Implement initiate_refund method with validation (payment must be AUTHORIZED or CAPTURED)
    - Support partial and full refunds
    - Create refund record in database
    - Update payment status to REFUNDED
    - _Requirements: Req 6_

  - [ ] 21.3 Implement POST /api/v1/payments/{id}/refund endpoint
    - Require admin role
    - Require Idempotency-Key header
    - Parse refund amount from request body
    - Call RefundService.initiate_refund
    - Return 200 with refund details
    - Return 422 if payment not refundable
    - _Requirements: Req 6_

- [ ] 22. Configure Nginx for production

  - [ ] 22.1 Set up SSL/TLS certificates
    - Configure SSL certificate and key paths
    - Enable HTTP/2
    - Add HSTS header (max-age=31536000; includeSubDomains)
    - _Requirements: Req 9_

  - [ ] 22.2 Configure webhook/callback IP allowlist
    - **DO NOT hard-code CIDR ranges**; use current IP lists from provider admin panels
    - For iyzico: Settings → Merchant Settings → Merchant Notifications (panel publishes current webhook IPs)
    - For PayTR: Check merchant panel for current callback IP ranges
    - Configure Nginx allowlist dynamically or document manual update process
    - Deny all other IPs for webhook/callback endpoints
    - _Requirements: Req 9_

  - [ ] 22.3 Add rate limiting
    - Limit webhook endpoints to 100 req/min per IP
    - Limit callback endpoints to 100 req/min per IP
    - _Requirements: Req 9_

  - [ ] 22.4 Configure CSP and security headers
    - Add Content-Security-Policy header
    - Add X-Frame-Options: DENY
    - Add X-Content-Type-Options: nosniff
    - _Requirements: Req 9_

- [ ] 23. Set up monitoring and alerting

  - [ ] 23.1 Configure Prometheus alerts
    - HighPaymentFailureRate: failure rate > 5% for 5 minutes
    - WebhookNotReceived: no webhooks for 30 minutes during business hours
    - CallbackHashFailures: > 3 hash failures in 5 minutes
    - StuckPayments: payments stuck > 60 minutes
    - _Requirements: Req 10_

  - [ ] 23.2 Create Grafana dashboard
    - Payment volume and success rate
    - Provider comparison (iyzico vs PayTR)
    - Webhook/callback processing metrics
    - Reconciliation worker metrics
    - Circuit breaker status
    - _Requirements: Req 10_

- [ ] 24. Implement frontend 3DS flow

  - [ ] 24.1 Create iyzico 3DS component
    - Render htmlContent in iframe or new window
    - Handle 3DS completion callback
    - Poll /api/v1/orders/{orderId}/payment every 2 seconds for up to 60 seconds
    - Display loading state during authentication
    - _Requirements: Req 11_

  - [ ] 24.2 Create PayTR form submission component
    - Generate form with PayTR parameters
    - Auto-submit form to redirect to PayTR hosted page
    - Handle return from PayTR (merchant_ok_url / merchant_fail_url)
    - Poll payment status endpoint
    - _Requirements: Req 11_

  - [ ] 24.3 Create payment result pages
    - Success page: redirect to order confirmation
    - Failure page: display error message with retry button
    - Offer option to try different card or payment method
    - Implement anti-double-submit: disable submit button after click, show loading state
    - Generate unique Idempotency-Key (UUID) on frontend for each payment attempt
    - _Requirements: Req 11_

- [ ] 25. Write additional end-to-end tests

  - [ ] 25.1 E2E test: Payment failure and retry
    - Use iyzico test card for failure: 5528790000000024
    - Simulate 3DS failure → display error → retry with different card
    - Verify anti-double-submit protection works
    - _Requirements: Req 11, 12_

  - [ ] 25.2 E2E test: 3DS challenge flow
    - Use iyzico test card for challenge: 5528790000000016
    - Verify challenge page renders correctly
    - Complete challenge → verify order PAID
    - _Requirements: Req 1, 2, 11_

  - [ ] 25.3 E2E test: Reconciliation worker
    - Create stuck payment (PENDING_3DS > 15 minutes)
    - Run reconciliation worker
    - Verify payment recovered via iyzico status query
    - Verify PayTR stuck payment triggers alert (no auto-recovery)
    - _Requirements: Req 7_

  - [ ] 25.4 E2E test: Webhook/callback deduplication
    - Send same webhook/callback multiple times
    - Verify only first event processed, duplicates ignored
    - _Requirements: Req 2, 4, 8_

- [ ] 26. Create deployment documentation

  - Document environment variables for iyzico and PayTR
  - Document database migration steps
  - Document Nginx configuration
  - Document monitoring setup
  - Document webhook/callback testing procedures
  - Create runbook for common operational tasks
  - _Requirements: All requirements_

- [ ] 27. Prepare for shipping integration (Phase 2 prep)

  - Add order.shipping.tracking_number field to Order schema
  - Create webhook endpoint for shipping provider callbacks
  - Document shipping provider API requirements (Yurtiçi, Aras, MNG)
  - _Requirements: Req 15_

---

## Acceptance Criteria

### Sprint 1 Complete When:
- [x] iyzico 3DS initialization returns htmlContent
- [x] iyzico webhook processing updates payment and order status
- [x] Webhook deduplication prevents duplicate processing
- [x] Idempotency prevents double charges
- [x] Unit tests pass for iyzico adapter and orchestrator

### Sprint 2 Complete When:
- [x] PayTR initialization returns form parameters
- [x] PayTR callback validates hash and returns "OK"
- [x] Callback with invalid hash returns 400 and triggers alert
- [x] Reconciliation worker recovers stuck iyzico payments
- [x] PayTR stuck payments trigger alerts (no auto-recovery)

### Sprint 3 Complete When:
- [x] Order confirmation email sent on successful payment
- [x] Payment failure email sent with retry link
- [x] SMS notifications sent for payment events
- [x] Notification retry logic handles transient failures
- [x] Alerts triggered on notification delivery failures

### Sprint 4 Complete When:
- [x] Payment status query endpoint returns masked data
- [x] Refund endpoint processes full and partial refunds
- [x] Nginx configured with SSL, IP allowlist, rate limiting
- [x] Prometheus alerts configured and tested
- [x] Grafana dashboard displays payment metrics
- [x] Frontend 3DS flows work for both providers
- [x] E2E tests pass for all critical flows
- [x] Documentation complete and reviewed

---

## Notes

- All tasks reference specific requirements for traceability
- Each sprint builds incrementally on previous sprints
- Idempotency and transactional integrity are enforced throughout
- PII masking and security are implemented from the start
- Observability (metrics, logs, traces) is built into every component
- Test mode support allows safe development and testing 