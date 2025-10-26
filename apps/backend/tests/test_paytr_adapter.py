# apps/backend/tests/test_paytr_adapter.py
"""
Tests for PayTR adapter.

Validates:
- Token generation for payment initialization
- Callback hash validation (timing-safe)
- Form parameter generation
"""
import base64
import hashlib
import hmac
import json
import pytest

from app.services.adapters.paytr_adapter import PayTRAdapter


@pytest.fixture
def paytr_adapter():
    """Create PayTR adapter with test credentials."""
    return PayTRAdapter(
        merchant_id="123456",
        merchant_key="test_key_12345",
        merchant_salt="test_salt_67890",
        test_mode=True,
    )


def test_initialize_payment_generates_valid_token(paytr_adapter):
    """Test that initialize_payment generates correct token."""
    form_params = paytr_adapter.initialize_payment(
        merchant_oid="order-123",
        email="test@example.com",
        payment_amount=10000,  # 100.00 TL
        user_basket=[
            {"name": "Product 1", "price": "10000", "quantity": 1}
        ],
        user_ip="127.0.0.1",
        merchant_ok_url="https://example.com/success",
        merchant_fail_url="https://example.com/fail",
    )
    
    # Verify required fields
    assert form_params["merchant_id"] == "123456"
    assert form_params["merchant_oid"] == "order-123"
    assert form_params["email"] == "test@example.com"
    assert form_params["payment_amount"] == "10000"
    assert form_params["test_mode"] == "1"
    assert "paytr_token" in form_params
    assert len(form_params["paytr_token"]) > 0


def test_initialize_payment_encodes_basket_base64(paytr_adapter):
    """Test that user_basket is Base64 encoded."""
    basket = [
        {"name": "Product 1", "price": "5000", "quantity": 2},
        {"name": "Product 2", "price": "3000", "quantity": 1},
    ]
    
    form_params = paytr_adapter.initialize_payment(
        merchant_oid="order-456",
        email="test@example.com",
        payment_amount=13000,
        user_basket=basket,
        user_ip="127.0.0.1",
        merchant_ok_url="https://example.com/success",
        merchant_fail_url="https://example.com/fail",
    )
    
    # Decode and verify basket
    basket_b64 = form_params["user_basket"]
    basket_decoded = json.loads(base64.b64decode(basket_b64).decode("utf-8"))
    
    assert basket_decoded == basket


def test_validate_callback_hash_with_valid_hash(paytr_adapter):
    """Test callback hash validation with correct hash."""
    merchant_oid = "order-789"
    status = "success"
    total_amount = "10000"
    
    # Generate expected hash (same as PayTR would)
    hash_plain = f"{merchant_oid}{paytr_adapter.merchant_salt}{status}{total_amount}"
    expected_hash = base64.b64encode(
        hmac.new(
            paytr_adapter.merchant_salt.encode("utf-8"),
            hash_plain.encode("utf-8"),
            hashlib.sha256,
        ).digest()
    ).decode("ascii")
    
    # Validate
    is_valid = paytr_adapter.validate_callback_hash(
        merchant_oid=merchant_oid,
        status=status,
        total_amount=total_amount,
        hash_value=expected_hash,
    )
    
    assert is_valid is True


def test_validate_callback_hash_with_invalid_hash(paytr_adapter):
    """Test callback hash validation with incorrect hash."""
    is_valid = paytr_adapter.validate_callback_hash(
        merchant_oid="order-789",
        status="success",
        total_amount="10000",
        hash_value="invalid_hash_12345",
    )
    
    assert is_valid is False


def test_validate_callback_hash_with_tampered_amount(paytr_adapter):
    """Test callback hash validation detects tampered amount."""
    merchant_oid = "order-789"
    status = "success"
    original_amount = "10000"
    tampered_amount = "50000"  # Attacker tries to change amount
    
    # Generate hash with original amount
    hash_plain = f"{merchant_oid}{paytr_adapter.merchant_salt}{status}{original_amount}"
    valid_hash = base64.b64encode(
        hmac.new(
            paytr_adapter.merchant_salt.encode("utf-8"),
            hash_plain.encode("utf-8"),
            hashlib.sha256,
        ).digest()
    ).decode("ascii")
    
    # Try to validate with tampered amount
    is_valid = paytr_adapter.validate_callback_hash(
        merchant_oid=merchant_oid,
        status=status,
        total_amount=tampered_amount,  # Tampered
        hash_value=valid_hash,
    )
    
    assert is_valid is False


