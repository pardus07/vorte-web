# apps/backend/tests/test_sms_service.py
"""
Tests for SMS service with Netgsm → Verimor fallback.

Tests:
- Primary provider success
- Fallback on retryable errors
- No fallback on non-retryable errors
- Both providers fail
- Fallback disabled
"""
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.services.sms_service import SmsService, SmsMessage
from app.services.adapters.netgsm_adapter import NetgsmAdapter
from app.services.adapters.verimor_adapter import VerimorAdapter


@pytest.fixture
def mock_netgsm():
    """Mock Netgsm adapter."""
    adapter = MagicMock(spec=NetgsmAdapter)
    adapter.send_sms = AsyncMock()
    return adapter


@pytest.fixture
def mock_verimor():
    """Mock Verimor adapter."""
    adapter = MagicMock(spec=VerimorAdapter)
    adapter.send_sms = AsyncMock()
    return adapter


@pytest.fixture
def sms_service(mock_netgsm, mock_verimor):
    """Create SMS service with mocked adapters."""
    return SmsService(
        netgsm=mock_netgsm,
        verimor=mock_verimor,
        fallback_enabled=True,
        primary="netgsm",
    )


@pytest.mark.asyncio
async def test_primary_success_no_fallback(sms_service, mock_netgsm, mock_verimor):
    """Test successful send via primary provider (no fallback)."""
    # Mock successful Netgsm response
    mock_netgsm.send_sms.return_value = {
        "ok": True,
        "provider": "netgsm",
        "message_id": "123456789",
        "recipients": 1,
    }
    
    msg = SmsMessage(
        to=["05321234567"],
        text="Test message",
    )
    
    result = await sms_service.send_sms(msg)
    
    # Verify Netgsm was called
    assert mock_netgsm.send_sms.called
    assert result["provider"] == "netgsm"
    assert not result["is_fallback"]
    
    # Verify Verimor was NOT called
    assert not mock_verimor.send_sms.called


@pytest.mark.asyncio
async def test_primary_retryable_failure_triggers_fallback(
    sms_service, mock_netgsm, mock_verimor
):
    """Test fallback on retryable error (429)."""
    # Mock Netgsm failure with 429
    error = Exception("Rate limit exceeded")
    error.status_code = 429
    mock_netgsm.send_sms.side_effect = error
    
    # Mock successful Verimor response
    mock_verimor.send_sms.return_value = "987654321"  # Campaign ID
    
    msg = SmsMessage(
        to=["05321234567"],
        text="Test message",
    )
    
    result = await sms_service.send_sms(msg)
    
    # Verify both providers were called
    assert mock_netgsm.send_sms.called
    assert mock_verimor.send_sms.called
    
    # Verify fallback was used
    assert result["provider"] == "verimor"
    assert result["is_fallback"]


@pytest.mark.asyncio
async def test_primary_5xx_failure_triggers_fallback(
    sms_service, mock_netgsm, mock_verimor
):
    """Test fallback on 5xx error."""
    # Mock Netgsm failure with 503
    error = Exception("Service unavailable")
    error.status_code = 503
    mock_netgsm.send_sms.side_effect = error
    
    # Mock successful Verimor response
    mock_verimor.send_sms.return_value = "987654321"
    
    msg = SmsMessage(
        to=["05321234567"],
        text="Test message",
    )
    
    result = await sms_service.send_sms(msg)
    
    # Verify fallback was used
    assert result["provider"] == "verimor"
    assert result["is_fallback"]


@pytest.mark.asyncio
async def test_primary_non_retryable_failure_no_fallback(
    sms_service, mock_netgsm, mock_verimor
):
    """Test no fallback on non-retryable error (4xx)."""
    # Mock Netgsm failure with 400
    error = Exception("Invalid parameters")
    error.status_code = 400
    mock_netgsm.send_sms.side_effect = error
    
    msg = SmsMessage(
        to=["05321234567"],
        text="Test message",
    )
    
    # Should raise immediately without fallback
    with pytest.raises(Exception) as exc_info:
        await sms_service.send_sms(msg)
    
    assert "Invalid parameters" in str(exc_info.value)
    
    # Verify Netgsm was called
    assert mock_netgsm.send_sms.called
    
    # Verify Verimor was NOT called
    assert not mock_verimor.send_sms.called


