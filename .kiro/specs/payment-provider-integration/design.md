# Design Document - Payment Provider Integration

## Overview

The Payment Provider Integration implements production-ready payment processing for VORTE e-commerce platform through iyzico and PayTR gateways. The design follows EMV 3-D Secure v2.2 standards, ensures idempotency and transactional integrity, implements webhook/callback handling with deduplication, and provides reconciliation mechanisms for stuck transactions.

### Key Design Principles

1. **Idempotency First**: All payment operations use Idempotency-Key with 24-hour replay window
2. **Transactional Integrity**: Payment and order status updates occur in single MongoDB transaction
3. **Event Sourcing**: All webhook/callback events stored with deduplication for audit trail
4. **Reconciliation**: Background worker recovers stuck payments via provider status queries
5. **Security by Default**: PII masking, HTTPS enforcement, IP allowlist, hash validation
6. **Provider Abstraction**: Common payment interface with provider-specific adapters

## Architecture

### High-Level Flow

```
Customer → Frontend → API Gateway → Payment Service → Provider (iyzico/PayTR)
                                          ↓
                                    MongoDB Transaction
                                    (payment + order)
                                          ↓
Provider → Webhook/Callback → Event Store → Status Update → Notification Queue
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Payment Service                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   iyzico     │  │    PayTR     │  │  Refund      │      │
│  │   Adapter    │  │   Adapter    │  │  Handler     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│  ┌──────────────────────────────────────────────────┐       │
│  │         Payment Orchestrator                     │       │
│  │  - Idempotency Check                            │       │
│  │  - Transaction Management                        │       │
│  │  - Status State Machine                          │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
         │                                          │
         ↓                                          ↓
┌──────────────────┐                    ┌──────────────────┐
│   MongoDB        │                    │   Redis          │
│  - payments      │                    │  - idempotency   │
│  - payment_events│                    │  - rate_limit    │
│  - orders        │                    └──────────────────┘
└──────────────────┘


### Reconciliation Worker

```
┌──────────────────────────────────────────────────────────┐
│           Reconciliation Worker (Cron: */10 min)         │
├──────────────────────────────────────────────────────────┤
│  1. Query payments WHERE status IN (PENDING_3DS,         │
│     INITIATED) AND createdAt < NOW() - 15 minutes        │
│  2. For each payment:                                    │
│     - Call provider status query API                     │
│     - Update payment status if final                     │
│     - Emit reconciliation_recovered_total metric         │
│  3. Alert if payment stuck > 60 minutes                  │
└──────────────────────────────────────────────────────────┘
```

## Data Models

### payments Collection

```typescript
interface Payment {
  id: string;                    // UUID
  orderId: string;               // Reference to orders collection
  provider: 'iyzico' | 'paytr';
  status: PaymentStatus;
  amount: number;                // Minor units (1000 = 10.00 TRY)
  currency: string;              // ISO 4217 (TRY, USD, EUR)
  
  threeDS: {
    version: string;             // "2.2.0"
    status: string;              // "Y", "N", "A", "U"
    eci: string;                 // Electronic Commerce Indicator
    cavv: string;                // Cardholder Authentication Value
  };
  
  providerRefs: {
    iyzico?: {
      paymentId: string;         // iyzico payment ID
      conversationId: string;    // iyzico conversation ID
    };
    paytr?: {
      merchant_oid: string;      // PayTR merchant order ID
    };
  };
  
  idempotencyKey: string;        // 24-hour replay window
  hashCheck?: string;            // PayTR callback hash
  
  raw: object;                   // Provider response (PII masked)
  
  createdAt: Date;
  updatedAt: Date;
}

enum PaymentStatus {
  INITIATED = 'INITIATED',           // Payment record created
  PENDING_3DS = 'PENDING_3DS',       // Waiting for 3DS authentication
  AUTHORIZED = 'AUTHORIZED',         // Payment authorized (for iyzico/PayTR, capture is automatic; AUTHORIZED = CAPTURED)
  CAPTURED = 'CAPTURED',             // Payment captured (settled) - currently same as AUTHORIZED for instant capture
  FAILED = 'FAILED',                 // Payment failed
  CANCELLED = 'CANCELLED',           // Payment cancelled
  REFUNDED = 'REFUNDED'              // Payment refunded
}

// Note: iyzico and PayTR perform instant capture (sale transaction).
// Pre-authorization (auth-only) is a separate product; if needed in future,
// implement explicit AUTHORIZED → CAPTURED transition.
// For now: successful payment = AUTHORIZED status (equivalent to captured).
```

### payment_events Collection

```typescript
interface PaymentEvent {
  id: string;                    // UUID
  paymentId: string;             // Reference to payments collection
  provider: 'iyzico' | 'paytr';
  externalEventId: string;       // Provider event ID
  eventType: string;             // 'webhook', 'callback', 'status_query'
  status: string;                // Provider-specific status
  raw: object;                   // Full event payload (PII masked)
  processedAt: Date;
  createdAt: Date;
}

