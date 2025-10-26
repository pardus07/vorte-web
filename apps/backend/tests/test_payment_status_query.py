# apps/backend/tests/test_payment_status_query.py
"""
Tests for Payment Status Query Endpoint.

Tests:
- 200 OK: Payment found, returns status
- 304 Not Modified: ETag match, no body
- 400 Bad Request: Invalid order ID
- 404 Not Found: Payment not found
- ETag generation and validation
- Cache-Control headers
- Metrics recording
"""
import pytest
from datetime import datetime, UTC
from bson import ObjectId
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.models.payment import Payment, PaymentStatus, PaymentProvider
from app.repositories.payment_repository import PaymentRepository


@pytest.fixture
def sample_payment():
    """Sample payment document."""
    return Payment(
        id=ObjectId(),
        orderId="ORD-12345",
        provider=PaymentProvider.iyzico,
        status=PaymentStatus.AUTHORIZED,
        amount=25000,
        currency="TRY",
        createdAt=datetime(2025, 1, 25, 10, 0, 0, tzinfo=UTC),
        updatedAt=datetime(2025, 1, 25, 10, 5, 0, tzinfo=UTC),
    )


@pytest.fixture
def mock_payment_repo():
    """Mock PaymentRepository."""
    repo = AsyncMock(spec=PaymentRepository)
    return repo


# ============================================================================
# Happy Path Tests
# ============================================================================

def test_get_payment_status_success(client, mock_payment_repo, sample_payment):
    """Test successful payment status retrieval."""
    # Mock repository
    mock_payment_repo.get_by_order = AsyncMock(return_value=sample_payment)
    
    # Override dependency
    from app.api.v1.orders.payment_status import get_payment_repo
    client.app.dependency_overrides[get_payment_repo] = lambda: mock_payment_repo
    
    # Make request
    response = client.get("/api/v1/orders/ORD-12345/payment")
    
    # Verify response
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"
    assert "ETag" in response.headers
    assert response.headers["Cache-Control"] == "no-store"
    
    # Verify body
    data = response.json()
    assert data["orderId"] == "ORD-12345"
    assert data["provider"] == "iyzico"
    assert data["status"] == "AUTHORIZED"
    assert data["amountMinor"] == 25000
    assert data["currency"] == "TRY"
    assert data["nextAction"] is None
    
    # Verify repository called
    mock_payment_repo.get_by_order.assert_called_once_with("ORD-12345")


def test_get_payment_status_with_next_action_pending_3ds(client, mock_payment_repo, sample_payment):
    """Test payment status with nextAction for PENDING_3DS."""
    # Update payment status
    sample_payment.status = PaymentStatus.PENDING_3DS
    mock_payment_repo.get_by_order = AsyncMock(return_value=sample_payment)
    
    from app.api.v1.orders.payment_status import get_payment_repo
    client.app.dependency_overrides[get_payment_repo] = lambda: mock_payment_repo
    
    response = client.get("/api/v1/orders/ORD-12345/payment")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PENDING_3DS"
    assert data["nextAction"] is not None
    assert data["nextAction"]["type"] == "redirect_3ds"


def test_get_payment_status_with_next_action_failed(client, mock_payment_repo, sample_payment):
    """Test payment status with nextAction for FAILED."""
    # Update payment status
    sample_payment.status = PaymentStatus.FAILED
    mock_payment_repo.get_by_order = AsyncMock(return_value=sample_payment)
    
    from app.api.v1.orders.payment_status import get_payment_repo
    client.app.dependency_overrides[get_payment_repo] = lambda: mock_payment_repo
    
    response = client.get("/api/v1/orders/ORD-12345/payment")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "FAILED"
    assert data["nextAction"] is not None
    assert data["nextAction"]["type"] == "retry"


# ============================================================================
# ETag / 304 Tests
# ============================================================================

def test_get_payment_status_304_not_modified(client, mock_payment_repo, sample_payment):
    """Test 304 Not Modified with matching ETag."""
    mock_payment_repo.get_by_order = AsyncMock(return_value=sample_payment)
    
    from app.api.v1.orders.payment_status import get_payment_repo, build_weak_etag
    client.app.dependency_overrides[get_payment_repo] = lambda: mock_payment_repo
    
    # First request to get ETag
    response1 = client.get("/api/v1/orders/ORD-12345/payment")
    assert response1.status_code == 200
    etag = response1.headers["ETag"]
    
    # Second request with If-None-Match
    response2 = client.get(
        "/api/v1/orders/ORD-12345/payment",
        headers={"If-None-Match": etag}
    )
    
    # Verify 304
    assert response2.status_code == 304
    assert response2.headers["ETag"] == etag
    assert response2.headers["Cache-Control"] == "no-store"
    assert response2.content == b""  # No body


