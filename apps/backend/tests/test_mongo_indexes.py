# apps/backend/tests/test_mongo_indexes.py
"""
Tests for MongoDB payment indexes.

Validates:
- Index creation for payments collection
- Index creation for payment_events collection
- Index properties (unique, sparse)
"""
import pytest
from motor.motor_asyncio import AsyncIOMotorClient

from app.bootstrap.mongo_indexes import ensure_payment_indexes


@pytest.fixture
async def test_db():
    """Create test database connection."""
    client = AsyncIOMotorClient("mongodb://localhost:27017/?directConnection=true")
    db = client["test_payment_indexes"]
    
    # Clean up before test
    await db.payments.drop()
    await db.payment_events.drop()
    
    yield db
    
    # Clean up after test
    await db.payments.drop()
    await db.payment_events.drop()
    client.close()


@pytest.mark.asyncio
async def test_ensure_payment_indexes(test_db):
    """Test that all payment indexes are created correctly."""
    # Create indexes
    await ensure_payment_indexes(test_db)
    
    # Verify payments indexes
    payments_indexes = await test_db.payments.index_information()
    
    assert "ix_payments_orderId" in payments_indexes
    assert "uq_idempotencyKey" in payments_indexes
    assert "ix_payments_status_createdAt" in payments_indexes
    assert "uq_iyz_paymentId" in payments_indexes
    assert "uq_paytr_merchant_oid" in payments_indexes
    
    # Verify unique constraints
    assert payments_indexes["uq_idempotencyKey"]["unique"] is True
    assert payments_indexes["uq_idempotencyKey"]["sparse"] is True
    assert payments_indexes["uq_iyz_paymentId"]["unique"] is True
    assert payments_indexes["uq_iyz_paymentId"]["sparse"] is True
    assert payments_indexes["uq_paytr_merchant_oid"]["unique"] is True
    assert payments_indexes["uq_paytr_merchant_oid"]["sparse"] is True
    
    # Verify payment_events indexes
    events_indexes = await test_db.payment_events.index_information()
    
    assert "uq_provider_eventId" in events_indexes
    assert "ix_events_paymentId_createdAt" in events_indexes
    
    # Verify unique constraint
    assert events_indexes["uq_provider_eventId"]["unique"] is True


@pytest.mark.asyncio
async def test_idempotency_key_uniqueness(test_db):
    """Test that idempotency key enforces uniqueness."""
    await ensure_payment_indexes(test_db)
    
    # Insert first document
    await test_db.payments.insert_one({
        "orderId": "order-1",
        "idempotencyKey": "idem-123",
        "status": "INITIATED",
    })
    
    # Try to insert duplicate idempotency key
    with pytest.raises(Exception) as exc_info:
        await test_db.payments.insert_one({
            "orderId": "order-2",
            "idempotencyKey": "idem-123",
            "status": "INITIATED",
        })
    
    assert "duplicate key" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_provider_event_deduplication(test_db):
    """Test that provider + externalEventId enforces uniqueness."""
    await ensure_payment_indexes(test_db)
    
    # Insert first event
    await test_db.payment_events.insert_one({
        "paymentId": "pay-1",
        "provider": "iyzico",
        "externalEventId": "evt-123",
    })
    
    # Try to insert duplicate event
    with pytest.raises(Exception) as exc_info:
        await test_db.payment_events.insert_one({
            "paymentId": "pay-2",
            "provider": "iyzico",
            "externalEventId": "evt-123",
        })
    
    assert "duplicate key" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_sparse_index_allows_null(test_db):
    """Test that sparse indexes allow documents without the field."""
    await ensure_payment_indexes(test_db)
    
    # Insert documents without idempotencyKey (should succeed)
    await test_db.payments.insert_one({
        "orderId": "order-1",
        "status": "INITIATED",
    })
    
    await test_db.payments.insert_one({
        "orderId": "order-2",
        "status": "INITIATED",
    })
    
    # Verify both documents exist
    count = await test_db.payments.count_documents({})
    assert count == 2
