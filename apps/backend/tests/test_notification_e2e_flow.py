# apps/backend/tests/test_notification_e2e_flow.py
"""
End-to-End tests for notification system.

Tests complete flow:
1. Payment status change → Outbox enqueue
2. Dispatcher polls → Claims notification
3. Provider sends → Notification marked SENT
4. TTL and expireAt set correctly
5. Metrics recorded

Uses respx for HTTP mocking (SendGrid, Netgsm, etc.)
"""
import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch
from bson import ObjectId
import respx
import httpx

from app.services.payment_orchestrator import PaymentOrchestrator
from app.workers.notification_dispatcher import NotificationDispatcher
from app.repositories.notification_outbox_repository import NotificationOutboxRepository
from app.repositories.payment_repository import PaymentRepository
from app.services.notification_service import NotificationService
from app.services.adapters.sendgrid_adapter import SendGridAdapter
from app.services.adapters.netgsm_adapter import NetgsmAdapter


@pytest.fixture
async def payment_repo(mongo_client):
    """Create PaymentRepository with test database."""
    db = mongo_client.test_payments
    repo = PaymentRepository(db)
    
    # Clean up
    await db.payments.delete_many({})
    
    yield repo
    
    # Clean up
    await db.payments.delete_many({})


@pytest.fixture
async def outbox_repo(mongo_client):
    """Create NotificationOutboxRepository with test database."""
    db = mongo_client.test_notifications
    repo = NotificationOutboxRepository(db)
    
    # Clean up
    await db.notifications_outbox.delete_many({})
    
    yield repo
    
    # Clean up
    await db.notifications_outbox.delete_many({})


@pytest.fixture
def sendgrid_adapter():
    """Create SendGridAdapter with test API key."""
    return SendGridAdapter(api_key="test_api_key")


@pytest.fixture
def netgsm_adapter():
    """Create NetgsmAdapter with test credentials."""
    return NetgsmAdapter(
        username="test_user",
        password="test_pass",
        sender="TEST",
    )


@pytest.fixture
def notification_service(sendgrid_adapter):
    """Create NotificationService with mocked adapters."""
    return NotificationService(
        sendgrid=sendgrid_adapter,
        ses=None,  # Not testing SES in this flow
        sms_service=None,  # Test email only for simplicity
        primary="sendgrid",
    )


# ============================================================================
# E2E: Payment Success → Notification Flow
# ============================================================================

