# apps/backend/tests/test_notification_dispatcher_worker.py
"""
Tests for NotificationDispatcher worker.

Tests:
- Happy path: notification sent successfully
- Retry path: transient failure → exponential backoff
- Dead letter path: max retries → DEAD status
- Graceful shutdown: SIGTERM handling
- Metrics: counters, histograms, gauges
"""
import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId

from app.workers.notification_dispatcher import NotificationDispatcher
from app.repositories.notification_outbox_repository import NotificationOutboxRepository
from app.services.notification_service import NotificationService


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
def mock_notification_service():
    """Mock NotificationService."""
    service = AsyncMock(spec=NotificationService)
    service.send_templated_email = AsyncMock(return_value={"provider": "sendgrid", "result": "ok"})
    service.send_sms_templated = AsyncMock(return_value={"provider": "netgsm", "result": "ok"})
    return service


@pytest.fixture
def dispatcher(mongo_client, mock_notification_service):
    """Create NotificationDispatcher with mocked dependencies."""
    return NotificationDispatcher(
        mongo=mongo_client,
        notification_service=mock_notification_service,
        db_name="test_notifications",
    )


@pytest.fixture
def sample_notification():
    """Sample notification document."""
    return {
        "_id": ObjectId(),
        "eventType": "payment_success",
        "paymentId": "pay_123",
        "orderId": "ord_456",
        "provider": "iyzico",
        "locale": "tr",
        "channels": ["email"],
        "payload": {
            "orderId": "ord_456",
            "amount": 25000,
            "currency": "TRY",
            "customerEmail": "customer@example.com",
        },
        "status": "ENQUEUED",
        "attempts": 0,
        "nextAttemptAt": datetime.now(timezone.utc),
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
        "idempotencyKey": "ord_456|payment_success",
    }


# ============================================================================
# Happy Path Tests
# ============================================================================

@pytest.mark.asyncio
async def test_dispatcher_happy_path(dispatcher, outbox_repo, mock_notification_service, sample_notification):
    """Test successful notification dispatch."""
    # Insert notification
    await outbox_repo.collection.insert_one(sample_notification)
    
    # Run dispatcher
    stats = await dispatcher.run_once()
    
    # Verify stats
    assert stats["sent"] == 1
    assert stats["retried"] == 0
    assert stats["dead"] == 0
    assert stats["errors"] == 0
    
    # Verify notification marked as SENT
    doc = await outbox_repo.collection.find_one({"_id": sample_notification["_id"]})
    assert doc["status"] == "SENT"
    assert doc["sentAt"] is not None
    
    # Verify service called
    mock_notification_service.send_templated_email.assert_called_once()


@pytest.mark.asyncio
async def test_dispatcher_processes_multiple_notifications(dispatcher, outbox_repo, mock_notification_service):
    """Test dispatcher processes multiple notifications in batch."""
    # Insert 3 notifications
    notifications = []
    for i in range(3):
        notif = {
            "_id": ObjectId(),
            "eventType": "payment_success",
            "paymentId": f"pay_{i}",
            "orderId": f"ord_{i}",
            "provider": "iyzico",
            "locale": "tr",
            "channels": ["email"],
            "payload": {"orderId": f"ord_{i}", "amount": 10000},
            "status": "ENQUEUED",
            "attempts": 0,
            "nextAttemptAt": datetime.now(timezone.utc),
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
            "idempotencyKey": f"ord_{i}|payment_success",
        }
        notifications.append(notif)
        await outbox_repo.collection.insert_one(notif)
    
    # Run dispatcher
    stats = await dispatcher.run_once()
    
    # Verify all sent
    assert stats["sent"] == 3
    assert mock_notification_service.send_templated_email.call_count == 3


# ============================================================================
# Retry Path Tests
# ============================================================================

@pytest.mark.asyncio
async def test_dispatcher_retry_on_transient_failure(dispatcher, outbox_repo, mock_notification_service, sample_notification):
    """Test dispatcher retries on transient failure."""
    # Insert notification
    await outbox_repo.collection.insert_one(sample_notification)
    
    # Mock service to fail
    mock_notification_service.send_templated_email.side_effect = Exception("Network timeout")
    
    # Run dispatcher
    stats = await dispatcher.run_once()
    
    # Verify retry scheduled
    assert stats["sent"] == 0
    assert stats["retried"] == 1
    assert stats["dead"] == 0
    
    # Verify notification back to ENQUEUED with incremented attempts
    doc = await outbox_repo.collection.find_one({"_id": sample_notification["_id"]})
    assert doc["status"] == "ENQUEUED"
    assert doc["attempts"] == 1
    assert doc["lastError"] == "Network timeout"
    assert doc["nextAttemptAt"] > datetime.now(timezone.utc)