// Unique index: (externalEventId, provider) for deduplication
```

### Indexes

```javascript
// payments collection
db.payments.createIndex({ orderId: 1 });
db.payments.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
db.payments.createIndex({ status: 1, createdAt: 1 });
db.payments.createIndex({ 'providerRefs.iyzico.paymentId': 1 }, { sparse: true });
db.payments.createIndex({ 'providerRefs.paytr.merchant_oid': 1 }, { sparse: true });

// payment_events collection
db.payment_events.createIndex({ paymentId: 1, createdAt: -1 });
db.payment_events.createIndex({ externalEventId: 1, provider: 1 }, { unique: true });
```

## Components and Interfaces

### 1. Payment Orchestrator

**Responsibility**: Coordinates payment flow, manages state transitions, ensures idempotency

```python
class PaymentOrchestrator:
    def __init__(
        self,
        payment_repo: PaymentRepository,
        order_repo: OrderRepository,
        idempotency_manager: IdempotencyManager,
        event_store: PaymentEventStore
    ):
        self.payment_repo = payment_repo
        self.order_repo = order_repo
        self.idempotency_manager = idempotency_manager
        self.event_store = event_store
    
    async def initialize_payment(
        self,
        idempotency_key: str,
        order_id: str,
        provider: str,
        payment_data: dict
    ) -> PaymentResponse:
        """
        1. Check idempotency cache (24h window)
        2. Validate order exists and is in CREATED status
        3. Create payment record with INITIATED status
        4. Call provider adapter
        5. Update payment status to PENDING_3DS
        6. Cache response
        7. Return provider response (htmlContent or form params)
        """
        pass
    
    async def process_webhook(
        self,
        provider: str,
        event_data: dict
    ) -> None:
        """
        1. Validate webhook signature/hash
        2. Check event deduplication (externalEventId + provider)
        3. Store event in payment_events
        4. Update payment status
        5. If final status, update order status in transaction
        6. Emit metrics
        """
        pass
    
    async def transition_status(
        self,
        payment_id: str,
        new_status: PaymentStatus,
        reason: str = None
    ) -> None:
        """
        State machine validation:
        INITIATED → PENDING_3DS → AUTHORIZED → CAPTURED
                 ↘ FAILED
                 ↘ CANCELLED
        AUTHORIZED → REFUNDED
        """
        pass
```



### 2. iyzico Adapter

**Responsibility**: Implements iyzico-specific API calls with IYZWSv2 authentication

```python
class IyzicoAdapter:
    def __init__(self, api_key: str, secret_key: str, base_url: str):
        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = base_url  # sandbox or production
    
    def _generate_signature(self, request_body: str) -> str:
        """
        IYZWSv2 signature:
        1. Create random string
        2. Concatenate: api_key + random_string + secret_key + request_body
        3. SHA256 hash
        4. Base64 encode
        """
        random_string = secrets.token_hex(16)
        data = f"{self.api_key}{random_string}{self.secret_key}{request_body}"
        hash_value = hashlib.sha256(data.encode()).digest()
        signature = base64.b64encode(hash_value).decode()
        return f"IYZWSv2 {self.api_key}:{signature}:{random_string}"
    
    async def initialize_3ds(
        self,
        payment_id: str,
        order_id: str,
        amount: int,
        currency: str,
        customer: dict,
        card: dict
    ) -> dict:
        """
        POST /payment/3dsecure/initialize
        
        Request:
        {
          "locale": "tr",
          "conversationId": "<payment_id>",
          "price": "10.00",
          "paidPrice": "10.00",
          "currency": "TRY",
          "basketId": "<order_id>",
          "paymentChannel": "WEB",
          "paymentGroup": "PRODUCT",
          "callbackUrl": "https://api.vorte.com/api/v1/webhooks/iyzico",
          "buyer": {...},
          "shippingAddress": {...},
          "billingAddress": {...},
          "basketItems": [...],
          "paymentCard": {
            "cardHolderName": "...",
            "cardNumber": "...",
            "expireMonth": "...",
            "expireYear": "...",
            "cvc": "...",
            "registerCard": "0"
          }
        }
        
        Response:
        {
          "status": "success",
          "threeDSHtmlContent": "<html>...</html>",
          "paymentId": "...",
          "conversationId": "..."
        }
        """
        request_body = json.dumps({
            "locale": "tr",
            "conversationId": payment_id,
            "price": f"{amount / 100:.2f}",
            "paidPrice": f"{amount / 100:.2f}",
            "currency": currency,
            "basketId": order_id,
            "paymentChannel": "WEB",
            "paymentGroup": "PRODUCT",
            "callbackUrl": f"{settings.API_BASE_URL}/api/v1/webhooks/iyzico",
            "buyer": customer,
            "paymentCard": card
        })
        
        headers = {
            "Authorization": self._generate_signature(request_body),
            "Content-Type": "application/json"
        }
        
        response = await self.http_client.post(
            f"{self.base_url}/payment/3dsecure/initialize",
            headers=headers,
            data=request_body,
            timeout=30
        )
        
        return response.json()
    
    async def query_payment_status(self, payment_id: str) -> dict:
        """
        POST /payment/detail
        
        Used by reconciliation worker to fetch current status.
        
        Note: iyzico provides status query API for reconciliation.
        PayTR does NOT provide status query API; stuck PayTR payments
        require manual investigation and alert-based recovery.
        """
        pass
    
    def validate_webhook(self, request: Request) -> bool:
        """
        Validate webhook signature per iyzico documentation
        """
        pass
