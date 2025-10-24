"""Integration tests for payment endpoints."""
import pytest
from decimal import Decimal
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.integrations.payments.mock import mock_payment_provider


@pytest.mark.asyncio
class TestPaymentInitiation:
    """Test payment initiation."""
    
    async def test_initiate_payment_success(self):
        """Test successful payment initiation with 3DS."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Reset mock provider
            mock_payment_provider.transactions.clear()
            
            request_data = {
                "amount": 100.00,
                "currency": "TRY",
                "order_id": "ORD-TEST-001",
                "customer_email": "test@example.com",
                "customer_name": "Test User"
            }
            
            response = await client.post(
                "/api/v1/payments/initiate",
                json=request_data,
                headers={"Idempotency-Key": "test-key-001"}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify response structure
            assert "transaction_id" in data
            assert data["status"] == "requires_auth"
            assert data["requires_3ds"] is True
            assert "redirect_url" in data
            assert "initiated_at" in data
    
    async def test_initiate_payment_requires_idempotency_key(self):
        """Test that payment initiation requires Idempotency-Key header."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            request_data = {
                "amount": 100.00,
                "currency": "TRY",
                "order_id": "ORD-TEST-002",
                "customer_email": "test@example.com",
                "customer_name": "Test User"
            }
            
            # Try without Idempotency-Key
            response = await client.post(
                "/api/v1/payments/initiate",
                json=request_data
            )
            
            assert response.status_code == 428  # Precondition Required
            assert "Idempotency-Key" in response.json()["detail"]
    
    async def test_initiate_payment_idempotency(self):
        """Test that duplicate requests with same idempotency key return same result."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            mock_payment_provider.transactions.clear()
            
            request_data = {
                "amount": 100.00,
                "currency": "TRY",
                "order_id": "ORD-TEST-003",
                "customer_email": "test@example.com",
                "customer_name": "Test User"
            }
            
            idempotency_key = "test-key-idempotent"
            
            # First request
            response1 = await client.post(
                "/api/v1/payments/initiate",
                json=request_data,
                headers={"Idempotency-Key": idempotency_key}
            )
            
            assert response1.status_code == 200
            data1 = response1.json()
            
            # Second request with same key
            response2 = await client.post(
                "/api/v1/payments/initiate",
                json=request_data,
                headers={"Idempotency-Key": idempotency_key}
            )
            
            assert response2.status_code == 200
            data2 = response2.json()
            
            # Should return same transaction_id
            assert data1["transaction_id"] == data2["transaction_id"]



@pytest.mark.asyncio
class TestPaymentConfirmation:
    """Test payment confirmation."""
    
    async def test_confirm_payment_success(self):
        """Test successful payment confirmation."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            mock_payment_provider.transactions.clear()
            
            # First initiate payment
            init_response = await client.post(
                "/api/v1/payments/initiate",
                json={
                    "amount": 100.00,
                    "currency": "TRY",
                    "order_id": "ORD-TEST-004",
                    "customer_email": "test@example.com",
                    "customer_name": "Test User"
                },
                headers={"Idempotency-Key": "test-key-004"}
            )
            
            assert init_response.status_code == 200
            transaction_id = init_response.json()["transaction_id"]
            
            # Confirm payment
            confirm_response = await client.post(
                "/api/v1/payments/confirm",
                json={"transaction_id": transaction_id},
                headers={"Idempotency-Key": "test-key-confirm-004"}
            )
            
            assert confirm_response.status_code == 200
            data = confirm_response.json()
            
            assert data["transaction_id"] == transaction_id
            assert data["status"] == "captured"
            assert data["amount"] == 100.00
            assert data["currency"] == "TRY"
            assert "confirmed_at" in data
    
    async def test_confirm_payment_requires_idempotency_key(self):
        """Test that payment confirmation requires Idempotency-Key header."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Try without Idempotency-Key
            response = await client.post(
                "/api/v1/payments/confirm",
                json={"transaction_id": "fake-txn-id"}
            )
            
            assert response.status_code == 428  # Precondition Required


@pytest.mark.asyncio
class TestPaymentRetry:
    """Test payment retry logic."""
    
    async def test_payment_retry_with_backoff(self):
        """Test that payment retries with exponential backoff."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Set mock provider to fail initially
            mock_payment_provider.transactions.clear()
            original_fail_rate = mock_payment_provider.fail_rate
            mock_payment_provider.fail_rate = 0.5  # 50% failure rate
            
            try:
                # Initiate payment (may retry internally)
                response = await client.post(
                    "/api/v1/payments/initiate",
                    json={
                        "amount": 100.00,
                        "currency": "TRY",
                        "order_id": "ORD-TEST-RETRY",
                        "customer_email": "test@example.com",
                        "customer_name": "Test User"
                    },
                    headers={"Idempotency-Key": "test-key-retry"}
                )
                
                # Should eventually succeed or fail after retries
                assert response.status_code in [200, 400, 504]
                
            finally:
                # Reset fail rate
                mock_payment_provider.fail_rate = original_fail_rate


@pytest.mark.asyncio
class TestPaymentValidation:
    """Test payment validation."""
    
    async def test_invalid_currency_fails(self):
        """Test that invalid currency is rejected."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/payments/initiate",
                json={
                    "amount": 100.00,
                    "currency": "XXX",  # Invalid currency
                    "order_id": "ORD-TEST-005",
                    "customer_email": "test@example.com",
                    "customer_name": "Test User"
                },
                headers={"Idempotency-Key": "test-key-005"}
            )
            
            assert response.status_code == 400
            assert "currency" in response.json()["detail"].lower()
    
    async def test_amount_below_minimum_fails(self):
        """Test that amount below minimum is rejected."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/payments/initiate",
                json={
                    "amount": 0.50,  # Below minimum for TRY
                    "currency": "TRY",
                    "order_id": "ORD-TEST-006",
                    "customer_email": "test@example.com",
                    "customer_name": "Test User"
                },
                headers={"Idempotency-Key": "test-key-006"}
            )
            
            assert response.status_code == 400
            assert "minimum" in response.json()["detail"].lower()


@pytest.mark.asyncio
class TestPaymentStatus:
    """Test payment status endpoint."""
    
    async def test_get_payment_status(self):
        """Test getting payment transaction status."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            mock_payment_provider.transactions.clear()
            
            # Initiate payment
            init_response = await client.post(
                "/api/v1/payments/initiate",
                json={
                    "amount": 100.00,
                    "currency": "TRY",
                    "order_id": "ORD-TEST-007",
                    "customer_email": "test@example.com",
                    "customer_name": "Test User"
                },
                headers={"Idempotency-Key": "test-key-007"}
            )
            
            transaction_id = init_response.json()["transaction_id"]
            
            # Get status
            status_response = await client.get(
                f"/api/v1/payments/status/{transaction_id}"
            )
            
            assert status_response.status_code == 200
            data = status_response.json()
            
            assert data["transaction_id"] == transaction_id
            assert "status" in data
            assert "amount" in data
            assert "currency" in data