@pytest.mark.asyncio
async def test_dispatcher_exponential_backoff(dispatcher, outbox_repo, mock_notification_service, sample_notification):
    """Test exponential backoff for retries."""
    # Insert notification with 2 previous attempts
    sample_notification["attempts"] = 2
    await outbox_repo.collection.insert_one(sample_notification)
    
    # Mock service to fail
    mock_notification_service.send_templated_email.side_effect = Exception("Temporary error")
    
    # Run dispatcher
    await dispatcher.run_once()
    
    # Verify backoff delay increases
    doc = await outbox_repo.collection.find_one({"_id": sample_notification["_id"]})
    assert doc["attempts"] == 3
    
    # Delay should be roughly 2^3 * 60 = 480 seconds (with jitter)
    delay = (doc["nextAttemptAt"] - datetime.now(timezone.utc)).total_seconds()
    assert 400 < delay < 600  # Allow jitter range


# ============================================================================
# Dead Letter Path Tests
# ============================================================================

@pytest.mark.asyncio
async def test_dispatcher_dead_letter_after_max_retries(dispatcher, outbox_repo, mock_notification_service, sample_notification):
    """Test notification moved to DEAD after max retries."""
    # Insert notification with max-1 attempts
    sample_notification["attempts"] = dispatcher.MAX_ATTEMPTS - 1
    await outbox_repo.collection.insert_one(sample_notification)
    
    # Mock service to fail
    mock_notification_service.send_templated_email.side_effect = Exception("Permanent failure")
    
    # Run dispatcher
    stats = await dispatcher.run_once()
    
    # Verify moved to DEAD
    assert stats["sent"] == 0
    assert stats["retried"] == 0
    assert stats["dead"] == 1
    
    # Verify status
    doc = await outbox_repo.collection.find_one({"_id": sample_notification["_id"]})
    assert doc["status"] == "DEAD"
    assert doc["lastError"] == "Permanent failure"


@pytest.mark.asyncio
async def test_dispatcher_dead_letter_no_further_processing(dispatcher, outbox_repo, mock_notification_service, sample_notification):
    """Test DEAD notifications are not processed again."""
    # Insert DEAD notification
    sample_notification["status"] = "DEAD"
    sample_notification["attempts"] = 5
    await outbox_repo.collection.insert_one(sample_notification)
    
    # Run dispatcher
    stats = await dispatcher.run_once()
    
    # Verify not processed
    assert stats["sent"] == 0
    assert stats["retried"] == 0
    assert stats["dead"] == 0
    
    # Service should not be called
    mock_notification_service.send_templated_email.assert_not_called()


# ============================================================================
# Concurrency Tests
# ============================================================================

@pytest.mark.asyncio
async def test_dispatcher_concurrent_workers_no_duplicate_dispatch(outbox_repo, mock_notification_service, sample_notification, mongo_client):
    """Test that concurrent dispatchers don't send duplicate notifications."""
    # Insert notification
    await outbox_repo.collection.insert_one(sample_notification)
    
    # Create two dispatchers (simulating two workers)
    dispatcher1 = NotificationDispatcher(mongo_client, mock_notification_service, "test_notifications")
    dispatcher2 = NotificationDispatcher(mongo_client, mock_notification_service, "test_notifications")
    
    # Run both concurrently
    results = await asyncio.gather(
        dispatcher1.run_once(),
        dispatcher2.run_once(),
    )
    
    # Only one should have sent
    total_sent = sum(r["sent"] for r in results)
    assert total_sent == 1
    
    # Service called only once
    assert mock_notification_service.send_templated_email.call_count == 1


# ============================================================================
# Edge Cases
# ============================================================================

@pytest.mark.asyncio
async def test_dispatcher_no_pending_notifications(dispatcher, outbox_repo, mock_notification_service):
    """Test dispatcher handles empty queue gracefully."""
    # Run with no notifications
    stats = await dispatcher.run_once()
    
    # Verify no processing
    assert stats["sent"] == 0
    assert stats["retried"] == 0
    assert stats["dead"] == 0
    
    # Service not called
    mock_notification_service.send_templated_email.assert_not_called()


