# apps/backend/tests/test_reconciliation_worker.py
"""
Tests for reconciliation worker.

Tests:
- ReconciliationWorker initialization
- iyzico payment reconciliation
- PayTR payment reconciliation
- Stuck payment alerts
- Metrics emission
"""
import pytest
from datetime import datetime, timedelta, UTC
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId

from app.workers.reconciliation import ReconciliationWorker
from app.models.payment import Payment, PaymentStatus, PaymentProvider, ProviderRefs
from app.repositories.payment_repository import PaymentRepository
from app.services.payment_orchestrator import PaymentOrchestrator
from app.services.adapters.iyzico_adapter import IyzicoAdapter
from app.services.adapters.paytr_adapter import PayTRAdapter


@pytest.fixture
def mock_mongo():
    """Mock MongoDB client."""
    mongo = MagicMock()
    mongo.__getitem__ = MagicMock(return_value=MagicMock())
    return mongo


@pytest.fixture
def mock_repo():
    """Mock PaymentRepository."""
    repo = MagicMock(spec=PaymentRepository)
    repo.find_stuck_payments = AsyncMock(return_value=[])
    return repo


@pytest.fixture
def mock_orchestrator():
    """Mock PaymentOrchestrator."""
    orchestrator = MagicMock(spec=PaymentOrchestrator)
    orchestrator._transition_status = AsyncMock(return_value=True)
    orchestrator._record_event = AsyncMock()
    return orchestrator


@pytest.fixture
def mock_iyzico():
    """Mock IyzicoAdapter."""
    iyzico = MagicMock(spec=IyzicoAdapter)
    iyzico.retrieve_payment_detail = AsyncMock(return_value={
        "status": "success",
        "paymentId": "test_payment_123",
    })
    return iyzico


@pytest.fixture
def mock_paytr():
    """Mock PayTRAdapter."""
    paytr = MagicMock(spec=PayTRAdapter)
    paytr.status_inquiry = AsyncMock(return_value={
        "status": "success",
        "merchant_oid": "test_merchant_oid_123",
        "amount": "10000",
    })
    return paytr


@pytest.fixture
def worker(mock_mongo, mock_repo, mock_orchestrator, mock_iyzico, mock_paytr):
    """Create ReconciliationWorker instance."""
    return ReconciliationWorker(
        mongo=mock_mongo,
        repo=mock_repo,
        orchestrator=mock_orchestrator,
        iyzico=mock_iyzico,
        paytr=mock_paytr,
        db_name="test_db",
    )


@pytest.mark.asyncio
async def test_worker_initialization(worker):
    """Test worker initializes correctly."""
    assert worker.mongo is not None
    assert worker.repo is not None
    assert worker.orchestrator is not None
    assert worker.iyzico is not None
    assert worker.paytr is not None


@pytest.mark.asyncio
async def test_run_once_no_stuck_payments(worker, mock_repo):
    """Test run_once with no stuck payments."""
    mock_repo.find_stuck_payments = AsyncMock(return_value=[])
    
    stats = await worker.run_once()
    
    assert stats["checked"] == 0
    assert stats["updated"] == 0
    assert stats["failed"] == 0
    assert stats["stuck_alerts"] == 0


@pytest.mark.asyncio
async def test_run_once_with_stuck_iyzico_payment(worker, mock_repo, mock_iyzico, mock_orchestrator):
    """Test reconciliation of stuck iyzico payment."""
    # Create stuck payment
    payment = Payment(
        id=ObjectId(),
        orderId="order_123",
        provider=PaymentProvider.iyzico,
        status=PaymentStatus.PENDING_3DS,
        amount=10000,
        currency="TRY",
        providerRefs=ProviderRefs(iyz_paymentId="iyz_payment_123"),
        createdAt=datetime.now(UTC) - timedelta(minutes=20),
    )
    
    mock_repo.find_stuck_payments = AsyncMock(return_value=[payment])
    mock_iyzico.retrieve_payment_detail = AsyncMock(return_value={
        "status": "success",
        "paymentId": "iyz_payment_123",
    })
    
    # Mock session and transaction
    mock_session = MagicMock()
    mock_session.start_transaction = MagicMock(return_value=AsyncMock().__aenter__())
    worker.mongo.start_session = AsyncMock(return_value=AsyncMock().__aenter__())
    
    stats = await worker.run_once()
    
    assert stats["checked"] == 1
    # Note: updated count depends on successful transition
    assert mock_iyzico.retrieve_payment_detail.called


@pytest.mark.asyncio
async def test_run_once_with_stuck_paytr_payment(worker, mock_repo, mock_paytr, mock_orchestrator):
    """Test reconciliation of stuck PayTR payment."""
    # Create stuck payment
    payment = Payment(
        id=ObjectId(),
        orderId="order_456",
        provider=PaymentProvider.paytr,
        status=PaymentStatus.INITIATED,
        amount=15000,
        currency="TRY",
        providerRefs=ProviderRefs(paytr_merchant_oid="paytr_merchant_456"),
        createdAt=datetime.now(UTC) - timedelta(minutes=25),
    )
    
    mock_repo.find_stuck_payments = AsyncMock(return_value=[payment])
    mock_paytr.status_inquiry = AsyncMock(return_value={
        "status": "success",
        "merchant_oid": "paytr_merchant_456",
        "amount": "15000",
    })
    
    # Mock session and transaction
    mock_session = MagicMock()
    mock_session.start_transaction = MagicMock(return_value=AsyncMock().__aenter__())
    worker.mongo.start_session = AsyncMock(return_value=AsyncMock().__aenter__())
    
    stats = await worker.run_once()
    
    assert stats["checked"] == 1
    assert mock_paytr.status_inquiry.called


