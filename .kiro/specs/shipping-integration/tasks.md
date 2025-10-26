# Shipping Integration - Implementation Plan

## Task List

### Phase 1: Core Infrastructure

- [x] 1. Create shipping provider adapter interface and base classes


  - Create ShippingProviderAdapter abstract base class with create_shipment, query_tracking, validate_webhook, parse_webhook methods
  - Define standard data models (ShippingInfo, ShippingEvent, ShippingStatus enum)
  - Create custom exceptions (ShippingAPIError, UnsupportedProviderError, InvalidWebhookSignatureError)
  - _Requirements: Req 5_

- [ ] 2. Implement Yurtiçi Kargo adapter
  - [ ] 2.1 Create YurticiAdapter class
    - Initialize with API key, secret, base URL from environment
    - Create HTTP client with 30-second timeout
    - _Requirements: Req 5_
  
  - [ ] 2.2 Implement create_shipment method
    - Build Yurtiçi API request payload with recipient and package details
    - Call POST /shipment/create endpoint
    - Parse response and extract tracking number, estimated delivery
    - Handle errors and map to ShippingAPIError
    - _Requirements: Req 1_
  
  - [ ] 2.3 Implement query_tracking method
    - Call GET /tracking/{tracking_number} endpoint
    - Parse response and return tracking history
    - Map Yurtiçi status to standard status
    - _Requirements: Req 2_
  
  - [ ] 2.4 Implement validate_webhook method
    - Calculate HMAC-SHA256 signature using API secret
    - Use hmac.compare_digest for timing-safe comparison
    - Return boolean
    - _Requirements: Req 3, Req 7_
  
  - [ ] 2.5 Implement parse_webhook method
    - Map Yurtiçi status to standard status (Gönderi Oluşturuldu → created, etc.)
    - Extract tracking number, timestamp, location
    - Return standardized webhook data
    - _Requirements: Req 3_

- [ ] 3. Implement Aras Kargo adapter
  - [ ] 3.1 Create ArasAdapter class
    - Initialize with API credentials from environment
    - _Requirements: Req 5_
  
  - [ ] 3.2 Implement create_shipment method
    - Build Aras API request payload
    - Call shipment creation endpoint
    - Parse response
    - _Requirements: Req 1_
  
  - [ ] 3.3 Implement query_tracking method
    - Call Aras tracking API
    - Map Aras status to standard status
    - _Requirements: Req 2_
  
  - [ ] 3.4 Implement validate_webhook and parse_webhook methods
    - Implement Aras-specific signature verification
    - Map Aras status to standard status
    - _Requirements: Req 3, Req 7_

- [ ] 4. Implement MNG Kargo adapter
  - [ ] 4.1 Create MNGAdapter class
    - Initialize with API credentials from environment
    - _Requirements: Req 5_
  
  - [ ] 4.2 Implement create_shipment method
    - Build MNG API request payload
    - Call shipment creation endpoint
    - Parse response
    - _Requirements: Req 1_
  
  - [ ] 4.3 Implement query_tracking method
    - Call MNG tracking API
    - Map MNG status to standard status
    - _Requirements: Req 2_
  
  - [ ] 4.4 Implement validate_webhook and parse_webhook methods
    - Implement MNG-specific signature verification
    - Map MNG status to standard status
    - _Requirements: Req 3, Req 7_

### Phase 2: Orchestration Layer

- [ ] 5. Implement ShippingOrchestrator
  - [ ] 5.1 Create ShippingOrchestrator class
    - Initialize with OrderRepository, NotificationService, PrometheusMetrics, RedisCache
    - Initialize provider adapters (yurtici, aras, mng) from environment config
    - _Requirements: Req 5_
  
  - [ ] 5.2 Implement create_shipment method
    - Validate order exists and status is PAID
    - Get provider adapter by name
    - Prepare recipient and package data from order
    - Call adapter.create_shipment with retry logic
    - Update order.shipping with tracking number, provider, status
    - Update order status to SHIPPED
    - Send shipment created notification
    - Emit shipping_created_total metric
    - _Requirements: Req 1, Req 4, Req 6, Req 8_
  
  - [ ] 5.3 Implement query_tracking method
    - Check Redis cache for tracking data (5-minute TTL)
    - If cache miss, call adapter.query_tracking
    - Cache result in Redis
    - Return tracking data
    - Emit shipping_api_latency_seconds metric
    - _Requirements: Req 2, Req 8_
  
  - [ ] 5.4 Implement process_webhook method
    - Get provider adapter
    - Validate webhook signature using adapter.validate_webhook
    - If signature invalid, log security alert and return 401
    - Parse webhook using adapter.parse_webhook
    - Find order by tracking number
    - Update order.shipping.status and add history event
    - If status is delivered, update order status to DELIVERED
    - Send status notification based on status (out_for_delivery, delivered, failed)
    - Emit shipping_webhook_received_total metric
    - _Requirements: Req 3, Req 4, Req 7, Req 8_
  
  - [ ] 5.5 Implement retry logic with exponential backoff
    - Retry on HTTP 429, 500, 502, 503, 504
    - Exponential backoff: 1s, 2s, 4s
    - Max 3 retries
    - Log retry attempts
    - _Requirements: Req 6_
  
  - [ ] 5.6 Implement circuit breaker
    - Open circuit after 10 consecutive failures
    - Keep circuit open for 60 seconds
    - Emit provider_circuit_open_total metric
    - _Requirements: Req 6_

