# apps/backend/tests/test_notification_outbox_repo.py
"""
Tests for NotificationOutboxRepository.

Tests:
- Idempotent enqueue (same idempotencyKey → single record)
- Atomic claim_for_dispatch (concurrency safe)
- mark_sent / mark_failed / mark_dead state transitions
- Visibility timeout: claimed notifications reset after timeout
- TTL behavior: SENT notifications expire after 7 days
"""
import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from bson import ObjectId

from app.repositories.notification_outbox_repository import NotificationOutboxRepository


@pytest.fixture
async def outbox_repo(mongo_client):
    """Create NotificationOutboxRepository with test database."""
    db = mongo_client.test_notifications
    repo = NotificationOutboxRepository(db)
    
    # Clean up before test
    await db.notifications_outbox.delete_many({})
    
    yield repo
    
    # Clean up after test
    await db.notifications_outbox.delete_many({})


@pytest.fixture
def sample_notification_data():
    """Sample notification data for tests."""
    return {
        "event_type": "payment_success",
        "payment_id": "pay_123",
        "order_id": "ord_456",
        "provider": "iyzico",
        "locale": "tr",
        "channels": ["email", "sms"],
        "payload": {
            "orderId": "ord_456",
            "amount": 25000,
            "currency": "TRY",
        },
    }


# ============================================================================
# Idempotency Tests
# ============================================================================

@pytest.mark.asyncio
async def test_enqueue_idempotent(outbox_repo, sample_notification_data):
    """Test that duplicate enqueue with same idempotencyKey creates only one record."""
    idempotency_key = "order-123|payment_success"
    
    # First enqueue
    notif_id_1 = await outbox_repo.enqueue(
        **sample_notification_data,
        idempotency_key=idempotency_key,
    )
    assert notif_id_1 is not None
    
    # Second enqueue with same key (should be idempotent)
    notif_id_2 = await outbox_repo.enqueue(
        **sample_notification_data,
        idempotency_key=idempotency_key,
    )
    assert notif_id_2 is None  # Returns None for duplicate
    
    # Verify only one record exists
    docs = await outbox_repo.collection.find({"idempotencyKey": idempotency_key}).to_list(None)
    assert len(docs) == 1
    assert str(docs[0]["_id"]) == notif_id_1


@pytest.mark.asyncio
async def test_enqueue_different_keys_creates_multiple(outbox_repo, sample_notification_data):
    """Test that different idempotencyKeys create separate records."""
    notif_id_1 = await outbox_repo.enqueue(
        **sample_notification_data,
        idempotency_key="key1",
    )
    
    notif_id_2 = await outbox_repo.enqueue(
        **sample_notification_data,
        idempotency_key="key2",
    )
    
    assert notif_id_1 != notif_id_2
    
    # Verify two records exist
    count = await outbox_repo.collection.count_documents({})
    assert count == 2


# ============================================================================
# Claim and Dispatch Tests
# ============================================================================

@pytest.mark.asyncio
async def test_find_ready_for_dispatch(outbox_repo, sample_notification_data):
    """Test finding notifications ready for dispatch."""
    # Create notification ready for dispatch
    notif_id = await outbox_repo.enqueue(
        **sample_notification_data,
        idempotency_key="key1",
    )
    
    # Find ready notifications
    ready = await outbox_repo.find_ready_for_dispatch(limit=10)
    
    assert len(ready) == 1
    assert str(ready[0]["_id"]) == notif_id
    assert ready[0]["status"] == "ENQUEUED"


@pytest.mark.asyncio
async def test_claim_for_dispatch_atomic(outbox_repo, sample_notification_data):
    """Test atomic claim prevents duplicate dispatch."""
    # Create notification
    notif_id = await outbox_repo.enqueue(
        **sample_notification_data,
        idempotency_key="key1",
    )
    
    # First claim should succeed
    claimed_1 = await outbox_repo.claim_for_dispatch(
        notification_id=ObjectId(notif_id),
        visibility_timeout_seconds=60,
    )
    assert claimed_1 is not None
    assert claimed_1["status"] == "SENDING"
    assert "visibilityDeadline" in claimed_1
    
    # Second claim should fail (already claimed)
    claimed_2 = await outbox_repo.claim_for_dispatch(
        notification_id=ObjectId(notif_id),
        visibility_timeout_seconds=60,
    )
    assert claimed_2 is None