@pytest.mark.asyncio
@respx.mock
async def test_e2e_payment_success_notification_flow(
    payment_repo,
    outbox_repo,
    notification_service,
    mongo_client,
):
    """
    Test complete flow: Payment AUTHORIZED → Outbox enqueue → Dispatcher → SendGrid → SENT.
    """
    # Mock SendGrid API
    sendgrid_route = respx.post("https://api.eu.sendgrid.com/v3/mail/send").mock(
        return_value=httpx.Response(202, json={"message": "success"})
    )
    
    # 1) Create payment in INITIATED state
    payment_id = ObjectId()
    payment_doc = {
        "_id": payment_id,
        "orderId": "ord_123",
        "provider": "iyzico",
        "status": "INITIATED",
        "amount": 25000,
        "currency": "TRY",
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    await payment_repo.collection.insert_one(payment_doc)
    
    # 2) Simulate payment authorization (triggers notification enqueue)
    # In real code, this happens in PaymentOrchestrator.process_webhook
    notif_id = await outbox_repo.enqueue(
        event_type="payment_success",
        payment_id=str(payment_id),
        order_id="ord_123",
        provider="iyzico",
        locale="tr",
        channels=["email"],
        payload={
            "orderId": "ord_123",
            "amount": 25000,
            "currency": "TRY",
            "customerEmail": "customer@example.com",
        },
        idempotency_key=f"ord_123|payment_success",
    )
    
    assert notif_id is not None
    
    # 3) Verify notification in outbox
    notif_doc = await outbox_repo.collection.find_one({"_id": ObjectId(notif_id)})
    assert notif_doc["status"] == "ENQUEUED"
    assert notif_doc["attempts"] == 0
    
    # 4) Run dispatcher
    dispatcher = NotificationDispatcher(
        mongo=mongo_client,
        notification_service=notification_service,
        db_name="test_notifications",
    )
    
    stats = await dispatcher.run_once()
    
    # 5) Verify notification sent
    assert stats["sent"] == 1
    assert stats["retried"] == 0
    assert stats["dead"] == 0
    
    # 6) Verify SendGrid API called
    assert sendgrid_route.called
    assert sendgrid_route.call_count == 1
    
    # 7) Verify notification marked as SENT
    notif_doc = await outbox_repo.collection.find_one({"_id": ObjectId(notif_id)})
    assert notif_doc["status"] == "SENT"
    assert notif_doc["sentAt"] is not None
    
    # 8) Verify expireAt set (TTL for cleanup)
    assert "expireAt" in notif_doc
    expected_expire = datetime.now(timezone.utc) + timedelta(days=7)
    time_diff = abs((notif_doc["expireAt"] - expected_expire).total_seconds())
    assert time_diff < 60  # Within 1 minute tolerance


# ============================================================================
# E2E: Payment Failure → Notification Flow
# ============================================================================

@pytest.mark.asyncio
@respx.mock
async def test_e2e_payment_failure_notification_flow(
    outbox_repo,
    notification_service,
    mongo_client,
):
    """
    Test complete flow: Payment FAILED → Outbox enqueue → Dispatcher → SendGrid → SENT.
    """
    # Mock SendGrid API
    sendgrid_route = respx.post("https://api.eu.sendgrid.com/v3/mail/send").mock(
        return_value=httpx.Response(202, json={"message": "success"})
    )
    
    # 1) Enqueue payment failure notification
    notif_id = await outbox_repo.enqueue(
        event_type="payment_failed",
        payment_id="pay_456",
        order_id="ord_456",
        provider="paytr",
        locale="en",
        channels=["email"],
        payload={
            "orderId": "ord_456",
            "amount": 15000,
            "currency": "TRY",
            "failureReason": "Insufficient funds",
            "customerEmail": "customer@example.com",
        },
        idempotency_key=f"ord_456|payment_failed",
    )
    
    # 2) Run dispatcher
    dispatcher = NotificationDispatcher(
        mongo=mongo_client,
        notification_service=notification_service,
        db_name="test_notifications",
    )
    
    stats = await dispatcher.run_once()
    
    # 3) Verify sent
    assert stats["sent"] == 1
    assert sendgrid_route.called
    
    # 4) Verify notification status
    notif_doc = await outbox_repo.collection.find_one({"_id": ObjectId(notif_id)})
    assert notif_doc["status"] == "SENT"


# ============================================================================
# E2E: Retry Flow with Transient Failure
# ============================================================================

@pytest.mark.asyncio
@respx.mock
async def test_e2e_notification_retry_flow(
    outbox_repo,
    notification_service,
    mongo_client,
):
    """
    Test retry flow: SendGrid fails → Retry scheduled → Second attempt succeeds.
    """
    # Mock SendGrid to fail first, then succeed
    call_count = 0
    
    def sendgrid_response(request):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            # First call: fail with 503
            return httpx.Response(503, json={"error": "Service unavailable"})
        else:
            # Second call: succeed
            return httpx.Response(202, json={"message": "success"})
    
    sendgrid_route = respx.post("https://api.eu.sendgrid.com/v3/mail/send").mock(
        side_effect=sendgrid_response
    )
    
    # 1) Enqueue notification
    notif_id = await outbox_repo.enqueue(
        event_type="payment_success",
        payment_id="pay_789",
        order_id="ord_789",
        provider="iyzico",
        locale="tr",
        channels=["email"],
        payload={
            "orderId": "ord_789",
            "amount": 30000,
            "currency": "TRY",
            "customerEmail": "customer@example.com",
        },
        idempotency_key=f"ord_789|payment_success",
    )
    
    dispatcher = NotificationDispatcher(
        mongo=mongo_client,
        notification_service=notification_service,
        db_name="test_notifications",
    )
    
    # 2) First dispatch attempt (should fail and retry)
    stats1 = await dispatcher.run_once()
    assert stats1["retried"] == 1
    assert stats1["sent"] == 0
    
    # Verify notification back to ENQUEUED
    notif_doc = await outbox_repo.collection.find_one({"_id": ObjectId(notif_id)})
    assert notif_doc["status"] == "ENQUEUED"
    assert notif_doc["attempts"] == 1
    
    # 3) Update nextAttemptAt to now (simulate time passing)
    await outbox_repo.collection.update_one(
        {"_id": ObjectId(notif_id)},
        {"$set": {"nextAttemptAt": datetime.now(timezone.utc)}}
    )
    
    # 4) Second dispatch attempt (should succeed)
    stats2 = await dispatcher.run_once()
    assert stats2["sent"] == 1
    assert stats2["retried"] == 0
    
    # Verify notification SENT
    notif_doc = await outbox_repo.collection.find_one({"_id": ObjectId(notif_id)})
    assert notif_doc["status"] == "SENT"
    assert notif_doc["attempts"] == 1  # Attempts don't increment on success
    
    # Verify SendGrid called twice
    assert sendgrid_route.call_count == 2


# ============================================================================
# E2E: Dead Letter Flow
# ============================================================================

@pytest.mark.asyncio
@respx.mock
async def test_e2e_notification_dead_letter_flow(
    outbox_repo,
    notification_service,
    mongo_client,
):
    """
    Test dead letter flow: All retries fail → Notification moved to DEAD.
    """
    # Mock SendGrid to always fail
    sendgrid_route = respx.post("https://api.eu.sendgrid.com/v3/mail/send").mock(
        return_value=httpx.Response(500, json={"error": "Internal server error"})
    )
    
    # 1) Enqueue notification with max-1 attempts
    notif_id = ObjectId()
    notif_doc = {
        "_id": notif_id,
        "eventType": "payment_success",
        "paymentId": "pay_dead",
        "orderId": "ord_dead",
        "provider": "iyzico",
        "locale": "tr",
        "channels": ["email"],
        "payload": {
            "orderId": "ord_dead",
            "amount": 10000,
            "currency": "TRY",
            "customerEmail": "customer@example.com",
        },
        "status": "ENQUEUED",
        "attempts": 4,  # Max is 5, so next failure → DEAD
        "nextAttemptAt": datetime.now(timezone.utc),
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
        "idempotencyKey": "ord_dead|payment_success",
    }
    await outbox_repo.collection.insert_one(notif_doc)
    
    dispatcher = NotificationDispatcher(
        mongo=mongo_client,
        notification_service=notification_service,
        db_name="test_notifications",
    )
    
    # 2) Run dispatcher (should move to DEAD)
    stats = await dispatcher.run_once()
    assert stats["dead"] == 1
    assert stats["sent"] == 0
    assert stats["retried"] == 0
    
    # 3) Verify notification DEAD
    notif_doc = await outbox_repo.collection.find_one({"_id": notif_id})
    assert notif_doc["status"] == "DEAD"
    assert notif_doc["lastError"] is not None
    
    # 4) Verify SendGrid called
    assert sendgrid_route.called


# ============================================================================
# E2E: Idempotency
# ============================================================================

@pytest.mark.asyncio
async def test_e2e_notification_idempotency(outbox_repo):
    """
    Test idempotency: Duplicate payment events don't create duplicate notifications.
    """
    idempotency_key = "ord_idem|payment_success"
    
    # 1) First enqueue
    notif_id_1 = await outbox_repo.enqueue(
        event_type="payment_success",
        payment_id="pay_idem",
        order_id="ord_idem",
        provider="iyzico",
        locale="tr",
        channels=["email"],
        payload={"orderId": "ord_idem", "amount": 5000},
        idempotency_key=idempotency_key,
    )
    assert notif_id_1 is not None
    
    # 2) Second enqueue with same key (should be idempotent)
    notif_id_2 = await outbox_repo.enqueue(
        event_type="payment_success",
        payment_id="pay_idem",
        order_id="ord_idem",
        provider="iyzico",
        locale="tr",
        channels=["email"],
        payload={"orderId": "ord_idem", "amount": 5000},
        idempotency_key=idempotency_key,
    )
    assert notif_id_2 is None  # Returns None for duplicate
    
    # 3) Verify only one notification exists
    count = await outbox_repo.collection.count_documents({"idempotencyKey": idempotency_key})
    assert count == 1


# ============================================================================
# E2E: Metrics Verification
# ============================================================================

@pytest.mark.asyncio
@respx.mock
async def test_e2e_notification_metrics(
    outbox_repo,
    notification_service,
    mongo_client,
):
    """
    Test that metrics are recorded correctly during notification flow.
    """
    # Mock SendGrid
    sendgrid_route = respx.post("https://api.eu.sendgrid.com/v3/mail/send").mock(
        return_value=httpx.Response(202, json={"message": "success"})
    )
    
    # Enqueue notification
    await outbox_repo.enqueue(
        event_type="payment_success",
        payment_id="pay_metrics",
        order_id="ord_metrics",
        provider="iyzico",
        locale="tr",
        channels=["email"],
        payload={"orderId": "ord_metrics", "amount": 1000},
        idempotency_key="ord_metrics|payment_success",
    )
    
    # Mock metrics
    with patch("app.workers.notification_dispatcher.incr") as mock_incr:
        dispatcher = NotificationDispatcher(
            mongo=mongo_client,
            notification_service=notification_service,
            db_name="test_notifications",
        )
        
        # Run dispatcher
        await dispatcher.run_once()
        
        # Verify metrics called
        assert mock_incr.call_count >= 2
        
        # Check for specific metrics
        metric_calls = [str(call) for call in mock_incr.call_args_list]
        
        # Should have notification_dispatch_total{status=sent}
        assert any("notification_dispatch_total" in call and "sent" in call for call in metric_calls)
        
        # Should have notification_dispatch_batch_processed
        assert any("notification_dispatch_batch_processed" in call for call in metric_calls)


# ============================================================================
# E2E: Visibility Timeout Recovery
# ============================================================================

@pytest.mark.asyncio
async def test_e2e_visibility_timeout_recovery(
    outbox_repo,
    notification_service,
    mongo_client,
):
    """
    Test visibility timeout recovery: Worker crashes → Notification reset → Retry succeeds.
    """
    # 1) Enqueue notification
    notif_id = await outbox_repo.enqueue(
        event_type="payment_success",
        payment_id="pay_crash",
        order_id="ord_crash",
        provider="iyzico",
        locale="tr",
        channels=["email"],
        payload={"orderId": "ord_crash", "amount": 2000},
        idempotency_key="ord_crash|payment_success",
    )
    
    # 2) Claim notification (simulate worker starting)
    claimed = await outbox_repo.claim_for_dispatch(
        notification_id=ObjectId(notif_id),
        visibility_timeout_seconds=1,  # Short timeout for test
    )
    assert claimed["status"] == "SENDING"
    
    # 3) Simulate worker crash (no mark_sent or mark_failed)
    # Wait for visibility timeout to expire
    await asyncio.sleep(2)
    
    # 4) Reset stuck notifications
    reset_count = await outbox_repo.reset_stuck_notifications()
    assert reset_count == 1
    
    # 5) Verify notification back to ENQUEUED
    notif_doc = await outbox_repo.collection.find_one({"_id": ObjectId(notif_id)})
    assert notif_doc["status"] == "ENQUEUED"
    
    # 6) Dispatcher can now process it again
    # (In real scenario, next cron run would pick it up)