def test_get_payment_status_etag_mismatch(client, mock_payment_repo, sample_payment):
    """Test that ETag mismatch returns 200 with new data."""
    mock_payment_repo.get_by_order = AsyncMock(return_value=sample_payment)
    
    from app.api.v1.orders.payment_status import get_payment_repo
    client.app.dependency_overrides[get_payment_repo] = lambda: mock_payment_repo
    
    # Request with wrong ETag
    response = client.get(
        "/api/v1/orders/ORD-12345/payment",
        headers={"If-None-Match": 'W/"wrong-etag"'}
    )
    
    # Verify 200 (not 304)
    assert response.status_code == 200
    assert "ETag" in response.headers
    assert response.headers["ETag"] != 'W/"wrong-etag"'


def test_etag_changes_when_payment_updated(client, mock_payment_repo, sample_payment):
    """Test that ETag changes when payment is updated."""
    from app.api.v1.orders.payment_status import get_payment_repo, build_weak_etag
    client.app.dependency_overrides[get_payment_repo] = lambda: mock_payment_repo
    
    # First request
    mock_payment_repo.get_by_order = AsyncMock(return_value=sample_payment)
    response1 = client.get("/api/v1/orders/ORD-12345/payment")
    etag1 = response1.headers["ETag"]
    
    # Update payment status
    sample_payment.status = PaymentStatus.CAPTURED
    sample_payment.updatedAt = datetime(2025, 1, 25, 10, 10, 0, tzinfo=UTC)
    
    # Second request
    response2 = client.get("/api/v1/orders/ORD-12345/payment")
    etag2 = response2.headers["ETag"]
    
    # ETags should be different
    assert etag1 != etag2


# ============================================================================
# Error Tests
# ============================================================================

def test_get_payment_status_404_not_found(client, mock_payment_repo):
    """Test 404 when payment not found."""
    mock_payment_repo.get_by_order = AsyncMock(return_value=None)
    
    from app.api.v1.orders.payment_status import get_payment_repo
    client.app.dependency_overrides[get_payment_repo] = lambda: mock_payment_repo
    
    response = client.get("/api/v1/orders/ORD-99999/payment")
    
    # Verify 404
    assert response.status_code == 404
    assert response.headers["content-type"] == "application/problem+json"
    
    # Verify Problem Details
    data = response.json()
    assert data["type"] == "about:blank"
    assert data["title"] == "Not Found"
    assert data["status"] == 404
    assert "ORD-99999" in data["detail"]


def test_get_payment_status_400_invalid_order_id(client, mock_payment_repo):
    """Test 400 for invalid order ID."""
    from app.api.v1.orders.payment_status import get_payment_repo
    client.app.dependency_overrides[get_payment_repo] = lambda: mock_payment_repo
    
    # Empty order ID
    response = client.get("/api/v1/orders//payment")
    assert response.status_code == 404  # FastAPI route not found
    
    # Very short order ID
    response = client.get("/api/v1/orders/AB/payment")
    assert response.status_code == 400
    assert response.headers["content-type"] == "application/problem+json"
    
    data = response.json()
    assert data["status"] == 400
    assert "Invalid order ID" in data["detail"]


def test_get_payment_status_500_internal_error(client, mock_payment_repo):
    """Test 500 on internal error."""
    # Mock repository to raise exception
    mock_payment_repo.get_by_order = AsyncMock(side_effect=Exception("Database error"))
    
    from app.api.v1.orders.payment_status import get_payment_repo
    client.app.dependency_overrides[get_payment_repo] = lambda: mock_payment_repo
    
    response = client.get("/api/v1/orders/ORD-12345/payment")
    
    # Verify 500
    assert response.status_code == 500
    assert response.headers["content-type"] == "application/problem+json"
    
    data = response.json()
    assert data["status"] == 500
    assert data["title"] == "Internal Server Error"


# ============================================================================
# Metrics Tests
# ============================================================================

def test_get_payment_status_metrics_hit(client, mock_payment_repo, sample_payment):
    """Test that metrics are recorded for successful request."""
    mock_payment_repo.get_by_order = AsyncMock(return_value=sample_payment)
    
    from app.api.v1.orders.payment_status import get_payment_repo
    client.app.dependency_overrides[get_payment_repo] = lambda: mock_payment_repo
    
    with patch("app.api.v1.orders.payment_status.incr") as mock_incr:
        response = client.get("/api/v1/orders/ORD-12345/payment")
        
        assert response.status_code == 200
        
        # Verify metrics called
        assert mock_incr.call_count >= 2
        
        # Check for hit metric
        hit_calls = [call for call in mock_incr.call_args_list 
                    if "payment_status_query_total" in str(call) and "hit" in str(call)]
        assert len(hit_calls) > 0