def test_initialize_payment_with_installments(paytr_adapter):
    """Test payment initialization with installment options."""
    form_params = paytr_adapter.initialize_payment(
        merchant_oid="order-999",
        email="test@example.com",
        payment_amount=50000,  # 500.00 TL
        user_basket=[{"name": "Expensive Product", "price": "50000", "quantity": 1}],
        user_ip="127.0.0.1",
        merchant_ok_url="https://example.com/success",
        merchant_fail_url="https://example.com/fail",
        no_installment=0,  # Allow installments
        max_installment=6,  # Max 6 installments
    )
    
    assert form_params["no_installment"] == "0"
    assert form_params["max_installment"] == "6"


def test_initialize_payment_production_mode():
    """Test payment initialization in production mode."""
    adapter = PayTRAdapter(
        merchant_id="123456",
        merchant_key="test_key",
        merchant_salt="test_salt",
        test_mode=False,  # Production
    )
    
    form_params = adapter.initialize_payment(
        merchant_oid="order-prod",
        email="test@example.com",
        payment_amount=10000,
        user_basket=[{"name": "Product", "price": "10000", "quantity": 1}],
        user_ip="127.0.0.1",
        merchant_ok_url="https://example.com/success",
        merchant_fail_url="https://example.com/fail",
    )
    
    assert form_params["test_mode"] == "0"


def test_token_generation_is_deterministic(paytr_adapter):
    """Test that same parameters generate same token."""
    params = {
        "merchant_oid": "order-det",
        "email": "test@example.com",
        "payment_amount": 10000,
        "user_basket": [{"name": "Product", "price": "10000", "quantity": 1}],
        "user_ip": "127.0.0.1",
        "merchant_ok_url": "https://example.com/success",
        "merchant_fail_url": "https://example.com/fail",
    }
    
    form1 = paytr_adapter.initialize_payment(**params)
    form2 = paytr_adapter.initialize_payment(**params)
    
    assert form1["paytr_token"] == form2["paytr_token"]



# Integration Tests

@pytest.mark.asyncio
async def test_status_inquiry_success(paytr_adapter):
    """Test PayTR status inquiry with successful payment."""
    import httpx
    from unittest.mock import AsyncMock, patch, MagicMock
    
    # Mock successful response
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "status": "success",
        "merchant_oid": "order-123",
        "amount": "10000",
        "currency": "TL",
        "payment_type": "card",
        "installment_count": "0",
        "net_amount": "9800",
        "payment_date": "2024-10-24 15:30:00"
    }
    mock_response.raise_for_status = MagicMock()
    
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_response)):
        result = await paytr_adapter.status_inquiry("order-123")
        
        assert result["status"] == "success"
        assert result["merchant_oid"] == "order-123"
        assert result["amount"] == "10000"


@pytest.mark.asyncio
async def test_status_inquiry_failed_payment(paytr_adapter):
    """Test PayTR status inquiry with failed payment."""
    import httpx
    from unittest.mock import AsyncMock, patch, MagicMock
    
    # Mock failed response
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "status": "failed",
        "merchant_oid": "order-456",
        "reason": "Insufficient funds"
    }
    mock_response.raise_for_status = MagicMock()
    
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_response)):
        with pytest.raises(ValueError, match="PayTR status inquiry failed"):
            await paytr_adapter.status_inquiry("order-456")


@pytest.mark.asyncio
async def test_status_inquiry_invalid_json(paytr_adapter):
    """Test PayTR status inquiry with invalid JSON response."""
    import httpx
    import json
    from unittest.mock import AsyncMock, patch, MagicMock
    
    # Mock invalid JSON response
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.text = "Invalid JSON"
    mock_response.json.side_effect = json.JSONDecodeError("Invalid", "", 0)
    mock_response.raise_for_status = MagicMock()
    
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_response)):
        with pytest.raises(ValueError, match="Invalid JSON response"):
            await paytr_adapter.status_inquiry("order-789")


@pytest.mark.asyncio
async def test_status_inquiry_network_error(paytr_adapter):
    """Test PayTR status inquiry with network error."""
    import httpx
    from unittest.mock import AsyncMock, patch
    
    with patch("httpx.AsyncClient.post", new=AsyncMock(side_effect=httpx.ConnectTimeout("Connection timeout"))):
        with pytest.raises(httpx.ConnectTimeout):
            await paytr_adapter.status_inquiry("order-error")
