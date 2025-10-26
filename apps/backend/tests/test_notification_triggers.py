# apps/backend/tests/test_notification_triggers.py
"""
Tests for notification triggers in payment orchestrator.

Validates:
- Transactional outbox pattern (payment + notification = atomic)
- Notification enqueued on AUTHORIZED status
- Idempotency (duplicate payment → no duplicate notification)
- Transaction rollback (payment fails → no notification)
"""
import pytest
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from unittest.mock import AsyncMock, Mock

from app.services.payment_orchestrator import PaymentOrchestrator
from app.repositories.payment_repository import PaymentRepository
from app.repositories.notification_outbox_repository import NotificationOutboxRepository
from app.services.idempotency import IdempotencyStore
from app.services.adapters.iyzico_adapter import IyzicoAdapter
from app.models.payment import PaymentStatus


@pytest.fixture
async def mongo_client():
    """MongoDB client for testing."""
    # Connect to replica set for transaction support
    client = AsyncIOMotorClient("mongodb://localhost:27017/?replicaSet=rs0")
    yield client
    client.close()


@pytest.fixture
async def clean_db(mongo_client):
    """Clean test database before each test."""
    db = mongo_client["vorte_test"]
    await db.payments.delete_many({})
    await db.payment_events.delete_many({})
    await db.idempotency_keys.delete_many({})
    await db.notifications_outbox.delete_many({})
    yield db


@pytest.fixture
def mock_iyzico_adapter():
    """Mock iyzico adapter for testing."""
    adapter = Mock(spec=IyzicoAdapter)
    adapter.initialize_3ds = AsyncMock(return_value={
        "status": "success",
        "paymentId": "iyz-12345",
        "threeDSHtmlContent": "base64-encoded-html",
        "threeDSVersion": "2.0",
    })
    return adapter


@pytest.fixture
def mock_redis():
    """Mock Redis client for idempotency store."""
    redis_mock = Mock()
    redis_mock.get = AsyncMock(return_value=None)
    redis_mock.set = AsyncMock(return_value=True)
    redis_mock.setnx = AsyncMock(return_value=True)
    return redis_mock


@pytest.fixture
async def orchestrator(mongo_client, clean_db, mock_iyzico_adapter, mock_redis):
    """Payment orchestrator with mocked dependencies."""
    db = mongo_client["vorte_test"]
    repo = PaymentRepository(db)
    idem = IdempotencyStore(mock_redis)
    outbox_repo = NotificationOutboxRepository(db)
    
    return PaymentOrchestrator(
        mongo=mongo_client,
        repo=repo,
        idem=idem,
        iyzico=mock_iyzico_adapter,
        db_name="vorte_test",
        outbox_repo=outbox_repo,
    )


@pytest.mark.asyncio
async def test_notification_enqueued_on_payment_success(orchestrator, clean_db):
    """
    Test: Notification enqueued when payment transitions to AUTHORIZED.
    
    Flow:
    1. Initialize 3DS payment (INITIATED → PENDING_3DS)
    2. Simulate webhook (PENDING_3DS → AUTHORIZED)
    3. Verify notification in outbox
    """
    # 1) Initialize payment
    response = await orchestrator.start_3ds_initialize(
        idempotency_key="test-idem-001",
        order_id="order-001",
        amount_minor=10000,
        currency="TRY",
        iyz_payload={"buyer": {"name": "Test User"}},
    )
    
    payment_id = ObjectId(response["paymentDbId"])
    
    # 2) Simulate webhook (AUTHORIZED)
    await orchestrator.handle_iyzico_webhook({
        "localPaymentDbId": str(payment_id),
        "paymentId": "iyz-12345",
        "status": "success",
        "conversationId": "conv-001",
    })
    
    # 3) Verify notification in outbox
    outbox_doc = await clean_db.notifications_outbox.find_one({
        "idempotencyKey": f"payment_success:{payment_id}"
    })
    
    assert outbox_doc is not None, "Notification not found in outbox"
    assert outbox_doc["eventType"] == "payment_success"
    assert outbox_doc["status"] == "PENDING"
    assert outbox_doc["attempts"] == 0
    assert outbox_doc["payload"]["orderId"] == "order-001"
    assert outbox_doc["payload"]["amount"] == 10000
    assert outbox_doc["payload"]["status"] == "AUTHORIZED"