```

### 3. PayTR Adapter

**Responsibility**: Implements PayTR Direct API with hash-based authentication

```python
class PayTRAdapter:
    def __init__(self, merchant_id: str, merchant_key: str, merchant_salt: str, base_url: str):
        self.merchant_id = merchant_id
        self.merchant_key = merchant_key
        self.merchant_salt = merchant_salt
        self.base_url = base_url
    
    def _generate_token(
        self,
        merchant_oid: str,
        email: str,
        payment_amount: int,
        user_basket: str,
        no_installment: str,
        max_installment: str,
        currency: str,
        test_mode: str,
        user_ip: str
    ) -> str:
        """
        PayTR token hash:
        merchant_id + user_ip + merchant_oid + email + payment_amount + 
        user_basket + no_installment + max_installment + currency + 
        test_mode + merchant_salt
        
        HMAC-SHA256 → Base64
        """
        hash_str = (
            f"{self.merchant_id}{user_ip}{merchant_oid}{email}"
            f"{payment_amount}{user_basket}{no_installment}{max_installment}"
            f"{currency}{test_mode}{self.merchant_salt}"
        )
        token = hmac.new(
            self.merchant_key.encode(),
            hash_str.encode(),
            hashlib.sha256
        ).digest()
        return base64.b64encode(token).decode()
    
    async def initialize_payment(
        self,
        payment_id: str,
        order_id: str,
        amount: int,
        currency: str,
        customer: dict,
        user_ip: str
    ) -> dict:
        """
        Generate form POST parameters for PayTR hosted page
        
        Returns:
        {
          "merchant_id": "...",
          "merchant_oid": "<payment_id>",
          "email": "...",
          "payment_amount": "1000",  # Minor units (kuruş)
          "user_basket": base64(json),
          "no_installment": "0",
          "max_installment": "0",
          "currency": "TL",
          "test_mode": "1",
          "user_ip": "...",
          "merchant_ok_url": "https://vorte.com/payment/success",
          "merchant_fail_url": "https://vorte.com/payment/failure",
          "timeout_limit": "30",
          "debug_on": "1",
          "lang": "tr",
          "paytr_token": "...",
          "post_url": "https://www.paytr.com/odeme/guvenli/..."
        }
        """
        merchant_oid = payment_id
        user_basket = base64.b64encode(
            json.dumps([{
                "name": f"Order {order_id}",
                "price": f"{amount}",
                "quantity": "1"
            }]).encode()
        ).decode()
        
        test_mode = "1" if settings.ENVIRONMENT != "production" else "0"
        
        paytr_token = self._generate_token(
            merchant_oid=merchant_oid,
            email=customer["email"],
            payment_amount=str(amount),
            user_basket=user_basket,
            no_installment="0",
            max_installment="0",
            currency="TL",
            test_mode=test_mode,
            user_ip=user_ip
        )
        
        return {
            "merchant_id": self.merchant_id,
            "merchant_oid": merchant_oid,
            "email": customer["email"],
            "payment_amount": str(amount),
            "user_basket": user_basket,
            "no_installment": "0",
            "max_installment": "0",
            "currency": "TL",
            "test_mode": test_mode,
            "user_ip": user_ip,
            "merchant_ok_url": f"{settings.FRONTEND_URL}/payment/success",
            "merchant_fail_url": f"{settings.FRONTEND_URL}/payment/failure",
            "timeout_limit": "30",
            "debug_on": "1" if test_mode == "1" else "0",
            "lang": "tr",
            "paytr_token": paytr_token,
            "post_url": "https://www.paytr.com/odeme/guvenli/..."
        }
    
    def validate_callback_hash(
        self,
        merchant_oid: str,
        status: str,
        total_amount: str,
        hash_value: str
    ) -> bool:
        """
        Validate PayTR callback hash:
        merchant_oid + merchant_salt + status + total_amount
        
        HMAC-SHA256 → Base64 → compare with hash_value
        """
        hash_str = f"{merchant_oid}{self.merchant_salt}{status}{total_amount}"
        expected_hash = base64.b64encode(
            hmac.new(
                self.merchant_key.encode(),
                hash_str.encode(),
                hashlib.sha256
            ).digest()
        ).decode()
        
        return hmac.compare_digest(expected_hash, hash_value)
