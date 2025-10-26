# apps/backend/tests/test_notification_provider_mocks.py
"""
Tests for notification providers with HTTP mocking (respx).

Tests:
- SendGrid: Success, rate limit (429), server error (5xx), fallback to SES
- Netgsm: Success, auth failure, rate limit
- Verimor: Success, invalid credentials
- Fallback behavior: Primary fails → Secondary succeeds
"""
import pytest
import respx
import httpx
from unittest.mock import AsyncMock, patch

from app.services.notification_service import NotificationService, EmailMessage
from app.services.adapters.sendgrid_adapter import SendGridAdapter
from app.services.adapters.ses_adapter import SESAdapter
from app.services.adapters.netgsm_adapter import NetgsmAdapter
from app.services.adapters.verimor_adapter import VerimorAdapter
from app.services.sms_service import SmsService, SmsMessage


# ============================================================================
# SendGrid Tests
# ============================================================================

@pytest.mark.asyncio
@respx.mock
async def test_sendgrid_success():
    """Test SendGrid successful email send."""
    # Mock SendGrid API
    route = respx.post("https://api.eu.sendgrid.com/v3/mail/send").mock(
        return_value=httpx.Response(202, json={"message": "success"})
    )
    
    # Create adapter and service
    adapter = SendGridAdapter(api_key="test_key")
    service = NotificationService(sendgrid=adapter, ses=None, primary="sendgrid")
    
    # Send email
    msg = EmailMessage(
        to="test@example.com",
        subject="Test",
        html="<p>Test</p>",
        text="Test",
    )
    
    result = await service.send_email(msg)
    
    # Verify
    assert result["provider"] == "sendgrid"
    assert route.called
    assert route.call_count == 1


@pytest.mark.asyncio
@respx.mock
async def test_sendgrid_rate_limit_fallback_to_ses():
    """Test SendGrid rate limit (429) triggers fallback to SES."""
    # Mock SendGrid to return 429
    sendgrid_route = respx.post("https://api.eu.sendgrid.com/v3/mail/send").mock(
        return_value=httpx.Response(429, json={"error": "Rate limit exceeded"})
    )
    
    # Mock SES (boto3) to succeed
    mock_ses_client = AsyncMock()
    mock_ses_client.send_email = AsyncMock(return_value={"MessageId": "ses_msg_id"})
    
    # Create adapters
    sendgrid = SendGridAdapter(api_key="test_key")
    ses = SESAdapter()
    
    # Patch boto3 client
    with patch.object(ses, "client", mock_ses_client):
        service = NotificationService(
            sendgrid=sendgrid,
            ses=ses,
            primary="sendgrid",
            fallback_enabled=True,
        )
        
        # Send email
        msg = EmailMessage(
            to="test@example.com",
            subject="Test",
            html="<p>Test</p>",
            text="Test",
        )
        
        result = await service.send_email(msg)
        
        # Verify fallback to SES
        assert result["provider"] == "ses"
        assert result["is_fallback"] is True
        assert sendgrid_route.called
        mock_ses_client.send_email.assert_called_once()


@pytest.mark.asyncio
@respx.mock
async def test_sendgrid_server_error_fallback():
    """Test SendGrid 5xx error triggers fallback."""
    # Mock SendGrid to return 503
    sendgrid_route = respx.post("https://api.eu.sendgrid.com/v3/mail/send").mock(
        return_value=httpx.Response(503, json={"error": "Service unavailable"})
    )
    
    # Mock SES to succeed
    mock_ses_client = AsyncMock()
    mock_ses_client.send_email = AsyncMock(return_value={"MessageId": "ses_msg_id"})
    
    sendgrid = SendGridAdapter(api_key="test_key")
    ses = SESAdapter()
    
    with patch.object(ses, "client", mock_ses_client):
        service = NotificationService(
            sendgrid=sendgrid,
            ses=ses,
            primary="sendgrid",
            fallback_enabled=True,
        )
        
        msg = EmailMessage(
            to="test@example.com",
            subject="Test",
            html="<p>Test</p>",
        )
        
        result = await service.send_email(msg)
        
        # Verify fallback
        assert result["provider"] == "ses"
        assert result["is_fallback"] is True


