# apps/backend/tests/test_notification_dispatcher.py
"""
Tests for notification dispatcher worker.

Validates:
- Poll → Claim → Send → ACK flow
- Exponential backoff with jitter
- Dead letter after max attempts
- Concurrent worker safety (claim atomicity)
"""
import pytest
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.workers.notification_dispatcher import NotificationDispatcher
from app.repositories.notification_outbox_repository import NotificationOutboxRepository
from unittest.mock import AsyncMock, Mock


@pytest.fixture
async def mongo_client():
    """MongoDB client for testing."""
    # Use directConnection=true for local testing (bypasses replica set discovery)
    client = AsyncIOMotorClient("mongodb://localhost:27017/?directConnection=true")
    yield client
    client.close()


@pytest.fixture
async def clean_db(mongo_client):
    """Clean test database before each test."""
    db = mongo_client["vorte_test"]
    await db.notifications_outbox.delete_many({})
    yield db


@pytest.fixture
def mock_notification_service():
    """Mock notification service."""
    service = Mock()
    service.send_email = AsyncMock()
    service.send_sms = AsyncMock()
    return service


@pytest.fixture
async def dispatcher(mongo_client, clean_db, mock_notification_service):
    """Notification dispatcher with mocked dependencies."""
    return NotificationDispatcher(
        mongo=mongo_client,
        notification_service=mock_notification_service,
        db_name="vorte_test",
    )