```



### 4. Payment Event Store

**Responsibility**: Stores and deduplicates webhook/callback events

```python
class PaymentEventStore:
    def __init__(self, db: Database):
        self.collection = db.payment_events
    
    async def store_event(
        self,
        payment_id: str,
        provider: str,
        external_event_id: str,
        event_type: str,
        status: str,
        raw_data: dict
    ) -> Optional[PaymentEvent]:
        """
        Store event with deduplication using unique index
        
        Returns:
        - PaymentEvent if new event
        - None if duplicate (unique index violation)
        """
        try:
            event = PaymentEvent(
                id=str(uuid.uuid4()),
                paymentId=payment_id,
                provider=provider,
                externalEventId=external_event_id,
                eventType=event_type,
                status=status,
                raw=self._mask_pii(raw_data),
                processedAt=datetime.utcnow(),
                createdAt=datetime.utcnow()
            )
            
            await self.collection.insert_one(event.dict())
            return event
            
        except DuplicateKeyError:
            # Event already processed
            logger.info(
                f"Duplicate event ignored: {external_event_id} from {provider}"
            )
            return None
    
    def _mask_pii(self, data: dict) -> dict:
        """
        Mask sensitive fields per KVKK compliance:
        - cardNumber: show BIN (first 6) and last 4 digits only
        - cvv: mask completely (never store)
        - email: mask local-part middle characters
        
        MANDATORY: Apply to all logs and payments.raw field before storage.
        """
        masked = data.copy()
        
        if "cardNumber" in masked:
            card = masked["cardNumber"]
            if len(card) >= 10:
                masked["cardNumber"] = f"{card[:6]}******{card[-4:]}"
            else:
                masked["cardNumber"] = "***INVALID***"
        
        if "cvv" in masked:
            masked["cvv"] = "***"
        
        if "email" in masked:
            email = masked["email"]
            parts = email.split("@")
            if len(parts) == 2:
                name = parts[0]
                if len(name) >= 4:
                    masked["email"] = f"{name[:2]}***{name[-2:]}@{parts[1]}"
                else:
                    masked["email"] = f"***@{parts[1]}"
        
        return masked
```

### 5. Reconciliation Worker

**Responsibility**: Recovers stuck payments via provider status queries

```python
class ReconciliationWorker:
    def __init__(
        self,
        payment_repo: PaymentRepository,
        iyzico_adapter: IyzicoAdapter,
        paytr_adapter: PayTRAdapter,
        metrics: PrometheusMetrics
    ):
        self.payment_repo = payment_repo
        self.iyzico = iyzico_adapter
        self.paytr = paytr_adapter
        self.metrics = metrics
    
    async def run(self):
        """
        Cron job: runs every 10 minutes
        
        1. Query stuck payments (PENDING_3DS, INITIATED) older than 15 min
        2. For each payment, query provider status
        3. Update payment and order status if final
        4. Alert if stuck > 60 minutes
        """
        cutoff_time = datetime.utcnow() - timedelta(minutes=15)
        alert_time = datetime.utcnow() - timedelta(minutes=60)
        
        stuck_payments = await self.payment_repo.find({
            "status": {"$in": ["PENDING_3DS", "INITIATED"]},
            "createdAt": {"$lt": cutoff_time}
        })
        
        for payment in stuck_payments:
            try:
                if payment.provider == "iyzico":
                    status = await self.iyzico.query_payment_status(
                        payment.providerRefs.iyzico.paymentId
                    )
                elif payment.provider == "paytr":
                    # PayTR doesn't have status query API
                    # Alert and manual investigation required
                    if payment.createdAt < alert_time:
                        await self._alert_stuck_payment(payment)
                    continue
                
                if status["status"] in ["success", "failure"]:
                    await self._update_payment_status(payment, status)
                    self.metrics.reconciliation_recovered_total.labels(
                        provider=payment.provider,
                        status=status["status"]
                    ).inc()
                
            except Exception as e:
                logger.error(
                    f"Reconciliation failed for payment {payment.id}: {e}",
                    extra={"traceId": payment.id}
                )
    
    async def _update_payment_status(self, payment: Payment, status: dict):
        """Update payment and order status in transaction"""
        async with await self.payment_repo.db.start_session() as session:
            async with session.start_transaction():
                new_status = "AUTHORIZED" if status["status"] == "success" else "FAILED"
                
                await self.payment_repo.update_one(
                    {"id": payment.id},
                    {"$set": {"status": new_status, "updatedAt": datetime.utcnow()}},
                    session=session
                )
                
                if new_status == "AUTHORIZED":
                    await self.payment_repo.db.orders.update_one(
                        {"id": payment.orderId},
                        {"$set": {"status": "PAID", "updatedAt": datetime.utcnow()}},
                        session=session
                    )
    
    async def _alert_stuck_payment(self, payment: Payment):
        """Send alert for payment stuck > 60 minutes"""
        self.metrics.reconciliation_stuck_total.labels(
            provider=payment.provider
        ).inc()
        
        logger.error(
            f"Payment stuck for > 60 minutes: {payment.id}",
            extra={
                "paymentId": payment.id,
                "orderId": payment.orderId,
                "provider": payment.provider,
                "status": payment.status,
                "createdAt": payment.createdAt.isoformat()
            }
        )