### Phase 3: API Endpoints

- [ ] 6. Implement shipping API endpoints
  - [ ] 6.1 Implement POST /api/v1/admin/shipping/create endpoint
    - Require admin role (JWT authentication)
    - Parse request body (order_id, provider)
    - Call ShippingOrchestrator.create_shipment
    - Return 200 with tracking number and estimated delivery
    - Return 422 if order status is not PAID
    - Log admin shipment creation with admin user ID
    - _Requirements: Req 9_
  
  - [ ] 6.2 Implement GET /api/v1/shipping/tracking/{tracking_number} endpoint
    - Sanitize tracking number (alphanumeric only, max 50 chars)
    - Rate limit to 10 requests per minute per IP
    - Call ShippingOrchestrator.query_tracking
    - Return tracking data with masked PII
    - Return 404 if tracking number not found
    - _Requirements: Req 2, Req 8_
  
  - [ ] 6.3 Implement POST /api/v1/shipping/webhooks/{provider} endpoint
    - Public endpoint (no auth, but IP allowlist via Nginx)
    - Extract signature from header (X-Signature or provider-specific header)
    - Call ShippingOrchestrator.process_webhook
    - Return 200 OK
    - Return 401 if signature invalid
    - Log all webhook attempts with IP and signature verification result
    - _Requirements: Req 3, Req 7_

### Phase 4: Notifications

- [ ] 7. Implement shipping notifications
  - [ ] 7.1 Create email templates
    - Create shipment_created.html template with tracking number and link
    - Create out_for_delivery.html template
    - Create delivered.html template
    - Create delivery_failed.html template with support contact info
    - Support Turkish and English languages
    - _Requirements: Req 4_
  
  - [ ] 7.2 Create SMS templates
    - Create shipment_created.txt template (max 160 chars)
    - Create out_for_delivery.txt template
    - Create delivered.txt template
    - Support Turkish characters
    - _Requirements: Req 4_
  
  - [ ] 7.3 Extend NotificationService
    - Add send_shipment_created method
    - Add send_out_for_delivery method
    - Add send_delivered method
    - Add send_delivery_failed method
    - Use existing outbox pattern for reliability
    - _Requirements: Req 4_

### Phase 5: Testing

- [ ] 8. Write unit tests
  - [ ] 8.1 Test YurticiAdapter
    - Test create_shipment with valid data
    - Test create_shipment with API error
    - Test query_tracking
    - Test validate_webhook with valid and invalid signatures
    - Test parse_webhook with various statuses
    - _Requirements: Req 1, Req 2, Req 3_
  
  - [ ] 8.2 Test ArasAdapter
    - Test create_shipment, query_tracking, validate_webhook, parse_webhook
    - _Requirements: Req 1, Req 2, Req 3_
  
  - [ ] 8.3 Test MNGAdapter
    - Test create_shipment, query_tracking, validate_webhook, parse_webhook
    - _Requirements: Req 1, Req 2, Req 3_
  
  - [ ] 8.4 Test ShippingOrchestrator
    - Test create_shipment with mocked adapter
    - Test process_webhook with valid signature
    - Test process_webhook with invalid signature (verify 401 and alert)
    - Test retry logic on API failures
    - Test circuit breaker behavior
    - _Requirements: Req 1, Req 3, Req 6_