@pytest.mark.asyncio
@respx.mock
async def test_sendgrid_client_error_no_fallback():
    """Test SendGrid 4xx error does NOT trigger fallback."""
    # Mock SendGrid to return 400 (client error)
    sendgrid_route = respx.post("https://api.eu.sendgrid.com/v3/mail/send").mock(
        return_value=httpx.Response(400, json={"error": "Invalid request"})
    )
    
    # Mock SES (should not be called)
    mock_ses_client = AsyncMock()
    mock_ses_client.send_email = AsyncMock()
    
    sendgrid = SendGridAdapter(api_key="test_key")
    ses = SESAdapter()
    
    with patch.object(ses, "client", mock_ses_client):
        service = NotificationService(
            sendgrid=sendgrid,
            ses=ses,
            primary="sendgrid",
            fallback_enabled=True,
        )
        
        msg = EmailMessage(
            to="test@example.com",
            subject="Test",
            html="<p>Test</p>",
        )
        
        # Should raise exception (no fallback for 4xx)
        with pytest.raises(Exception):
            await service.send_email(msg)
        
        # Verify SES not called
        mock_ses_client.send_email.assert_not_called()


# ============================================================================
# Netgsm Tests
# ============================================================================

@pytest.mark.asyncio
@respx.mock
async def test_netgsm_success():
    """Test Netgsm successful SMS send."""
    # Mock Netgsm API
    route = respx.post("https://api.netgsm.com.tr/sms/send/otp").mock(
        return_value=httpx.Response(200, text="00 OK 12345678")
    )
    
    # Create adapter
    adapter = NetgsmAdapter(
        username="test_user",
        password="test_pass",
        sender="TEST",
    )
    
    # Send SMS
    result = await adapter.send_sms(
        to=["+905551234567"],
        text="Test SMS",
    )
    
    # Verify
    assert result["status"] == "00"
    assert "bulkid" in result
    assert route.called


@pytest.mark.asyncio
@respx.mock
async def test_netgsm_auth_failure():
    """Test Netgsm authentication failure."""
    # Mock Netgsm to return auth error
    route = respx.post("https://api.netgsm.com.tr/sms/send/otp").mock(
        return_value=httpx.Response(200, text="30 Invalid credentials")
    )
    
    adapter = NetgsmAdapter(
        username="invalid_user",
        password="invalid_pass",
        sender="TEST",
    )
    
    # Should raise exception
    with pytest.raises(Exception) as exc_info:
        await adapter.send_sms(
            to=["+905551234567"],
            text="Test SMS",
        )
    
    assert "30" in str(exc_info.value) or "credentials" in str(exc_info.value).lower()


@pytest.mark.asyncio
@respx.mock
async def test_netgsm_rate_limit():
    """Test Netgsm rate limit handling."""
    # Mock Netgsm to return rate limit error
    route = respx.post("https://api.netgsm.com.tr/sms/send/otp").mock(
        return_value=httpx.Response(200, text="80 Message limit exceeded")
    )
    
    adapter = NetgsmAdapter(
        username="test_user",
        password="test_pass",
        sender="TEST",
    )
    
    # Should raise exception
    with pytest.raises(Exception) as exc_info:
        await adapter.send_sms(
            to=["+905551234567"],
            text="Test SMS",
        )
    
    assert "80" in str(exc_info.value) or "limit" in str(exc_info.value).lower()


# ============================================================================
# Verimor Tests
# ============================================================================

@pytest.mark.asyncio
@respx.mock
async def test_verimor_success():
    """Test Verimor successful SMS send."""
    # Mock Verimor API
    route = respx.post("https://sms.verimor.com.tr/v2/send.json").mock(
        return_value=httpx.Response(200, json={
            "status": "success",
            "message_id": "verimor_msg_123",
        })
    )
    
    # Create adapter
    adapter = VerimorAdapter(
        username="test_user",
        password="test_pass",
        sender="TEST",
    )
    
    # Send SMS
    result = await adapter.send_sms(
        to=["+905551234567"],
        text="Test SMS",
    )
    
    # Verify
    assert result["status"] == "success"
    assert "message_id" in result
    assert route.called


@pytest.mark.asyncio
@respx.mock
async def test_verimor_invalid_credentials():
    """Test Verimor invalid credentials."""
    # Mock Verimor to return auth error
    route = respx.post("https://sms.verimor.com.tr/v2/send.json").mock(
        return_value=httpx.Response(401, json={
            "status": "error",
            "message": "Invalid credentials",
        })
    )
    
    adapter = VerimorAdapter(
        username="invalid_user",
        password="invalid_pass",
        sender="TEST",
    )
    
    # Should raise exception
    with pytest.raises(Exception):
        await adapter.send_sms(
            to=["+905551234567"],
            text="Test SMS",
        )


# ============================================================================
# SMS Service Fallback Tests
# ============================================================================