@pytest.mark.asyncio
async def test_notification_idempotency(orchestrator, clean_db):
    """
    Test: Duplicate webhook does not create duplicate notification.
    
    Flow:
    1. Initialize payment
    2. Process webhook twice (duplicate delivery)
    3. Verify only one notification in outbox
    """
    # 1) Initialize payment
    response = await orchestrator.start_3ds_initialize(
        idempotency_key="test-idem-002",
        order_id="order-002",
        amount_minor=20000,
        currency="TRY",
        iyz_payload={"buyer": {"name": "Test User"}},
    )
    
    payment_id = ObjectId(response["paymentDbId"])
    webhook_payload = {
        "localPaymentDbId": str(payment_id),
        "paymentId": "iyz-67890",
        "status": "success",
        "conversationId": "conv-002",
    }
    
    # 2) Process webhook twice
    await orchestrator.handle_iyzico_webhook(webhook_payload)
    await orchestrator.handle_iyzico_webhook(webhook_payload)  # Duplicate
    
    # 3) Verify only one notification
    count = await clean_db.notifications_outbox.count_documents({
        "idempotencyKey": f"payment_success:{payment_id}"
    })
    
    assert count == 1, f"Expected 1 notification, found {count}"


@pytest.mark.asyncio
async def test_transaction_rollback_no_notification(orchestrator, clean_db):
    """
    Test: Transaction rollback prevents notification enqueue.
    
    Flow:
    1. Initialize payment
    2. Mock status transition to fail
    3. Verify no notification in outbox
    """
    # 1) Initialize payment
    response = await orchestrator.start_3ds_initialize(
        idempotency_key="test-idem-003",
        order_id="order-003",
        amount_minor=30000,
        currency="TRY",
        iyz_payload={"buyer": {"name": "Test User"}},
    )
    
    payment_id = ObjectId(response["paymentDbId"])
    
    # 2) Mock _transition_status to fail
    from unittest.mock import patch
    with patch.object(orchestrator, "_transition_status", return_value=False):
        # 3) Attempt webhook (should fail gracefully)
        await orchestrator.handle_iyzico_webhook({
            "localPaymentDbId": str(payment_id),
            "paymentId": "iyz-fail",
            "status": "success",
            "conversationId": "conv-003",
        })
    
    # 4) Verify no notification in outbox
    count = await clean_db.notifications_outbox.count_documents({
        "idempotencyKey": f"payment_success:{payment_id}"
    })
    
    assert count == 0, f"Expected 0 notifications, found {count}"


@pytest.mark.asyncio
async def test_notification_payload_structure(orchestrator, clean_db):
    """
    Test: Notification payload contains all required fields.
    
    Validates:
    - paymentId, orderId, amount, currency, status, provider
    """
    # 1) Initialize and authorize payment
    response = await orchestrator.start_3ds_initialize(
        idempotency_key="test-idem-004",
        order_id="order-004",
        amount_minor=15000,
        currency="USD",
        iyz_payload={"buyer": {"name": "Test User"}},
    )
    
    payment_id = ObjectId(response["paymentDbId"])
    
    await orchestrator.handle_iyzico_webhook({
        "localPaymentDbId": str(payment_id),
        "paymentId": "iyz-payload-test",
        "status": "success",
        "conversationId": "conv-004",
    })
    
    # 2) Verify payload structure
    outbox_doc = await clean_db.notifications_outbox.find_one({
        "idempotencyKey": f"payment_success:{payment_id}"
    })
    
    payload = outbox_doc["payload"]
    assert payload["paymentId"] == str(payment_id)
    assert payload["orderId"] == "order-004"
    assert payload["amount"] == 15000
    assert payload["currency"] == "USD"
    assert payload["status"] == "AUTHORIZED"
    assert payload["provider"] == "iyzico"


@pytest.mark.asyncio
async def test_paytr_notification_trigger(orchestrator, clean_db):
    """
    Test: PayTR callback also triggers notification.
    
    Flow:
    1. Initialize PayTR payment
    2. Simulate callback (AUTHORIZED)
    3. Verify notification in outbox
    """
    # Mock PayTR adapter
    mock_paytr = Mock()
    mock_paytr.initialize_payment = Mock(return_value={
        "merchant_id": "test-merchant",
        "merchant_oid": "test-oid",
        "paytr_token": "test-token",
    })
    mock_paytr.validate_callback_hash = Mock(return_value=True)
    orchestrator.paytr = mock_paytr
    
    # 1) Initialize PayTR payment
    response = await orchestrator.start_paytr_initialize(
        idempotency_key="test-paytr-001",
        order_id="order-paytr-001",
        amount_minor=25000,
        currency="TRY",
        user_basket=[{"name": "Product", "price": "250.00", "quantity": 1}],
        user_ip="127.0.0.1",
        email="test@example.com",
        merchant_ok_url="http://localhost/ok",
        merchant_fail_url="http://localhost/fail",
    )
    
    payment_id = ObjectId(response["paymentDbId"])
    
    # 2) Simulate callback
    await orchestrator.handle_paytr_callback({
        "merchant_oid": str(payment_id),
        "status": "success",
        "total_amount": "250.00",
        "hash": "valid-hash",
        "payment_type": "card",
    })
    
    # 3) Verify notification
    outbox_doc = await clean_db.notifications_outbox.find_one({
        "idempotencyKey": f"payment_success:{payment_id}"
    })
    
    assert outbox_doc is not None
    assert outbox_doc["eventType"] == "payment_success"
    assert outbox_doc["payload"]["provider"] == "paytr"