def test_get_payment_status_metrics_not_found(client, mock_payment_repo):
    """Test that metrics are recorded for 404."""
    mock_payment_repo.get_by_order = AsyncMock(return_value=None)
    
    from app.api.v1.orders.payment_status import get_payment_repo
    client.app.dependency_overrides[get_payment_repo] = lambda: mock_payment_repo
    
    with patch("app.api.v1.orders.payment_status.incr") as mock_incr:
        response = client.get("/api/v1/orders/ORD-99999/payment")
        
        assert response.status_code == 404
        
        # Check for not_found metric
        not_found_calls = [call for call in mock_incr.call_args_list 
                          if "not_found" in str(call)]
        assert len(not_found_calls) > 0


def test_get_payment_status_metrics_not_modified(client, mock_payment_repo, sample_payment):
    """Test that metrics are recorded for 304."""
    mock_payment_repo.get_by_order = AsyncMock(return_value=sample_payment)
    
    from app.api.v1.orders.payment_status import get_payment_repo
    client.app.dependency_overrides[get_payment_repo] = lambda: mock_payment_repo
    
    # Get ETag first
    response1 = client.get("/api/v1/orders/ORD-12345/payment")
    etag = response1.headers["ETag"]
    
    with patch("app.api.v1.orders.payment_status.incr") as mock_incr:
        # Request with matching ETag
        response2 = client.get(
            "/api/v1/orders/ORD-12345/payment",
            headers={"If-None-Match": etag}
        )
        
        assert response2.status_code == 304
        
        # Check for not_modified metric
        not_modified_calls = [call for call in mock_incr.call_args_list 
                             if "not_modified" in str(call)]
        assert len(not_modified_calls) > 0


# ============================================================================
# Cache-Control Tests
# ============================================================================

def test_get_payment_status_cache_control_no_store(client, mock_payment_repo, sample_payment):
    """Test that Cache-Control: no-store is always set."""
    mock_payment_repo.get_by_order = AsyncMock(return_value=sample_payment)
    
    from app.api.v1.orders.payment_status import get_payment_repo
    client.app.dependency_overrides[get_payment_repo] = lambda: mock_payment_repo
    
    # 200 response
    response1 = client.get("/api/v1/orders/ORD-12345/payment")
    assert response1.headers["Cache-Control"] == "no-store"
    
    # 304 response
    etag = response1.headers["ETag"]
    response2 = client.get(
        "/api/v1/orders/ORD-12345/payment",
        headers={"If-None-Match": etag}
    )
    assert response2.headers["Cache-Control"] == "no-store"


# ============================================================================
# ETag Helper Tests
# ============================================================================

def test_build_weak_etag():
    """Test ETag generation."""
    from app.api.v1.orders.payment_status import build_weak_etag
    
    payment = Payment(
        id=ObjectId(),
        orderId="ORD-123",
        provider=PaymentProvider.iyzico,
        status=PaymentStatus.AUTHORIZED,
        amount=10000,
        currency="TRY",
        createdAt=datetime(2025, 1, 25, 10, 0, 0, tzinfo=UTC),
        updatedAt=datetime(2025, 1, 25, 10, 5, 0, tzinfo=UTC),
    )
    
    etag = build_weak_etag(payment)
    
    # Verify format
    assert etag.startswith('W/"')
    assert etag.endswith('"')
    assert len(etag) > 10  # W/"..." + hash
    
    # Verify deterministic
    etag2 = build_weak_etag(payment)
    assert etag == etag2
    
    # Verify changes with status
    payment.status = PaymentStatus.CAPTURED
    etag3 = build_weak_etag(payment)
    assert etag != etag3


def test_check_etag_match():
    """Test ETag matching logic."""
    from app.api.v1.orders.payment_status import check_etag_match
    
    current_etag = 'W/"abc123"'
    
    # Exact match
    assert check_etag_match('W/"abc123"', current_etag) is True
    
    # No match
    assert check_etag_match('W/"xyz789"', current_etag) is False
    
    # Wildcard
    assert check_etag_match("*", current_etag) is True
    
    # Multiple ETags (comma-separated)
    assert check_etag_match('W/"xyz789", W/"abc123"', current_etag) is True
    
    # None
    assert check_etag_match(None, current_etag) is False
    
    # Empty
    assert check_etag_match("", current_etag) is False