@pytest.mark.asyncio
@respx.mock
async def test_sms_service_fallback_netgsm_to_verimor():
    """Test SMS service fallback from Netgsm to Verimor."""
    # Mock Netgsm to fail
    netgsm_route = respx.post("https://api.netgsm.com.tr/sms/send/otp").mock(
        return_value=httpx.Response(200, text="30 Invalid credentials")
    )
    
    # Mock Verimor to succeed
    verimor_route = respx.post("https://sms.verimor.com.tr/v2/send.json").mock(
        return_value=httpx.Response(200, json={
            "status": "success",
            "message_id": "verimor_msg_123",
        })
    )
    
    # Create adapters
    netgsm = NetgsmAdapter(
        username="test_user",
        password="test_pass",
        sender="TEST",
    )
    verimor = VerimorAdapter(
        username="test_user",
        password="test_pass",
        sender="TEST",
    )
    
    # Create SMS service with fallback
    sms_service = SmsService(
        netgsm=netgsm,
        verimor=verimor,
        primary="netgsm",
    )
    
    # Send SMS
    msg = SmsMessage(
        to=["+905551234567"],
        text="Test SMS",
    )
    
    result = await sms_service.send_sms(msg)
    
    # Verify fallback to Verimor
    assert result["provider"] == "verimor"
    assert result["is_fallback"] is True
    assert netgsm_route.called
    assert verimor_route.called


@pytest.mark.asyncio
@respx.mock
async def test_sms_service_both_providers_fail():
    """Test SMS service when both providers fail."""
    # Mock both to fail
    netgsm_route = respx.post("https://api.netgsm.com.tr/sms/send/otp").mock(
        return_value=httpx.Response(200, text="30 Invalid credentials")
    )
    
    verimor_route = respx.post("https://sms.verimor.com.tr/v2/send.json").mock(
        return_value=httpx.Response(500, json={"error": "Internal server error"})
    )
    
    netgsm = NetgsmAdapter(
        username="test_user",
        password="test_pass",
        sender="TEST",
    )
    verimor = VerimorAdapter(
        username="test_user",
        password="test_pass",
        sender="TEST",
    )
    
    sms_service = SmsService(
        netgsm=netgsm,
        verimor=verimor,
        primary="netgsm",
    )
    
    msg = SmsMessage(
        to=["+905551234567"],
        text="Test SMS",
    )
    
    # Should raise exception
    with pytest.raises(Exception):
        await sms_service.send_sms(msg)
    
    # Both should be called
    assert netgsm_route.called
    assert verimor_route.called


# ============================================================================
# Edge Cases
# ============================================================================

@pytest.mark.asyncio
@respx.mock
async def test_sendgrid_timeout_fallback():
    """Test SendGrid timeout triggers fallback."""
    # Mock SendGrid to timeout
    sendgrid_route = respx.post("https://api.eu.sendgrid.com/v3/mail/send").mock(
        side_effect=httpx.TimeoutException("Request timeout")
    )
    
    # Mock SES to succeed
    mock_ses_client = AsyncMock()
    mock_ses_client.send_email = AsyncMock(return_value={"MessageId": "ses_msg_id"})
    
    sendgrid = SendGridAdapter(api_key="test_key")
    ses = SESAdapter()
    
    with patch.object(ses, "client", mock_ses_client):
        service = NotificationService(
            sendgrid=sendgrid,
            ses=ses,
            primary="sendgrid",
            fallback_enabled=True,
        )
        
        msg = EmailMessage(
            to="test@example.com",
            subject="Test",
            html="<p>Test</p>",
        )
        
        result = await service.send_email(msg)
        
        # Verify fallback
        assert result["provider"] == "ses"
        assert result["is_fallback"] is True


@pytest.mark.asyncio
async def test_notification_service_fallback_disabled():
    """Test that fallback can be disabled."""
    # Mock SendGrid to fail
    sendgrid = AsyncMock(spec=SendGridAdapter)
    sendgrid.send_email = AsyncMock(side_effect=Exception("SendGrid failed"))
    
    ses = AsyncMock(spec=SESAdapter)
    ses.send_email = AsyncMock(return_value={"MessageId": "ses_msg_id"})
    
    # Create service with fallback disabled
    service = NotificationService(
        sendgrid=sendgrid,
        ses=ses,
        primary="sendgrid",
        fallback_enabled=False,
    )
    
    msg = EmailMessage(
        to="test@example.com",
        subject="Test",
        html="<p>Test</p>",
    )
    
    # Should raise exception (no fallback)
    with pytest.raises(Exception):
        await service.send_email(msg)
    
    # SES should not be called
    ses.send_email.assert_not_called()