@pytest.mark.asyncio
async def test_claim_concurrent_workers(outbox_repo, sample_notification_data):
    """Test that concurrent claims are safe (only one succeeds)."""
    # Create notification
    notif_id = await outbox_repo.enqueue(
        **sample_notification_data,
        idempotency_key="key1",
    )
    
    # Simulate concurrent claims from multiple workers
    results = await asyncio.gather(
        outbox_repo.claim_for_dispatch(ObjectId(notif_id), 60),
        outbox_repo.claim_for_dispatch(ObjectId(notif_id), 60),
        outbox_repo.claim_for_dispatch(ObjectId(notif_id), 60),
    )
    
    # Only one should succeed
    successful_claims = [r for r in results if r is not None]
    assert len(successful_claims) == 1


# ============================================================================
# State Transition Tests
# ============================================================================

@pytest.mark.asyncio
async def test_mark_sent(outbox_repo, sample_notification_data):
    """Test marking notification as sent."""
    notif_id = await outbox_repo.enqueue(
        **sample_notification_data,
        idempotency_key="key1",
    )
    
    # Mark as sent
    await outbox_repo.mark_sent(notification_id=ObjectId(notif_id))
    
    # Verify status updated
    doc = await outbox_repo.collection.find_one({"_id": ObjectId(notif_id)})
    assert doc["status"] == "SENT"
    assert doc["sentAt"] is not None


@pytest.mark.asyncio
async def test_mark_failed_increments_attempts(outbox_repo, sample_notification_data):
    """Test marking notification as failed increments attempts."""
    notif_id = await outbox_repo.enqueue(
        **sample_notification_data,
        idempotency_key="key1",
    )
    
    # Mark as failed
    next_attempt = datetime.now(timezone.utc) + timedelta(seconds=60)
    error = Exception("Network timeout")
    
    await outbox_repo.mark_failed(
        notification_id=ObjectId(notif_id),
        error=error,
        next_attempt_at=next_attempt,
    )
    
    # Verify state
    doc = await outbox_repo.collection.find_one({"_id": ObjectId(notif_id)})
    assert doc["status"] == "ENQUEUED"  # Back to ENQUEUED for retry
    assert doc["attempts"] == 1
    assert doc["lastError"] == str(error)
    assert len(doc["errors"]) == 1
    assert doc["errors"][0]["errorClass"] == "Exception"


@pytest.mark.asyncio
async def test_mark_dead(outbox_repo, sample_notification_data):
    """Test marking notification as dead (max retries exceeded)."""
    notif_id = await outbox_repo.enqueue(
        **sample_notification_data,
        idempotency_key="key1",
    )
    
    # Mark as dead
    error = Exception("Max retries exceeded")
    await outbox_repo.mark_dead(
        notification_id=ObjectId(notif_id),
        error=error,
    )
    
    # Verify status
    doc = await outbox_repo.collection.find_one({"_id": ObjectId(notif_id)})
    assert doc["status"] == "DEAD"
    assert doc["lastError"] == str(error)


# ============================================================================
# Visibility Timeout Tests
# ============================================================================

@pytest.mark.asyncio
async def test_visibility_timeout_reset(outbox_repo, sample_notification_data):
    """Test that stuck notifications are reset after visibility timeout."""
    # Create and claim notification
    notif_id = await outbox_repo.enqueue(
        **sample_notification_data,
        idempotency_key="key1",
    )
    
    claimed = await outbox_repo.claim_for_dispatch(
        notification_id=ObjectId(notif_id),
        visibility_timeout_seconds=1,  # Short timeout for test
    )
    assert claimed["status"] == "SENDING"
    
    # Wait for visibility timeout to expire
    await asyncio.sleep(2)
    
    # Reset stuck notifications
    reset_count = await outbox_repo.reset_stuck_notifications()
    assert reset_count == 1
    
    # Verify notification is back to ENQUEUED
    doc = await outbox_repo.collection.find_one({"_id": ObjectId(notif_id)})
    assert doc["status"] == "ENQUEUED"
    assert "visibilityDeadline" not in doc
    
    # Should be claimable again
    claimed_again = await outbox_repo.claim_for_dispatch(
        notification_id=ObjectId(notif_id),
        visibility_timeout_seconds=60,
    )
    assert claimed_again is not None