```

## API Endpoints

### 1. POST /api/v1/payments/iyzico/initialize

**Request:**
```json
{
  "orderId": "ord_123",
  "amount": 10000,
  "currency": "TRY",
  "customer": {
    "id": "user_123",
    "name": "John Doe",
    "surname": "Doe",
    "email": "john@example.com",
    "identityNumber": "11111111111",
    "gsmNumber": "+905551234567",
    "registrationAddress": "...",
    "city": "Istanbul",
    "country": "Turkey",
    "ip": "85.34.78.112"
  },
  "card": {
    "cardHolderName": "John Doe",
    "cardNumber": "5528790000000008",
    "expireMonth": "12",
    "expireYear": "2030",
    "cvc": "123"
  }
}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Idempotency-Key: <uuid>
```

**Response (200 OK):**
```json
{
  "paymentId": "pay_abc123",
  "status": "PENDING_3DS",
  "htmlContent": "<html>...</html>",
  "provider": "iyzico"
}
```

### 2. POST /api/v1/webhooks/iyzico

**Request (from iyzico):**
```json
{
  "status": "success",
  "paymentId": "12345678",
  "conversationId": "pay_abc123",
  "mdStatus": "1",
  "eci": "05",
  "cavv": "...",
  "threeDSVersion": "2.2.0"
}
```

**Response:**
```
200 OK
```

### 3. POST /api/v1/payments/paytr/initialize

**Request:**
```json
{
  "orderId": "ord_123",
  "amount": 10000,
  "currency": "TRY",
  "customer": {
    "email": "john@example.com",
    "name": "John Doe",
    "phone": "+905551234567",
    "address": "..."
  },
  "userIp": "85.34.78.112"
}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Idempotency-Key: <uuid>
```

**Response (200 OK):**
```json
{
  "paymentId": "pay_xyz789",
  "status": "INITIATED",
  "provider": "paytr",
  "formParams": {
    "merchant_id": "123456",
    "merchant_oid": "pay_xyz789",
    "email": "john@example.com",
    "payment_amount": "10000",
    "user_basket": "W3sibmFtZSI6Ik9yZGVyIG9yZF8xMjMiLCJwcmljZSI6IjEwMDAwIiwicXVhbnRpdHkiOiIxIn1d",
    "no_installment": "0",
    "max_installment": "0",
    "currency": "TL",
    "test_mode": "1",
    "user_ip": "85.34.78.112",
    "merchant_ok_url": "https://vorte.com/payment/success",
    "merchant_fail_url": "https://vorte.com/payment/failure",
    "timeout_limit": "30",
    "lang": "tr",
    "paytr_token": "...",
    "post_url": "https://www.paytr.com/odeme/guvenli/..."
  }
}
```

### 4. POST /api/v1/callbacks/paytr

**Request (from PayTR):**
```
merchant_oid=pay_xyz789&status=success&total_amount=10000&hash=...
```

**Response:**
```
200 OK
OK
```

**CRITICAL**: Response body MUST be exactly "OK" or PayTR keeps transaction in "Devam Ediyor" status.

### 5. GET /api/v1/orders/{orderId}/payment

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "paymentId": "pay_abc123",
  "orderId": "ord_123",
  "provider": "iyzico",
  "status": "AUTHORIZED",
  "amount": 10000,
  "currency": "TRY",
  "threeDS": {
    "version": "2.2.0",
    "status": "Y",
    "eci": "05"
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:31:00Z"
}
```



## Error Handling

### Error Response Format (RFC 9457)

```json
{
  "type": "https://api.vorte.com/errors/payment-failed",
  "title": "Payment Failed",
  "status": 422,
  "detail": "3D Secure authentication failed",
  "instance": "/api/v1/payments/iyzico/initialize",
  "traceId": "abc123-def456",
  "provider": "iyzico",
  "providerCode": "3DS_AUTH_FAILED"
}
```