@pytest.mark.asyncio
async def test_stuck_payment_alert(worker, mock_repo):
    """Test alert for payment stuck > 60 minutes."""
    # Create payment stuck for 65 minutes
    payment = Payment(
        id=ObjectId(),
        orderId="order_789",
        provider=PaymentProvider.iyzico,
        status=PaymentStatus.PENDING_3DS,
        amount=20000,
        currency="TRY",
        providerRefs=ProviderRefs(iyz_paymentId="iyz_payment_789"),
        createdAt=datetime.now(UTC) - timedelta(minutes=65),
    )
    
    mock_repo.find_stuck_payments = AsyncMock(return_value=[payment])
    
    # Mock session and transaction
    mock_session = MagicMock()
    mock_session.start_transaction = MagicMock(return_value=AsyncMock().__aenter__())
    worker.mongo.start_session = AsyncMock(return_value=AsyncMock().__aenter__())
    
    with patch("app.workers.reconciliation.incr") as mock_incr:
        stats = await worker.run_once()
        
        # Verify stuck alert was emitted
        assert stats["stuck_alerts"] == 1
        mock_incr.assert_any_call("reconciliation_stuck_total", provider="iyzico")


@pytest.mark.asyncio
async def test_map_iyzico_status(worker):
    """Test iyzico status mapping."""
    assert worker._map_iyzico_status("success") == PaymentStatus.AUTHORIZED
    assert worker._map_iyzico_status("failure") == PaymentStatus.FAILED
    assert worker._map_iyzico_status("init_threeds") == PaymentStatus.PENDING_3DS
    assert worker._map_iyzico_status("callback_threeds") == PaymentStatus.PENDING_3DS
    assert worker._map_iyzico_status("require_capture") == PaymentStatus.AUTHORIZED
    assert worker._map_iyzico_status("unknown") == PaymentStatus.FAILED


@pytest.mark.asyncio
async def test_map_paytr_status(worker):
    """Test PayTR status mapping."""
    assert worker._map_paytr_status("success") == PaymentStatus.AUTHORIZED
    assert worker._map_paytr_status("failed") == PaymentStatus.FAILED
    assert worker._map_paytr_status("waiting") == PaymentStatus.PENDING_3DS
    assert worker._map_paytr_status("cancelled") == PaymentStatus.CANCELLED
    assert worker._map_paytr_status("refunded") == PaymentStatus.REFUNDED
    assert worker._map_paytr_status("unknown") == PaymentStatus.FAILED


@pytest.mark.asyncio
async def test_reconciliation_with_api_error(worker, mock_repo, mock_iyzico):
    """Test reconciliation handles API errors gracefully."""
    # Create stuck payment
    payment = Payment(
        id=ObjectId(),
        orderId="order_error",
        provider=PaymentProvider.iyzico,
        status=PaymentStatus.PENDING_3DS,
        amount=10000,
        currency="TRY",
        providerRefs=ProviderRefs(iyz_paymentId="iyz_payment_error"),
        createdAt=datetime.now(UTC) - timedelta(minutes=20),
    )
    
    mock_repo.find_stuck_payments = AsyncMock(return_value=[payment])
    mock_iyzico.retrieve_payment_detail = AsyncMock(side_effect=Exception("API Error"))
    
    stats = await worker.run_once()
    
    assert stats["checked"] == 1
    assert stats["failed"] == 1
    assert stats["updated"] == 0


@pytest.mark.asyncio
async def test_reconciliation_no_status_change(worker, mock_repo, mock_iyzico):
    """Test reconciliation when status hasn't changed."""
    # Create stuck payment
    payment = Payment(
        id=ObjectId(),
        orderId="order_nochange",
        provider=PaymentProvider.iyzico,
        status=PaymentStatus.PENDING_3DS,
        amount=10000,
        currency="TRY",
        providerRefs=ProviderRefs(iyz_paymentId="iyz_payment_nochange"),
        createdAt=datetime.now(UTC) - timedelta(minutes=20),
    )
    
    mock_repo.find_stuck_payments = AsyncMock(return_value=[payment])
    # Return status that maps to same status
    mock_iyzico.retrieve_payment_detail = AsyncMock(return_value={
        "status": "init_threeds",  # Maps to PENDING_3DS
        "paymentId": "iyz_payment_nochange",
    })
    
    # Mock session and transaction
    mock_session = MagicMock()
    mock_session.start_transaction = MagicMock(return_value=AsyncMock().__aenter__())
    worker.mongo.start_session = AsyncMock(return_value=AsyncMock().__aenter__())
    
    with patch("app.workers.reconciliation.incr") as mock_incr:
        stats = await worker.run_once()
        
        # Verify no_change metric was emitted
        mock_incr.assert_any_call("recon_no_change_total", provider="iyzico")