@pytest.mark.asyncio
async def test_both_providers_fail(sms_service, mock_netgsm, mock_verimor):
    """Test when both providers fail."""
    # Mock both providers failing
    netgsm_error = Exception("Netgsm error")
    netgsm_error.status_code = 503
    mock_netgsm.send_sms.side_effect = netgsm_error
    
    verimor_error = Exception("Verimor error")
    verimor_error.status_code = 503
    mock_verimor.send_sms.side_effect = verimor_error
    
    msg = SmsMessage(
        to=["05321234567"],
        text="Test message",
    )
    
    # Should raise last error
    with pytest.raises(Exception) as exc_info:
        await sms_service.send_sms(msg)
    
    # Verify both providers were called
    assert mock_netgsm.send_sms.called
    assert mock_verimor.send_sms.called


@pytest.mark.asyncio
async def test_fallback_disabled(mock_netgsm, mock_verimor):
    """Test with fallback disabled."""
    service = SmsService(
        netgsm=mock_netgsm,
        verimor=mock_verimor,
        fallback_enabled=False,
        primary="netgsm",
    )
    
    # Mock Netgsm failure
    error = Exception("Netgsm error")
    error.status_code = 503
    mock_netgsm.send_sms.side_effect = error
    
    msg = SmsMessage(
        to=["05321234567"],
        text="Test message",
    )
    
    # Should raise immediately without fallback
    with pytest.raises(Exception):
        await service.send_sms(msg)
    
    # Verify only Netgsm was called
    assert mock_netgsm.send_sms.called
    assert not mock_verimor.send_sms.called


@pytest.mark.asyncio
async def test_verimor_as_primary(mock_netgsm, mock_verimor):
    """Test with Verimor as primary provider."""
    service = SmsService(
        netgsm=mock_netgsm,
        verimor=mock_verimor,
        fallback_enabled=True,
        primary="verimor",
    )
    
    # Mock successful Verimor response
    mock_verimor.send_sms.return_value = "987654321"
    
    msg = SmsMessage(
        to=["05321234567"],
        text="Test message",
    )
    
    result = await service.send_sms(msg)
    
    # Verify Verimor was called as primary
    assert mock_verimor.send_sms.called
    assert result["provider"] == "verimor"
    assert not result["is_fallback"]
    
    # Verify Netgsm was NOT called
    assert not mock_netgsm.send_sms.called


@pytest.mark.asyncio
async def test_timeout_error_triggers_fallback(sms_service, mock_netgsm, mock_verimor):
    """Test fallback on timeout error."""
    # Mock Netgsm timeout
    mock_netgsm.send_sms.side_effect = Exception("Request timed out")
    
    # Mock successful Verimor response
    mock_verimor.send_sms.return_value = "987654321"
    
    msg = SmsMessage(
        to=["05321234567"],
        text="Test message",
    )
    
    result = await sms_service.send_sms(msg)
    
    # Verify fallback was used
    assert result["provider"] == "verimor"
    assert result["is_fallback"]


@pytest.mark.asyncio
async def test_circuit_breaker_error_triggers_fallback(
    sms_service, mock_netgsm, mock_verimor
):
    """Test fallback on circuit breaker open."""
    # Mock Netgsm circuit breaker open
    mock_netgsm.send_sms.side_effect = Exception("Circuit breaker open")
    
    # Mock successful Verimor response
    mock_verimor.send_sms.return_value = "987654321"
    
    msg = SmsMessage(
        to=["05321234567"],
        text="Test message",
    )
    
    result = await sms_service.send_sms(msg)
    
    # Verify fallback was used
    assert result["provider"] == "verimor"
    assert result["is_fallback"]


@pytest.mark.asyncio
async def test_insufficient_credits_triggers_fallback(
    sms_service, mock_netgsm, mock_verimor
):
    """Test fallback on insufficient credits."""
    # Mock Netgsm insufficient credits (error code 50)
    mock_netgsm.send_sms.side_effect = Exception("Netgsm error 50: Insufficient credits")
    
    # Mock successful Verimor response
    mock_verimor.send_sms.return_value = "987654321"
    
    msg = SmsMessage(
        to=["05321234567"],
        text="Test message",
    )
    
    result = await sms_service.send_sms(msg)
    
    # Verify fallback was used
    assert result["provider"] == "verimor"
    assert result["is_fallback"]


@pytest.mark.asyncio
async def test_sms_with_iys_parameters(sms_service, mock_netgsm, mock_verimor):
    """Test SMS with İYS parameters."""
    # Mock successful Netgsm response
    mock_netgsm.send_sms.return_value = {
        "ok": True,
        "provider": "netgsm",
        "message_id": "123456789",
        "recipients": 1,
    }
    
    msg = SmsMessage(
        to=["05321234567"],
        text="Kampanya mesajı",
        is_commercial=True,
        iys_recipient_type="TACIR",
    )
    
    result = await sms_service.send_sms(msg)
    
    # Verify Netgsm was called
    assert mock_netgsm.send_sms.called
    assert result["provider"] == "netgsm"