### Error Codes

| Code | HTTP Status | Description | Retry |
|------|-------------|-------------|-------|
| IDEMPOTENCY_KEY_REQUIRED | 428 | Idempotency-Key header missing | No |
| ORDER_NOT_FOUND | 404 | Order does not exist | No |
| ORDER_ALREADY_PAID | 409 | Order already has successful payment | No |
| PAYMENT_PROVIDER_TIMEOUT | 504 | Provider API timeout (>30s) | Yes |
| PAYMENT_PROVIDER_ERROR | 502 | Provider returned 5xx | Yes |
| PAYMENT_3DS_FAILED | 422 | 3DS authentication failed | No |
| PAYMENT_INSUFFICIENT_FUNDS | 422 | Card has insufficient funds | No |
| PAYMENT_CARD_DECLINED | 422 | Card declined by issuer | No |
| WEBHOOK_VALIDATION_FAILED | 400 | Webhook signature invalid | No |
| CALLBACK_HASH_MISMATCH | 400 | PayTR callback hash invalid | No |
| PAYMENT_NOT_REFUNDABLE | 422 | Payment cannot be refunded | No |

### Retry Strategy

```python
class RetryStrategy:
    MAX_RETRIES = 3
    BACKOFF_SECONDS = [1, 2, 4]  # Exponential backoff
    RETRYABLE_CODES = [429, 500, 502, 503, 504]  # Transient errors
    NON_RETRYABLE_CODES = [400, 401, 403, 404, 422]  # Client errors
    TIMEOUT_SECONDS = 30  # Provider API timeout
    
    async def execute_with_retry(self, func, *args, **kwargs):
        for attempt in range(self.MAX_RETRIES):
            try:
                return await func(*args, **kwargs, timeout=self.TIMEOUT_SECONDS)
            except HTTPException as e:
                # Don't retry client errors (4xx except 429)
                if e.status_code in self.NON_RETRYABLE_CODES:
                    raise
                
                # Retry transient errors (429, 5xx)
                if e.status_code not in self.RETRYABLE_CODES:
                    raise
                
                if attempt == self.MAX_RETRIES - 1:
                    raise
                
                await asyncio.sleep(self.BACKOFF_SECONDS[attempt])
                logger.warning(
                    f"Retry attempt {attempt + 1} for {func.__name__}",
                    extra={"statusCode": e.status_code, "attempt": attempt + 1}
                )
```

### Circuit Breaker

```python
class CircuitBreaker:
    def __init__(self, failure_threshold: int = 10, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    async def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if datetime.utcnow() - self.last_failure_time > timedelta(seconds=self.timeout):
                self.state = "HALF_OPEN"
            else:
                raise ServiceUnavailableError("Circuit breaker is OPEN")
        
        try:
            result = await func(*args, **kwargs)
            
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
            
            return result
            
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = datetime.utcnow()
            
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
                metrics.provider_circuit_open_total.labels(
                    provider=func.__self__.provider_name
                ).inc()
            
            raise
```

## Testing Strategy

### 1. Unit Tests

```python
# Test iyzico signature generation
def test_iyzico_signature():
    adapter = IyzicoAdapter(api_key="test", secret_key="test", base_url="...")
    signature = adapter._generate_signature('{"test": "data"}')
    assert signature.startswith("IYZWSv2 test:")

# Test PayTR hash validation
def test_paytr_hash_validation():
    adapter = PayTRAdapter(
        merchant_id="123",
        merchant_key="key",
        merchant_salt="salt",
        base_url="..."
    )
    
    valid = adapter.validate_callback_hash(
        merchant_oid="pay_123",
        status="success",
        total_amount="10000",
        hash_value="<expected_hash>"
    )
    assert valid is True

# Test payment status state machine
def test_payment_status_transitions():
    orchestrator = PaymentOrchestrator(...)
    
    # Valid transition
    orchestrator.transition_status("pay_123", "PENDING_3DS")
    orchestrator.transition_status("pay_123", "AUTHORIZED")
    
    # Invalid transition
    with pytest.raises(InvalidStatusTransitionError):
        orchestrator.transition_status("pay_123", "INITIATED")
```

### 2. Integration Tests