- [ ] 9. Write integration tests
  - [ ] 9.1 Test with provider sandbox APIs
    - Test Yurtiçi shipment creation in test mode
    - Test Aras shipment creation in test mode
    - Test MNG shipment creation in test mode
    - Verify tracking numbers returned
    - _Requirements: Req 10_
  
  - [ ] 9.2 Test webhook processing
    - Send test webhooks to local endpoint
    - Verify order status updated
    - Verify notifications sent
    - Test webhook signature validation
    - _Requirements: Req 3, Req 4_

- [ ]* 10. Write E2E tests
  - [ ]* 10.1 E2E test: Create shipment → receive webhook → verify delivered
    - Create order and mark as PAID
    - Create shipment via admin endpoint
    - Simulate webhook with status updates (created → in_transit → delivered)
    - Verify order status updated to DELIVERED
    - Verify customer received notifications
    - _Requirements: Req 1, Req 3, Req 4_
  
  - [ ]* 10.2 E2E test: Delivery failure flow
    - Create shipment
    - Simulate webhook with failed status
    - Verify customer received delivery failed notification
    - _Requirements: Req 3, Req 4_
  
  - [ ]* 10.3 E2E test: Tracking query
    - Create shipment
    - Query tracking via customer endpoint
    - Verify tracking data returned
    - Verify data cached in Redis
    - _Requirements: Req 2_

### Phase 6: Production Hardening

- [ ] 11. Configure Nginx for shipping webhooks
  - [ ] 11.1 Set up webhook IP allowlist
    - Get current webhook IP ranges from Yurtiçi admin panel
    - Get current webhook IP ranges from Aras admin panel
    - Get current webhook IP ranges from MNG admin panel
    - Configure Nginx allowlist for /api/v1/shipping/webhooks/
    - Deny all other IPs
    - _Requirements: Req 7_
  
  - [ ] 11.2 Configure rate limiting
    - Limit webhook endpoints to 100 req/min per IP
    - Limit tracking endpoint to 10 req/min per IP
    - _Requirements: Req 2, Req 7_

- [ ] 12. Set up monitoring and alerting
  - [ ] 12.1 Configure Prometheus alerts
    - HighShipmentFailureRate: failure rate > 5% for 5 minutes
    - NoWebhooksReceived: no webhooks for 30 minutes during business hours
    - WebhookSignatureFailures: > 3 signature failures in 5 minutes from same IP
    - HighShippingAPILatency: P95 > 5s
    - _Requirements: Req 8_
  
  - [ ] 12.2 Create Grafana dashboard
    - Shipment volume by provider
    - Delivery success rate by provider
    - Webhook processing metrics
    - API latency by provider and operation
    - Circuit breaker status
    - _Requirements: Req 8_

- [ ] 13. Create deployment documentation
  - Document environment variables for each provider
  - Document how to obtain API credentials from providers
  - Document webhook URL configuration in provider panels
  - Document IP allowlist update process
  - Document test mode setup
  - Create runbook for common operational tasks
  - _Requirements: All requirements_

## Acceptance Criteria

### Phase 1 Complete When:
- [ ] All three provider adapters implemented (Yurtiçi, Aras, MNG)
- [ ] Adapters can create shipments and return tracking numbers
- [ ] Webhook signature validation works for all providers
- [ ] Status mapping from provider-specific to standard statuses works

### Phase 2 Complete When:
- [ ] ShippingOrchestrator can create shipments via any provider
- [ ] Webhook processing updates order status correctly
- [ ] Retry logic handles transient API failures
- [ ] Circuit breaker prevents cascading failures

### Phase 3 Complete When:
- [ ] Admin can create shipments via API endpoint
- [ ] Customers can query tracking information
- [ ] Webhooks are received and processed correctly
- [ ] Invalid webhook signatures are rejected with 401

### Phase 4 Complete When:
- [ ] Customers receive email and SMS when shipment is created
- [ ] Customers receive notification when order is out for delivery
- [ ] Customers receive notification when order is delivered
- [ ] Customers receive notification if delivery fails

### Phase 5 Complete When:
- [ ] Unit tests pass for all adapters and orchestrator
- [ ] Integration tests pass with provider sandbox APIs
- [ ] E2E tests pass for complete shipment lifecycle

### Phase 6 Complete When:
- [ ] Nginx configured with IP allowlist and rate limiting
- [ ] Prometheus alerts configured and tested
- [ ] Grafana dashboard displays shipping metrics
- [ ] Documentation complete and reviewed

## Notes

- All tasks reference specific requirements for traceability
- Test mode support allows safe development without affecting production
- PII masking and security are implemented from the start
- Observability (metrics, logs) is built into every component
- Provider adapters follow consistent interface for easy extension