@pytest.fixture
async def sample_notification(clean_db):
    """Create sample notification in outbox."""
    doc = {
        "_id": ObjectId(),
        "idempotencyKey": "payment_success:test-001",
        "eventType": "payment_success",
        "status": "PENDING",
        "attempts": 0,
        "nextAttemptAt": datetime.utcnow(),
        "payload": {
            "paymentId": "pay-001",
            "orderId": "order-001",
            "amount": 10000,
            "currency": "TRY",
            "status": "AUTHORIZED",
            "provider": "iyzico",
        },
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    await clean_db.notifications_outbox.insert_one(doc)
    return doc


@pytest.mark.asyncio
async def test_successful_dispatch(dispatcher, clean_db, sample_notification, mock_notification_service):
    """
    Test: Successful notification dispatch.
    
    Flow:
    1. Poll pending notification
    2. Claim and send
    3. Mark as SENT
    4. Verify notification service called
    """
    # Run dispatcher
    stats = await dispatcher.run_once()
    
    # Verify stats
    assert stats["sent"] == 1
    assert stats["retried"] == 0
    assert stats["dead"] == 0
    assert stats["errors"] == 0
    
    # Verify notification marked as SENT
    doc = await clean_db.notifications_outbox.find_one({"_id": sample_notification["_id"]})
    assert doc["status"] == "SENT"
    assert doc["sentAt"] is not None
    
    # Verify notification service called
    assert mock_notification_service.send_email.call_count == 1
    assert mock_notification_service.send_sms.call_count == 1


@pytest.mark.asyncio
async def test_retry_on_failure(dispatcher, clean_db, sample_notification, mock_notification_service):
    """
    Test: Retry with exponential backoff on failure.
    
    Flow:
    1. Mock send_email to fail
    2. Run dispatcher
    3. Verify status = PENDING, attempts = 1
    4. Verify nextAttemptAt increased
    """
    # Mock send_email to fail
    mock_notification_service.send_email.side_effect = Exception("Network error")
    
    # Run dispatcher
    stats = await dispatcher.run_once()
    
    # Verify stats
    assert stats["sent"] == 0
    assert stats["retried"] == 1
    assert stats["dead"] == 0
    
    # Verify notification status
    doc = await clean_db.notifications_outbox.find_one({"_id": sample_notification["_id"]})
    assert doc["status"] == "PENDING"
    assert doc["attempts"] == 1
    assert doc["lastError"] == "Network error"
    
    # Verify nextAttemptAt increased (exponential backoff)
    original_next_attempt = sample_notification["nextAttemptAt"]
    new_next_attempt = doc["nextAttemptAt"]
    assert new_next_attempt > original_next_attempt
    
    # Should be roughly 60s + jitter (base delay)
    delay = (new_next_attempt - datetime.utcnow()).total_seconds()
    assert 50 < delay < 130  # 60s ± jitter + processing time


@pytest.mark.asyncio
async def test_dead_letter_after_max_attempts(dispatcher, clean_db, mock_notification_service):
    """
    Test: Move to DEAD after max attempts.
    
    Flow:
    1. Create notification with attempts = 4 (one below max)
    2. Mock send to fail
    3. Run dispatcher
    4. Verify status = DEAD
    """
    # Create notification with 4 attempts
    doc = {
        "_id": ObjectId(),
        "idempotencyKey": "payment_success:test-dead",
        "eventType": "payment_success",
        "status": "PENDING",
        "attempts": 4,  # Next attempt will be 5th (max)
        "nextAttemptAt": datetime.utcnow(),
        "payload": {
            "paymentId": "pay-dead",
            "orderId": "order-dead",
            "amount": 10000,
            "currency": "TRY",
        },
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    await clean_db.notifications_outbox.insert_one(doc)
    
    # Mock send to fail
    mock_notification_service.send_email.side_effect = Exception("Permanent failure")
    
    # Run dispatcher
    stats = await dispatcher.run_once()
    
    # Verify stats
    assert stats["sent"] == 0
    assert stats["retried"] == 0
    assert stats["dead"] == 1
    
    # Verify notification moved to DEAD
    updated_doc = await clean_db.notifications_outbox.find_one({"_id": doc["_id"]})
    assert updated_doc["status"] == "DEAD"
    assert updated_doc["attempts"] == 5
    assert updated_doc["lastError"] == "Permanent failure"


@pytest.mark.asyncio
async def test_concurrent_claim_safety(dispatcher, clean_db, sample_notification, mock_notification_service):
    """
    Test: Atomic claim prevents duplicate dispatch.
    
    Flow:
    1. Create 2 dispatcher instances
    2. Run both concurrently
    3. Verify only one processes the notification
    """
    # Create second dispatcher
    dispatcher2 = NotificationDispatcher(
        mongo=dispatcher.mongo,
        notification_service=mock_notification_service,
        db_name="vorte_test",
    )
    
    # Run both concurrently
    import asyncio
    results = await asyncio.gather(
        dispatcher.run_once(),
        dispatcher2.run_once(),
        return_exceptions=True,
    )
    
    # Verify only one succeeded
    total_sent = sum(r["sent"] for r in results if isinstance(r, dict))
    assert total_sent == 1, "Both dispatchers processed the same notification"
    
    # Verify notification service called only once
    assert mock_notification_service.send_email.call_count == 1


@pytest.mark.asyncio
async def test_batch_processing(dispatcher, clean_db, mock_notification_service):
    """
    Test: Process multiple notifications in batch.
    
    Flow:
    1. Create 5 pending notifications
    2. Run dispatcher
    3. Verify all 5 processed
    """
    # Create 5 notifications
    for i in range(5):
        doc = {
            "_id": ObjectId(),
            "idempotencyKey": f"payment_success:batch-{i}",
            "eventType": "payment_success",
            "status": "PENDING",
            "attempts": 0,
            "nextAttemptAt": datetime.utcnow(),
            "payload": {
                "paymentId": f"pay-{i}",
                "orderId": f"order-{i}",
                "amount": 10000 * (i + 1),
                "currency": "TRY",
            },
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }
        await clean_db.notifications_outbox.insert_one(doc)
    
    # Run dispatcher
    stats = await dispatcher.run_once()
    
    # Verify all processed
    assert stats["sent"] == 5
    assert stats["retried"] == 0
    assert stats["dead"] == 0
    
    # Verify all marked as SENT
    sent_count = await clean_db.notifications_outbox.count_documents({"status": "SENT"})
    assert sent_count == 5


@pytest.mark.asyncio
async def test_skip_future_notifications(dispatcher, clean_db, mock_notification_service):
    """
    Test: Skip notifications with nextAttemptAt in future.
    
    Flow:
    1. Create notification with nextAttemptAt = now + 1 hour
    2. Run dispatcher
    3. Verify not processed
    """
    # Create future notification
    doc = {
        "_id": ObjectId(),
        "idempotencyKey": "payment_success:future",
        "eventType": "payment_success",
        "status": "PENDING",
        "attempts": 0,
        "nextAttemptAt": datetime.utcnow() + timedelta(hours=1),  # Future
        "payload": {
            "paymentId": "pay-future",
            "orderId": "order-future",
            "amount": 10000,
            "currency": "TRY",
        },
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    await clean_db.notifications_outbox.insert_one(doc)
    
    # Run dispatcher
    stats = await dispatcher.run_once()
    
    # Verify not processed
    assert stats["sent"] == 0
    assert stats["retried"] == 0
    
    # Verify still PENDING
    updated_doc = await clean_db.notifications_outbox.find_one({"_id": doc["_id"]})
    assert updated_doc["status"] == "PENDING"
    assert updated_doc["attempts"] == 0


@pytest.mark.asyncio
async def test_exponential_backoff_calculation(dispatcher):
    """
    Test: Exponential backoff calculation.
    
    Validates:
    - Attempt 1: ~60s
    - Attempt 2: ~120s
    - Attempt 3: ~240s
    - Attempt 4: ~480s
    - Max cap: 3600s
    """
    now = datetime.utcnow()
    
    # Attempt 1: 2^0 * 60 = 60s
    next_attempt_1 = dispatcher._calculate_next_attempt(1)
    delay_1 = (next_attempt_1 - now).total_seconds()
    assert 50 < delay_1 < 130  # 60s ± jitter
    
    # Attempt 2: 2^1 * 60 = 120s
    next_attempt_2 = dispatcher._calculate_next_attempt(2)
    delay_2 = (next_attempt_2 - now).total_seconds()
    assert 110 < delay_2 < 190  # 120s ± jitter
    
    # Attempt 3: 2^2 * 60 = 240s
    next_attempt_3 = dispatcher._calculate_next_attempt(3)
    delay_3 = (next_attempt_3 - now).total_seconds()
    assert 230 < delay_3 < 310  # 240s ± jitter
    
    # Attempt 10: Should cap at 3600s
    next_attempt_10 = dispatcher._calculate_next_attempt(10)
    delay_10 = (next_attempt_10 - now).total_seconds()
    assert delay_10 <= 3660  # 3600s + max jitter


@pytest.mark.asyncio
async def test_partial_failure_handling(dispatcher, clean_db, mock_notification_service):
    """
    Test: Handle partial failures (email succeeds, SMS fails).
    
    Flow:
    1. Mock send_email to succeed, send_sms to fail
    2. Run dispatcher
    3. Verify notification retried (both must succeed)
    """
    # Create notification
    doc = {
        "_id": ObjectId(),
        "idempotencyKey": "payment_success:partial",
        "eventType": "payment_success",
        "status": "PENDING",
        "attempts": 0,
        "nextAttemptAt": datetime.utcnow(),
        "payload": {
            "paymentId": "pay-partial",
            "orderId": "order-partial",
            "amount": 10000,
            "currency": "TRY",
        },
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    await clean_db.notifications_outbox.insert_one(doc)
    
    # Mock partial failure
    mock_notification_service.send_email.return_value = None  # Success
    mock_notification_service.send_sms.side_effect = Exception("SMS provider down")
    
    # Run dispatcher
    stats = await dispatcher.run_once()
    
    # Verify retried (not sent)
    assert stats["sent"] == 0
    assert stats["retried"] == 1
    
    # Verify notification still PENDING
    updated_doc = await clean_db.notifications_outbox.find_one({"_id": doc["_id"]})
    assert updated_doc["status"] == "PENDING"
    assert updated_doc["attempts"] == 1