```python
# Test iyzico 3DS flow with sandbox
@pytest.mark.integration
async def test_iyzico_3ds_flow():
    # 1. Initialize payment
    response = await client.post(
        "/api/v1/payments/iyzico/initialize",
        headers={"Idempotency-Key": str(uuid.uuid4())},
        json={
            "orderId": "ord_test_123",
            "amount": 10000,
            "currency": "TRY",
            "customer": {...},
            "card": {
                "cardNumber": "5528790000000008",  # iyzico test card
                "expireMonth": "12",
                "expireYear": "2030",
                "cvc": "123"
            }
        }
    )
    
    assert response.status_code == 200
    assert "htmlContent" in response.json()
    
    # 2. Simulate webhook
    webhook_response = await client.post(
        "/api/v1/webhooks/iyzico",
        json={
            "status": "success",
            "conversationId": response.json()["paymentId"],
            "mdStatus": "1"
        }
    )
    
    assert webhook_response.status_code == 200
    
    # 3. Verify payment status
    payment = await payment_repo.find_one({"id": response.json()["paymentId"]})
    assert payment.status == "AUTHORIZED"

# Test PayTR callback hash validation
@pytest.mark.integration
async def test_paytr_callback_validation():
    # 1. Initialize payment
    response = await client.post(
        "/api/v1/payments/paytr/initialize",
        headers={"Idempotency-Key": str(uuid.uuid4())},
        json={
            "orderId": "ord_test_456",
            "amount": 10000,
            "currency": "TRY",
            "customer": {...},
            "userIp": "85.34.78.112"
        }
    )
    
    payment_id = response.json()["paymentId"]
    
    # 2. Calculate valid hash
    hash_value = calculate_paytr_hash(
        merchant_oid=payment_id,
        status="success",
        total_amount="10000"
    )
    
    # 3. Send callback
    callback_response = await client.post(
        "/api/v1/callbacks/paytr",
        data={
            "merchant_oid": payment_id,
            "status": "success",
            "total_amount": "10000",
            "hash": hash_value
        }
    )
    
    assert callback_response.status_code == 200
    assert callback_response.text == "OK"
```

### 3. Test Cards

**iyzico Sandbox:**
- Success: 5528790000000008
- 3DS Challenge: 5528790000000016
- Failure: 5528790000000024

**PayTR Test Mode:**
- Use test_mode=1 parameter
- Any card number works in test mode
- 3DS page shows test interface

### 4. Chaos Testing

```python
# Test webhook deduplication
async def test_webhook_deduplication():
    event_id = "evt_123"
    
    # Send same webhook 3 times
    for _ in range(3):
        await client.post("/api/v1/webhooks/iyzico", json={
            "eventId": event_id,
            "status": "success",
            "conversationId": "pay_123"
        })
    
    # Verify only 1 event stored
    events = await event_store.find({"externalEventId": event_id})
    assert len(events) == 1

# Test reconciliation worker
async def test_reconciliation_recovery():
    # Create stuck payment
    payment = await payment_repo.create({
        "status": "PENDING_3DS",
        "createdAt": datetime.utcnow() - timedelta(minutes=20)
    })
    
    # Run reconciliation
    await reconciliation_worker.run()
    
    # Verify payment recovered
    updated_payment = await payment_repo.find_one({"id": payment.id})
    assert updated_payment.status in ["AUTHORIZED", "FAILED"]
```

## Observability

### Prometheus Metrics

```python
# Payment metrics
payment_initiated_total = Counter(
    'payment_initiated_total',
    'Total payment initializations',
    ['provider', 'result']
)

payment_authorized_total = Counter(
    'payment_authorized_total',
    'Total successful authorizations',
    ['provider']
)

payment_failed_total = Counter(
    'payment_failed_total',
    'Total payment failures',
    ['provider', 'reason']
)

# Webhook metrics
webhook_received_total = Counter(
    'webhook_received_total',
    'Total webhooks received',
    ['provider', 'event_type']
)

webhook_duplicate_total = Counter(
    'webhook_duplicate_total',
    'Total duplicate webhooks',
    ['provider']
)

callback_hash_failed_total = Counter(
    'callback_hash_failed_total',
    'Total callback hash validation failures',
    ['provider']
)

# Reconciliation metrics
reconciliation_recovered_total = Counter(
    'reconciliation_recovered_total',
    'Total payments recovered by reconciliation',
    ['provider', 'status']
)

reconciliation_stuck_total = Counter(
    'reconciliation_stuck_total',
    'Total payments stuck > 60 minutes',
    ['provider']
)

# Circuit breaker metrics
provider_circuit_open_total = Counter(
    'provider_circuit_open_total',
    'Total circuit breaker opens',
    ['provider']
)
```

### Alerts

```yaml
# Alert: High payment failure rate
- alert: HighPaymentFailureRate
  expr: |
    sum(rate(payment_failed_total[15m])) / 
    sum(rate(payment_initiated_total[15m])) > 0.05
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Payment failure rate > 5%"

# Alert: Webhook not received
- alert: WebhookNotReceived
  expr: |
    sum(increase(webhook_received_total[30m])) == 0
  for: 30m
  labels:
    severity: critical
  annotations:
    summary: "No webhooks received in 30 minutes"

# Alert: Callback hash failures
- alert: CallbackHashFailures
  expr: |
    sum(increase(callback_hash_failed_total[5m])) > 3
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Multiple callback hash validation failures"

# Alert: Stuck payments
- alert: StuckPayments
  expr: |
    sum(reconciliation_stuck_total) > 0
  for: 1m
  labels:
    severity: warning
  annotations:
    summary: "Payments stuck for > 60 minutes"
```