@pytest.mark.asyncio
async def test_reset_stuck_notifications_ignores_active(outbox_repo, sample_notification_data):
    """Test that reset_stuck_notifications ignores active (non-expired) notifications."""
    # Create and claim notification with long timeout
    notif_id = await outbox_repo.enqueue(
        **sample_notification_data,
        idempotency_key="key1",
    )
    
    await outbox_repo.claim_for_dispatch(
        notification_id=ObjectId(notif_id),
        visibility_timeout_seconds=300,  # 5 minutes
    )
    
    # Try to reset (should not reset active notification)
    reset_count = await outbox_repo.reset_stuck_notifications()
    assert reset_count == 0
    
    # Verify still in SENDING state
    doc = await outbox_repo.collection.find_one({"_id": ObjectId(notif_id)})
    assert doc["status"] == "SENDING"


# ============================================================================
# TTL Tests (MongoDB TTL Index Behavior)
# ============================================================================

@pytest.mark.asyncio
async def test_sent_notification_has_expire_at(outbox_repo, sample_notification_data):
    """Test that SENT notifications have expireAt field set for TTL."""
    notif_id = await outbox_repo.enqueue(
        **sample_notification_data,
        idempotency_key="key1",
    )
    
    # Mark as sent
    await outbox_repo.mark_sent(notification_id=ObjectId(notif_id))
    
    # Verify expireAt is set (7 days from now)
    doc = await outbox_repo.collection.find_one({"_id": ObjectId(notif_id)})
    assert "expireAt" in doc
    
    # Should be approximately 7 days from now
    expected_expire = datetime.now(timezone.utc) + timedelta(days=7)
    time_diff = abs((doc["expireAt"] - expected_expire).total_seconds())
    assert time_diff < 10  # Within 10 seconds tolerance


@pytest.mark.asyncio
async def test_enqueued_notification_no_expire_at(outbox_repo, sample_notification_data):
    """Test that ENQUEUED notifications do not have expireAt (should not expire)."""
    notif_id = await outbox_repo.enqueue(
        **sample_notification_data,
        idempotency_key="key1",
    )
    
    # Verify no expireAt field
    doc = await outbox_repo.collection.find_one({"_id": ObjectId(notif_id)})
    assert "expireAt" not in doc


# ============================================================================
# Edge Cases
# ============================================================================

@pytest.mark.asyncio
async def test_find_ready_respects_next_attempt_at(outbox_repo, sample_notification_data):
    """Test that find_ready_for_dispatch respects nextAttemptAt."""
    # Create notification with future nextAttemptAt
    notif_id = await outbox_repo.enqueue(
        **sample_notification_data,
        idempotency_key="key1",
    )
    
    # Update nextAttemptAt to future
    future_time = datetime.now(timezone.utc) + timedelta(hours=1)
    await outbox_repo.collection.update_one(
        {"_id": ObjectId(notif_id)},
        {"$set": {"nextAttemptAt": future_time}}
    )
    
    # Should not be found
    ready = await outbox_repo.find_ready_for_dispatch(limit=10)
    assert len(ready) == 0


@pytest.mark.asyncio
async def test_find_ready_limit(outbox_repo, sample_notification_data):
    """Test that find_ready_for_dispatch respects limit."""
    # Create 5 notifications
    for i in range(5):
        await outbox_repo.enqueue(
            **sample_notification_data,
            idempotency_key=f"key{i}",
        )
    
    # Find with limit=3
    ready = await outbox_repo.find_ready_for_dispatch(limit=3)
    assert len(ready) == 3


@pytest.mark.asyncio
async def test_multiple_failures_accumulate_errors(outbox_repo, sample_notification_data):
    """Test that multiple failures accumulate in errors array."""
    notif_id = await outbox_repo.enqueue(
        **sample_notification_data,
        idempotency_key="key1",
    )
    
    # Fail 3 times
    for i in range(3):
        next_attempt = datetime.now(timezone.utc) + timedelta(seconds=60 * (i + 1))
        error = Exception(f"Error {i + 1}")
        
        await outbox_repo.mark_failed(
            notification_id=ObjectId(notif_id),
            error=error,
            next_attempt_at=next_attempt,
        )
    
    # Verify all errors recorded
    doc = await outbox_repo.collection.find_one({"_id": ObjectId(notif_id)})
    assert doc["attempts"] == 3
    assert len(doc["errors"]) == 3
    assert doc["errors"][0]["message"] == "Error 1"
    assert doc["errors"][2]["message"] == "Error 3"