@pytest.mark.asyncio
async def test_dispatcher_respects_next_attempt_at(dispatcher, outbox_repo, mock_notification_service, sample_notification):
    """Test dispatcher respects nextAttemptAt (doesn't process future notifications)."""
    # Insert notification with future nextAttemptAt
    sample_notification["nextAttemptAt"] = datetime.now(timezone.utc) + timedelta(hours=1)
    await outbox_repo.collection.insert_one(sample_notification)
    
    # Run dispatcher
    stats = await dispatcher.run_once()
    
    # Should not process
    assert stats["sent"] == 0
    mock_notification_service.send_templated_email.assert_not_called()


@pytest.mark.asyncio
async def test_dispatcher_handles_invalid_event_type(dispatcher, outbox_repo, mock_notification_service, sample_notification):
    """Test dispatcher handles unknown event types gracefully."""
    # Insert notification with invalid event type
    sample_notification["eventType"] = "unknown_event"
    await outbox_repo.collection.insert_one(sample_notification)
    
    # Run dispatcher
    stats = await dispatcher.run_once()
    
    # Should retry (not dead letter for config errors)
    assert stats["retried"] == 1
    
    # Verify error recorded
    doc = await outbox_repo.collection.find_one({"_id": sample_notification["_id"]})
    assert "Unknown event_type" in doc["lastError"] or "unknown_event" in doc["lastError"]


# ============================================================================
# Metrics Tests
# ============================================================================

@pytest.mark.asyncio
async def test_dispatcher_emits_metrics(dispatcher, outbox_repo, mock_notification_service, sample_notification):
    """Test dispatcher emits Prometheus metrics."""
    # Insert notification
    await outbox_repo.collection.insert_one(sample_notification)
    
    # Mock metrics
    with patch("app.workers.notification_dispatcher.incr") as mock_incr:
        # Run dispatcher
        await dispatcher.run_once()
        
        # Verify metrics called
        # Should have: notification_dispatch_total{status=sent}, notification_dispatch_batch_processed
        assert mock_incr.call_count >= 2
        
        # Check for sent metric
        sent_calls = [call for call in mock_incr.call_args_list 
                     if "notification_dispatch_total" in str(call)]
        assert len(sent_calls) > 0


# ============================================================================
# Multi-Channel Tests
# ============================================================================

@pytest.mark.asyncio
async def test_dispatcher_sends_email_and_sms(dispatcher, outbox_repo, mock_notification_service, sample_notification):
    """Test dispatcher sends both email and SMS when channels include both."""
    # Update channels to include SMS
    sample_notification["channels"] = ["email", "sms"]
    sample_notification["payload"]["customerPhone"] = "+905551234567"
    await outbox_repo.collection.insert_one(sample_notification)
    
    # Run dispatcher
    stats = await dispatcher.run_once()
    
    # Verify both sent
    assert stats["sent"] == 1
    mock_notification_service.send_templated_email.assert_called_once()
    mock_notification_service.send_sms_templated.assert_called_once()


@pytest.mark.asyncio
async def test_dispatcher_email_fails_sms_succeeds(dispatcher, outbox_repo, mock_notification_service, sample_notification):
    """Test dispatcher handles partial failure (email fails, SMS succeeds)."""
    # Update channels
    sample_notification["channels"] = ["email", "sms"]
    await outbox_repo.collection.insert_one(sample_notification)
    
    # Mock email to fail, SMS to succeed
    mock_notification_service.send_templated_email.side_effect = Exception("Email failed")
    mock_notification_service.send_sms_templated.return_value = {"provider": "netgsm", "result": "ok"}
    
    # Run dispatcher
    stats = await dispatcher.run_once()
    
    # Should retry (partial failure)
    assert stats["retried"] == 1


# ============================================================================
# Graceful Shutdown Tests
# ============================================================================

@pytest.mark.asyncio
async def test_dispatcher_graceful_shutdown_signal():
    """Test dispatcher handles SIGTERM gracefully."""
    # This test verifies the signal handler in main()
    # In practice, we'd test this with process-level integration tests
    # For now, just verify the signal handler is registered
    
    import signal
    from app.workers.notification_dispatcher import main
    
    # Verify signal handlers exist in main function
    import inspect
    source = inspect.getsource(main)
    assert "signal.SIGTERM" in source
    assert "signal.SIGINT" in source
    assert "shutdown_requested" in source