### Structured Logging

```python
logger.info(
    "Payment initialized",
    extra={
        "traceId": trace_id,
        "paymentId": payment.id,
        "orderId": payment.orderId,
        "provider": payment.provider,
        "amount": payment.amount,
        "currency": payment.currency,
        "userId": user.id
    }
)

logger.error(
    "Payment failed",
    extra={
        "traceId": trace_id,
        "paymentId": payment.id,
        "provider": payment.provider,
        "errorCode": "PAYMENT_3DS_FAILED",
        "providerResponse": mask_pii(response)
    }
)
```

## Security Considerations

### 1. PII Masking

```python
def mask_card_number(card_number: str) -> str:
    """Show only first 6 and last 4 digits"""
    return f"{card_number[:6]}******{card_number[-4:]}"

def mask_email(email: str) -> str:
    """Mask middle part of email"""
    parts = email.split("@")
    name = parts[0]
    return f"{name[:2]}***{name[-2:]}@{parts[1]}"
```

### 2. IP Allowlist

```python
# Nginx configuration
location /api/v1/webhooks/iyzico {
    allow 185.56.137.0/24;  # iyzico webhook IPs
    deny all;
    
    proxy_pass http://api:8000;
}

location /api/v1/callbacks/paytr {
    allow 185.86.137.0/24;  # PayTR callback IPs
    deny all;
    
    proxy_pass http://api:8000;
}
```

### 3. Rate Limiting

```python
# Webhook endpoints: 100 req/min per IP
@app.post("/api/v1/webhooks/iyzico")
@limiter.limit("100/minute")
async def iyzico_webhook(request: Request):
    pass
```

### 4. HTTPS Enforcement

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.vorte.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS with HSTS
server {
    listen 443 ssl http2;
    server_name api.vorte.com;
    
    ssl_certificate /etc/ssl/certs/vorte.crt;
    ssl_certificate_key /etc/ssl/private/vorte.key;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

## Deployment Considerations

### Environment Variables

```bash
# iyzico
IYZICO_API_KEY=sandbox-xxx
IYZICO_SECRET_KEY=sandbox-yyy
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com

# PayTR
PAYTR_MERCHANT_ID=123456
PAYTR_MERCHANT_KEY=xxx
PAYTR_MERCHANT_SALT=yyy
PAYTR_BASE_URL=https://www.paytr.com

# Application
API_BASE_URL=https://api.vorte.com
FRONTEND_URL=https://vorte.com
ENVIRONMENT=production
```

### Database Migrations

```javascript
// Create payments collection with indexes
db.createCollection("payments");
db.payments.createIndex({ orderId: 1 });
db.payments.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
db.payments.createIndex({ status: 1, createdAt: 1 });
db.payments.createIndex({ "providerRefs.iyzico.paymentId": 1 }, { sparse: true });
db.payments.createIndex({ "providerRefs.paytr.merchant_oid": 1 }, { sparse: true });

// Create payment_events collection with deduplication index
db.createCollection("payment_events");
db.payment_events.createIndex({ paymentId: 1, createdAt: -1 });
db.payment_events.createIndex(
    { externalEventId: 1, provider: 1 },
    { unique: true }
);
```

### Cron Job Setup

```yaml
# Kubernetes CronJob for reconciliation worker
apiVersion: batch/v1
kind: CronJob
metadata:
  name: payment-reconciliation
spec:
  schedule: "*/10 * * * *"  # Every 10 minutes
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: reconciliation
            image: vorte/api:latest
            command: ["python", "-m", "workers.reconciliation"]
            env:
            - name: MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: mongodb
                  key: uri
```

## Summary

This design provides a production-ready payment integration with:

1. **Dual Provider Support**: iyzico (3DS2 with webhook) and PayTR (Direct API with callback)
2. **Idempotency**: 24-hour replay window prevents double charges
3. **Event Sourcing**: All webhooks/callbacks stored with deduplication
4. **Reconciliation**: Background worker recovers stuck payments
5. **Security**: PII masking, HTTPS, IP allowlist, hash validation
6. **Observability**: Comprehensive metrics, alerts, and structured logging
7. **Error Handling**: Retry logic, circuit breaker, RFC 9457 responses
8. **Testing**: Unit, integration, and chaos tests with sandbox support

The architecture integrates seamlessly with existing VORTE platform (FastAPI + MongoDB + Redis) and follows established patterns for ETag/If-Match, idempotency, and transactional integrity.
