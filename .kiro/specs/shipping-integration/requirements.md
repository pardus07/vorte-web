# Shipping Integration - Requirements Document

## Introduction

This document specifies requirements for integrating Turkish shipping providers (Yurtiçi Kargo, Aras Kargo, MNG Kargo) into the e-commerce platform for order fulfillment and tracking.

## Glossary

- **Shipping System**: The backend service that manages shipment creation, tracking, and status updates
- **Provider**: Third-party shipping company (Yurtiçi, Aras, MNG)
- **Tracking Number**: Unique identifier assigned by provider to track shipment
- **Webhook**: HTTP callback from provider to notify status changes
- **Shipment**: Physical package sent from warehouse to customer

## Requirements

### Requirement 1: Shipment Creation

**User Story:** As a warehouse operator, I want to create shipments with shipping providers, so that orders can be fulfilled and tracked.

#### Acceptance Criteria

1. WHEN the warehouse operator creates a shipment, THE Shipping System SHALL call the provider API with order details
2. WHEN the provider API returns a tracking number, THE Shipping System SHALL store the tracking number in the order record
3. WHEN shipment creation succeeds, THE Shipping System SHALL update order status to SHIPPED
4. IF shipment creation fails, THEN THE Shipping System SHALL log the error and alert operations team
5. THE Shipping System SHALL support Yurtiçi Kargo, Aras Kargo, and MNG Kargo providers

### Requirement 2: Tracking Query

**User Story:** As a customer, I want to check my order's shipping status, so that I know when to expect delivery.

#### Acceptance Criteria

1. WHEN a customer queries tracking information, THE Shipping System SHALL return current status and location
2. THE Shipping System SHALL cache tracking data for 5 minutes to reduce provider API calls
3. WHEN tracking data is unavailable, THE Shipping System SHALL return last known status from database
4. THE Shipping System SHALL sanitize tracking numbers (alphanumeric only, max 50 characters)
5. THE Shipping System SHALL rate limit tracking queries to 10 requests per minute per IP

### Requirement 3: Webhook Processing

**User Story:** As the system, I want to receive real-time status updates from providers, so that customers have accurate tracking information.

#### Acceptance Criteria

1. WHEN a provider sends a webhook, THE Shipping System SHALL verify the webhook signature
2. IF the signature is invalid, THEN THE Shipping System SHALL return 401 and log security alert
3. WHEN webhook signature is valid, THE Shipping System SHALL parse the provider-specific payload
4. THE Shipping System SHALL map provider status to standard status (created, picked_up, in_transit, out_for_delivery, delivered, failed, returned)
5. WHEN status changes to delivered, THE Shipping System SHALL update order status to DELIVERED

### Requirement 4: Customer Notifications

**User Story:** As a customer, I want to receive notifications about my shipment, so that I stay informed about delivery progress.

#### Acceptance Criteria

1. WHEN shipment is created, THE Shipping System SHALL send email and SMS with tracking number
2. WHEN status changes to out_for_delivery, THE Shipping System SHALL send notification "Your order is out for delivery today"
3. WHEN status changes to delivered, THE Shipping System SHALL send notification "Your order has been delivered"
4. IF delivery fails, THEN THE Shipping System SHALL send notification with instructions to contact support
5. THE Shipping System SHALL use existing notification infrastructure (outbox pattern)

### Requirement 5: Provider Adapter Pattern

**User Story:** As a developer, I want a consistent interface for all providers, so that adding new providers is straightforward.

#### Acceptance Criteria

1. THE Shipping System SHALL define a ShippingProviderAdapter interface with create_shipment, query_tracking, and validate_webhook methods
2. THE Shipping System SHALL implement YurticiAdapter, ArasAdapter, and MNGAdapter classes
3. WHEN a new provider is added, THE Shipping System SHALL only require implementing the adapter interface
4. THE Shipping System SHALL use environment variables for provider API credentials
5. THE Shipping System SHALL support provider-specific configuration (base URL, timeout, retry policy)

### Requirement 6: Error Handling and Retry

**User Story:** As the system, I want to handle provider API failures gracefully, so that temporary issues don't block order fulfillment.

#### Acceptance Criteria

1. WHEN a provider API call fails with HTTP 429, 500, 502, 503, or 504, THE Shipping System SHALL retry with exponential backoff (1s, 2s, 4s)
2. THE Shipping System SHALL retry up to 3 times before marking shipment creation as failed
3. WHEN all retries fail, THE Shipping System SHALL log error and emit alert metric
4. THE Shipping System SHALL use circuit breaker pattern (open after 10 consecutive failures, keep open for 60 seconds)
5. WHEN circuit is open, THE Shipping System SHALL return cached data or fail fast without calling provider

### Requirement 7: Security

**User Story:** As a security engineer, I want shipping webhooks to be secure, so that malicious actors cannot inject fake status updates.

#### Acceptance Criteria

1. THE Shipping System SHALL verify webhook signatures using provider-specific algorithms (HMAC-SHA256 or similar)
2. THE Shipping System SHALL use IP allowlisting for webhook endpoints (configure in Nginx)
3. THE Shipping System SHALL rate limit webhook endpoints to 100 requests per minute per IP
4. THE Shipping System SHALL log all webhook attempts with IP address and signature verification result
5. IF signature verification fails 3 times in 5 minutes from same IP, THEN THE Shipping System SHALL emit security alert

### Requirement 8: Monitoring and Observability

**User Story:** As an operations engineer, I want to monitor shipping operations, so that I can detect and resolve issues quickly.

#### Acceptance Criteria

1. THE Shipping System SHALL emit Prometheus metrics: shipping_created_total{provider}, shipping_delivered_total{provider}, shipping_failed_total{provider}
2. THE Shipping System SHALL emit shipping_api_latency_seconds{provider, operation} histogram
3. THE Shipping System SHALL emit shipping_webhook_received_total{provider, status} counter
4. THE Shipping System SHALL log all shipping operations with correlation ID (X-Request-Id)
5. THE Shipping System SHALL mask PII in logs (customer name, phone, address)

### Requirement 9: Admin Interface

**User Story:** As a warehouse operator, I want to manually create shipments from admin panel, so that I can handle special cases.

#### Acceptance Criteria

1. THE Shipping System SHALL provide POST /api/v1/admin/shipping/create endpoint (requires admin role)
2. WHEN admin creates shipment, THE Shipping System SHALL validate order exists and status is PAID
3. THE Shipping System SHALL allow selecting provider (yurtici, aras, mng)
4. THE Shipping System SHALL return tracking number and estimated delivery date
5. THE Shipping System SHALL log admin shipment creation with admin user ID

### Requirement 10: Testing and Sandbox

**User Story:** As a developer, I want to test shipping integration without affecting production, so that I can develop safely.

#### Acceptance Criteria

1. THE Shipping System SHALL support test mode (use provider sandbox APIs)
2. WHEN test mode is enabled, THE Shipping System SHALL use test API credentials from environment
3. THE Shipping System SHALL accept test tracking numbers for webhook testing
4. THE Shipping System SHALL log test mode operations with TEST prefix
5. THE Shipping System SHALL prevent test shipments from triggering customer notifications

