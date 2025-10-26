# Task 17 - Payment Flow Notification Triggers

**Implementation Plan** - Transactional Outbox Pattern for reliable email/SMS notifications

## Overview

Integrate email and SMS notifications into payment flow using Transactional Outbox pattern to ensure reliable delivery without blocking payment processing.

## Architecture: Transactional Outbox Pattern

**Why Outbox Pattern?**
- Ensures atomicity: Payment state change + notification enqueue in same transaction
- Prevents "payment completed but notification not sent" inconsistencies
- Decouples notification sending from payment processing
- Enables retry logic with exponential backoff
- Provides audit trail and observability

**Refs:**
- [Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [Stripe Idempotency](https://stripe.com/docs/api/idempotent_requests)

## 1. Notifications Outbox Collection

### Schema

```javascript
// notifications_outbox collection
{
  "_id": ObjectId("..."),
  "eventType": "PaymentAuthorized" | "PaymentFailed" | "RefundIssued",
  "paymentId": "PAY-123",
  "orderId": "ORD-123",
  "provider": "iyzico" | "paytr",
  "locale": "tr" | "en",
  "channels": ["email", "sms"],
  "payload": {
    // Template context
    "email": "customer@example.com",
    "phone": "905321234567",
    "order_id": "ORD-123",
    "amount": "250,00 TL",
    "brand_name": "Vorte",
    // ... other template variables
  },
  "status": "ENQUEUED" | "SENDING" | "SENT" | "FAILED" | "DEAD",
  "attempts": 0,
  "nextAttemptAt": ISODate("2025-01-01T10:00:00Z"),
  "lastError": null,
  "errors": [
    {
      "timestamp": ISODate("..."),
      "message": "...",
      "errorClass": "..."
    }
  ],
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("..."),
  "sentAt": null,
  "idempotencyKey": "PaymentAuthorized:PAY-123:1"
}
```

### Indexes

```javascript
// migrations/005_notifications_outbox.js

db.notifications_outbox.createIndex(
  { "idempotencyKey": 1 },
  { unique: true, name: "idx_idempotency_key" }
);

db.notifications_outbox.createIndex(
  { "status": 1, "nextAttemptAt": 1 },
  { name: "idx_status_next_attempt" }
);

db.notifications_outbox.createIndex(
  { "paymentId": 1, "eventType": 1 },
  { name: "idx_payment_event" }
);

db.notifications_outbox.createIndex(
  { "orderId": 1 },
  { name: "idx_order" }
);

// TTL index: Delete SENT notifications after 14 days
db.notifications_outbox.createIndex(
  { "sentAt": 1 },
  { 
    expireAfterSeconds: 1209600,  // 14 days
    partialFilterExpression: { "status": "SENT" },
    name: "idx_ttl_sent"
  }
);
```

## 2. PaymentOrchestrator Integration

### Trigger Points

**AUTHORIZED:**
- Email: order_confirmation
- SMS: payment_authorized

**FAILED:**
- Email: payment_failed
- SMS: payment_failed (optional)

**REFUNDED:**
- Email: refund_issued
- SMS: refund_issued

### Implementation

```python
# apps/backend/app/services/payment_orchestrator.py

async def process_webhook(self, webhook_data: dict) -> dict:
    """Process payment webhook with notification outbox."""
    
    # ... existing webhook processing ...
    
    # Start MongoDB transaction
    async with self.mongo_client.start_session() as session:
        async with session.start_transaction():
            # Update payment status
            await self.payment_repo.transition_status(
                payment_id=payment.id,
                from_status=current_status,
                to_status=new_status,
                session=session,
            )
            
            # Enqueue notification in same transaction
            if new_status == PaymentStatus.AUTHORIZED:
                await self._enqueue_notification(
                    event_type="PaymentAuthorized",
                    payment=payment,
                    order=order,
                    channels=["email", "sms"],
                    session=session,
                )
            
            elif new_status == PaymentStatus.FAILED:
                await self._enqueue_notification(
                    event_type="PaymentFailed",
                    payment=payment,
                    order=order,
                    channels=["email", "sms"],
                    session=session,
                )
    
    return {"status": "processed"}

async def _enqueue_notification(
    self,
    *,
    event_type: str,
    payment: Payment,
    order: Order,
    channels: list[str],
    session,
) -> None:
    """Enqueue notification in outbox."""
    
    # Build template context
    payload = {
        "email": order.customer.email,
        "phone": order.customer.phone,
        "order_id": order.id,
        "amount": format_currency(payment.amount, payment.currency),
        "brand_name": "Vorte",
        "customer_name": order.customer.first_name,
        # ... other template variables
    }
    
    # Generate idempotency key
    idempotency_key = f"{event_type}:{payment.id}:{payment.status_version}"
    
    # Insert into outbox
    try:
        await self.db.notifications_outbox.insert_one(
            {
                "eventType": event_type,
                "paymentId": payment.id,
                "orderId": order.id,
                "provider": payment.provider,
                "locale": order.customer.locale or "tr",
                "channels": channels,
                "payload": payload,
                "status": "ENQUEUED",
                "attempts": 0,
                "nextAttemptAt": datetime.now(timezone.utc),
                "lastError": None,
                "errors": [],
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc),
                "sentAt": None,
                "idempotencyKey": idempotency_key,
            },
            session=session,
        )
        
        logger.info(
            f"Notification enqueued",
            extra={
                "event_type": event_type,
                "payment_id": payment.id,
                "order_id": order.id,
                "channels": channels,
            }
        )
    
    except DuplicateKeyError:
        # Idempotency: Already enqueued
        logger.debug(
            f"Notification already enqueued (idempotent)",
            extra={"idempotency_key": idempotency_key}
        )
```

## 3. Notifications Dispatcher Worker

### Worker Implementation

```python
# apps/backend/app/workers/notifications_dispatcher.py
"""
Notifications Dispatcher Worker.

Polls notifications_outbox for ENQUEUED notifications and dispatches them.
Implements retry logic with exponential backoff.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument

from app.services.notification_service import NotificationService


logger = logging.getLogger(__name__)


class NotificationsDispatcher:
    """Notifications dispatcher worker."""
    
    def __init__(
        self,
        mongo_client: AsyncIOMotorClient,
        notification_service: NotificationService,
        poll_interval: int = 5,
        max_attempts: int = 10,
    ):
        self.mongo_client = mongo_client
        self.db = mongo_client.get_database()
        self.notification_service = notification_service
        self.poll_interval = poll_interval
        self.max_attempts = max_attempts
    
    async def run(self):
        """Run dispatcher loop."""
        logger.info("Notifications dispatcher started")
        
        while True:
            try:
                await self._process_batch()
            except Exception as exc:
                logger.error(
                    f"Dispatcher error",
                    extra={"error": str(exc)},
                    exc_info=True,
                )
            
            await asyncio.sleep(self.poll_interval)
    
    async def _process_batch(self):
        """Process batch of notifications."""
        now = datetime.now(timezone.utc)
        
        # Find and lock notification
        notification = await self.db.notifications_outbox.find_one_and_update(
            {
                "status": "ENQUEUED",
                "nextAttemptAt": {"$lte": now},
            },
            {
                "$set": {
                    "status": "SENDING",
                    "updatedAt": now,
                }
            },
            sort=[("createdAt", 1)],
            return_document=ReturnDocument.AFTER,
        )
        
        if not notification:
            return
        
        try:
            await self._dispatch_notification(notification)
            
            # Mark as sent
            await self.db.notifications_outbox.update_one(
                {"_id": notification["_id"]},
                {
                    "$set": {
                        "status": "SENT",
                        "sentAt": now,
                        "updatedAt": now,
                    }
                }
            )
            
            logger.info(
                f"Notification sent",
                extra={
                    "notification_id": str(notification["_id"]),
                    "event_type": notification["eventType"],
                    "channels": notification["channels"],
                }
            )
        
        except Exception as exc:
            await self._handle_error(notification, exc)
    
    async def _dispatch_notification(self, notification: dict):
        """Dispatch notification to channels."""
        event_type = notification["eventType"]
        locale = notification["locale"]
        payload = notification["payload"]
        channels = notification["channels"]
        
        # Map event type to template
        template_map = {
            "PaymentAuthorized": {
                "email": "order_confirmation",
                "sms": "payment_authorized",
            },
            "PaymentFailed": {
                "email": "payment_failed",
                "sms": "payment_failed",
            },
            "RefundIssued": {
                "email": "refund_issued",
                "sms": "refund_issued",
            },
        }
        
        templates = template_map.get(event_type, {})
        
        # Send email
        if "email" in channels and payload.get("email"):
            await self.notification_service.send_templated_email(
                template=templates.get("email"),
                locale=locale,
                to=payload["email"],
                context=payload,
            )
        
        # Send SMS
        if "sms" in channels and payload.get("phone"):
            await self.notification_service.send_sms_templated(
                template=templates.get("sms"),
                locale=locale,
                to=[payload["phone"]],
                context=payload,
                is_commercial=False,
            )
    
    async def _handle_error(self, notification: dict, error: Exception):
        """Handle notification error with retry logic."""
        now = datetime.now(timezone.utc)
        attempts = notification["attempts"] + 1
        
        # Check if retryable
        is_retryable = self._is_retryable_error(error)
        
        # Check max attempts
        if attempts >= self.max_attempts or not is_retryable:
            # Move to DEAD
            await self.db.notifications_outbox.update_one(
                {"_id": notification["_id"]},
                {
                    "$set": {
                        "status": "DEAD",
                        "lastError": str(error),
                        "updatedAt": now,
                    },
                    "$push": {
                        "errors": {
                            "timestamp": now,
                            "message": str(error),
                            "errorClass": type(error).__name__,
                        }
                    }
                }
            )
            
            logger.error(
                f"Notification moved to DEAD",
                extra={
                    "notification_id": str(notification["_id"]),
                    "attempts": attempts,
                    "error": str(error),
                }
            )
        else:
            # Retry with exponential backoff
            backoff = self._compute_backoff(attempts)
            next_attempt = now + backoff
            
            await self.db.notifications_outbox.update_one(
                {"_id": notification["_id"]},
                {
                    "$set": {
                        "status": "ENQUEUED",
                        "attempts": attempts,
                        "nextAttemptAt": next_attempt,
                        "lastError": str(error),
                        "updatedAt": now,
                    },
                    "$push": {
                        "errors": {
                            "timestamp": now,
                            "message": str(error),
                            "errorClass": type(error).__name__,
                        }
                    }
                }
            )
            
            logger.warning(
                f"Notification retry scheduled",
                extra={
                    "notification_id": str(notification["_id"]),
                    "attempts": attempts,
                    "next_attempt": next_attempt.isoformat(),
                    "error": str(error),
                }
            )
    
    def _is_retryable_error(self, error: Exception) -> bool:
        """Check if error is retryable."""
        error_text = str(error).lower()
        
        # Retryable errors
        retryable_patterns = [
            "429",
            "rate limit",
            "5xx",
            "timeout",
            "circuit",
            "connection",
            "network",
        ]
        
        return any(pattern in error_text for pattern in retryable_patterns)
    
    def _compute_backoff(self, attempts: int) -> timedelta:
        """Compute exponential backoff."""
        # 30s, 2m, 10m, 30m, 2h, 6h, 12h, 24h
        delays = [30, 120, 600, 1800, 7200, 21600, 43200, 86400]
        
        if attempts <= len(delays):
            seconds = delays[attempts - 1]
        else:
            seconds = delays[-1]
        
        return timedelta(seconds=seconds)
```

## 4. Prometheus Metrics

```python
# apps/backend/app/services/metrics.py

# Outbox metrics
notifications_outbox_enqueued_total = Counter(
    "notifications_outbox_enqueued_total",
    "Total notifications enqueued",
    ["event_type", "channel"],
)

notifications_outbox_sent_total = Counter(
    "notifications_outbox_sent_total",
    "Total notifications sent",
    ["event_type", "channel", "provider"],
)

notifications_outbox_failed_total = Counter(
    "notifications_outbox_failed_total",
    "Total notifications failed",
    ["event_type", "channel", "error_class"],
)

notifications_outbox_retries_total = Counter(
    "notifications_outbox_retries_total",
    "Total notification retries",
    ["event_type", "channel"],
)

notifications_outbox_dead_total = Counter(
    "notifications_outbox_dead_total",
    "Total notifications moved to DEAD",
    ["event_type", "channel"],
)

# Dispatch metrics
notification_dispatch_latency_seconds = Histogram(
    "notification_dispatch_latency_seconds",
    "Notification dispatch latency",
    ["channel", "provider"],
)

notification_template_render_seconds = Histogram(
    "notification_template_render_seconds",
    "Template render latency",
    ["channel", "template"],
)
```

## 5. Prometheus Alerts

```yaml
# infra/monitoring/prometheus-alerts.yml

groups:
  - name: notifications
    interval: 30s
    rules:
      # Dead notifications alert
      - alert: NotificationsDeadHigh
        expr: rate(notifications_outbox_dead_total[10m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate of dead notifications"
          description: "{{ $value }} notifications/sec moved to DEAD status"
      
      # Stuck pipeline alert
      - alert: NotificationsPipelineStuck
        expr: |
          rate(notifications_outbox_enqueued_total[10m]) > 0
          and
          rate(notifications_outbox_sent_total[10m]) == 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Notifications pipeline stuck"
          description: "Notifications being enqueued but none sent in 10m"
      
      # High latency alert
      - alert: NotificationDispatchLatencyHigh
        expr: |
          histogram_quantile(0.95,
            sum(rate(notification_dispatch_latency_seconds_bucket[5m])) by (le)
          ) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High notification dispatch latency"
          description: "P95 dispatch latency is {{ $value }}s"
```

## 6. Deployment

### Docker Compose

```yaml
# docker-compose.yml

services:
  notifications-dispatcher:
    build: ./apps/backend
    command: python -m app.workers.notifications_dispatcher
    environment:
      - MONGO_URI=mongodb://mongo:27017/vorte
      - NETGSM_USERNAME=${NETGSM_USERNAME}
      - NETGSM_PASSWORD=${NETGSM_PASSWORD}
      - VERIMOR_USERNAME=${VERIMOR_USERNAME}
      - VERIMOR_PASSWORD=${VERIMOR_PASSWORD}
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
    depends_on:
      - mongo
    restart: unless-stopped
```

### Kubernetes

```yaml
# infra/k8s/notifications-dispatcher.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: notifications-dispatcher
spec:
  replicas: 2
  selector:
    matchLabels:
      app: notifications-dispatcher
  template:
    metadata:
      labels:
        app: notifications-dispatcher
    spec:
      containers:
      - name: dispatcher
        image: vorte-backend:latest
        command: ["python", "-m", "app.workers.notifications_dispatcher"]
        env:
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: mongo-credentials
              key: uri
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## 7. Testing

### Unit Tests

```python
# apps/backend/tests/test_notifications_outbox.py

@pytest.mark.asyncio
async def test_enqueue_notification_idempotent():
    """Test notification enqueue is idempotent."""
    # Enqueue twice with same idempotency key
    # Second should be no-op
    pass

@pytest.mark.asyncio
async def test_dispatcher_retries_on_failure():
    """Test dispatcher retries on retryable error."""
    pass

@pytest.mark.asyncio
async def test_dispatcher_moves_to_dead_on_max_attempts():
    """Test dispatcher moves to DEAD after max attempts."""
    pass
```

### E2E Test

```python
# apps/backend/tests/test_e2e_notifications.py

@pytest.mark.asyncio
async def test_payment_authorized_triggers_notifications():
    """Test payment authorization triggers email and SMS."""
    # 1. Initialize payment
    # 2. Process webhook (AUTHORIZED)
    # 3. Verify outbox entry created
    # 4. Run dispatcher
    # 5. Verify email and SMS sent
    # 6. Verify outbox status = SENT
    pass
```

## 8. Runbook

### Replay Failed Notifications

```python
# scripts/replay_notifications.py

async def replay_dead_notifications(payment_id: str):
    """Replay DEAD notifications for a payment."""
    notifications = await db.notifications_outbox.find({
        "paymentId": payment_id,
        "status": "DEAD",
    }).to_list(None)
    
    for notif in notifications:
        await db.notifications_outbox.update_one(
            {"_id": notif["_id"]},
            {
                "$set": {
                    "status": "ENQUEUED",
                    "attempts": 0,
                    "nextAttemptAt": datetime.now(timezone.utc),
                }
            }
        )
```

## Implementation Checklist

- [ ] Create notifications_outbox collection + indexes
- [ ] Update PaymentOrchestrator with _enqueue_notification()
- [ ] Implement NotificationsDispatcher worker
- [ ] Add Prometheus metrics
- [ ] Add Prometheus alerts
- [ ] Create Docker Compose config
- [ ] Create Kubernetes deployment
- [ ] Write unit tests
- [ ] Write E2E test
- [ ] Create runbook
- [ ] Update documentation

## References

- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [Stripe Idempotency](https://stripe.com/docs/api/idempotent_requests)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- [MongoDB Transactions](https://www.mongodb.com/docs/manual/core/transactions/)

---

**Status**: Ready for implementation
**Estimated Time**: 6-8 hours
**Priority**: High