@pytest.mark.asyncio
async def test_multiple_payments_multiple_notifications(orchestrator, clean_db):
    """
    Test: Multiple payments create separate notifications.
    
    Flow:
    1. Initialize 3 payments
    2. Authorize all 3
    3. Verify 3 separate notifications
    """
    payment_ids = []
    
    # 1) Initialize 3 payments
    for i in range(3):
        response = await orchestrator.start_3ds_initialize(
            idempotency_key=f"test-multi-{i}",
            order_id=f"order-multi-{i}",
            amount_minor=10000 * (i + 1),
            currency="TRY",
            iyz_payload={"buyer": {"name": f"User {i}"}},
        )
        payment_ids.append(ObjectId(response["paymentDbId"]))
    
    # 2) Authorize all
    for i, payment_id in enumerate(payment_ids):
        await orchestrator.handle_iyzico_webhook({
            "localPaymentDbId": str(payment_id),
            "paymentId": f"iyz-multi-{i}",
            "status": "success",
            "conversationId": f"conv-multi-{i}",
        })
    
    # 3) Verify 3 notifications
    count = await clean_db.notifications_outbox.count_documents({
        "eventType": "payment_success"
    })
    
    assert count == 3, f"Expected 3 notifications, found {count}"
    
    # Verify each has unique idempotency key
    for payment_id in payment_ids:
        doc = await clean_db.notifications_outbox.find_one({
            "idempotencyKey": f"payment_success:{payment_id}"
        })
        assert doc is not None, f"Notification for {payment_id} not found"


@pytest.mark.asyncio
async def test_payment_failure_triggers_notification(orchestrator, clean_db):
    """
    Test: Payment failure triggers payment_failed notification.
    
    Flow:
    1. Initialize payment
    2. Simulate failure webhook
    3. Verify payment_failed notification in outbox
    """
    # 1) Initialize payment
    response = await orchestrator.start_3ds_initialize(
        idempotency_key="test-fail-001",
        order_id="order-fail-001",
        amount_minor=15000,
        currency="TRY",
        iyz_payload={"buyer": {"name": "Test User"}},
    )
    
    payment_id = ObjectId(response["paymentDbId"])
    
    # 2) Simulate failure webhook
    await orchestrator.handle_iyzico_webhook({
        "localPaymentDbId": str(payment_id),
        "paymentId": "iyz-fail-001",
        "status": "failure",
        "errorMessage": "Insufficient funds",
        "conversationId": "conv-fail-001",
    })
    
    # 3) Verify payment_failed notification
    outbox_doc = await clean_db.notifications_outbox.find_one({
        "idempotencyKey": f"payment_failed:{payment_id}"
    })
    
    assert outbox_doc is not None, "Failure notification not found in outbox"
    assert outbox_doc["eventType"] == "payment_failed"
    assert outbox_doc["status"] == "PENDING"
    assert outbox_doc["payload"]["orderId"] == "order-fail-001"
    assert outbox_doc["payload"]["status"] == "FAILED"


@pytest.mark.asyncio
async def test_paytr_failure_triggers_notification(orchestrator, clean_db):
    """
    Test: PayTR failure also triggers notification.
    
    Flow:
    1. Initialize PayTR payment
    2. Simulate failure callback
    3. Verify payment_failed notification
    """
    # Mock PayTR adapter
    mock_paytr = Mock()
    mock_paytr.initialize_payment = Mock(return_value={
        "merchant_id": "test-merchant",
        "merchant_oid": "test-oid",
        "paytr_token": "test-token",
    })
    mock_paytr.validate_callback_hash = Mock(return_value=True)
    orchestrator.paytr = mock_paytr
    
    # 1) Initialize PayTR payment
    response = await orchestrator.start_paytr_initialize(
        idempotency_key="test-paytr-fail-001",
        order_id="order-paytr-fail-001",
        amount_minor=20000,
        currency="TRY",
        user_basket=[{"name": "Product", "price": "200.00", "quantity": 1}],
        user_ip="127.0.0.1",
        email="test@example.com",
        merchant_ok_url="http://localhost/ok",
        merchant_fail_url="http://localhost/fail",
    )
    
    payment_id = ObjectId(response["paymentDbId"])
    
    # 2) Simulate failure callback
    await orchestrator.handle_paytr_callback({
        "merchant_oid": str(payment_id),
        "status": "failed",
        "total_amount": "200.00",
        "hash": "valid-hash",
        "payment_type": "card",
        "failed_reason_msg": "Card declined",
    })
    
    # 3) Verify notification
    outbox_doc = await clean_db.notifications_outbox.find_one({
        "idempotencyKey": f"payment_failed:{payment_id}"
    })
    
    assert outbox_doc is not None
    assert outbox_doc["eventType"] == "payment_failed"
    assert outbox_doc["payload"]["provider"] == "paytr"
