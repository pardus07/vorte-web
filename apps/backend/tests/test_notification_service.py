# apps/backend/tests/test_notification_service.py
"""
Tests for NotificationService with fallback logic.

Tests:
- Primary success (no fallback)
- Primary retryable failure triggers fallback
- Primary non-retryable failure (no fallback)
- Both providers fail
- Fallback disabled
- SES as primary
"""
import pytest
from typing import Optional
from unittest.mock import AsyncMock, MagicMock

from app.services.notification_service import NotificationService, EmailMessage


class MockAdapter:
    """Mock email adapter for testing."""
    
    def __init__(self, name: str, should_fail: bool = False, status_code: Optional[int] = None):
        self.name = name
        self.should_fail = should_fail
        self.status_code = status_code
        self.send_email = AsyncMock()
        
        if should_fail:
            error = RuntimeError(f"{name} failed")
            if status_code:
                setattr(error, "status_code", status_code)
            self.send_email.side_effect = error
        else:
            self.send_email.return_value = {
                "message_id": f"{name}_msg_123",
                "status": "sent",
            }
    
    def mask_email(self, email: str) -> str:
        return "te**@ex**.com"


@pytest.mark.asyncio
async def test_primary_success_no_fallback():
    """Test that successful primary send doesn't trigger fallback."""
    sendgrid = MockAdapter("sendgrid")
    ses = MockAdapter("ses")
    
    service = NotificationService(
        sendgrid=sendgrid,
        ses=ses,
        fallback_enabled=True,
    )
    
    msg = EmailMessage(
        to="test@example.com",
        subject="Test",
        html="<p>Test</p>",
    )
    
    result = await service.send_email(msg)
    
    assert result["provider"] == "sendgrid"
    assert result["is_fallback"] is False
    assert sendgrid.send_email.called
    assert not ses.send_email.called


@pytest.mark.asyncio
async def test_primary_retryable_failure_triggers_fallback():
    """Test that retryable error (429) triggers fallback to SES."""
    sendgrid = MockAdapter("sendgrid", should_fail=True, status_code=429)
    ses = MockAdapter("ses")
    
    service = NotificationService(
        sendgrid=sendgrid,
        ses=ses,
        fallback_enabled=True,
    )
    
    msg = EmailMessage(
        to="test@example.com",
        subject="Test",
        html="<p>Test</p>",
    )
    
    result = await service.send_email(msg)
    
    assert result["provider"] == "ses"
    assert result["is_fallback"] is True
    assert sendgrid.send_email.called
    assert ses.send_email.called


@pytest.mark.asyncio
async def test_primary_5xx_failure_triggers_fallback():
    """Test that 5xx error triggers fallback."""
    sendgrid = MockAdapter("sendgrid", should_fail=True, status_code=503)
    ses = MockAdapter("ses")
    
    service = NotificationService(
        sendgrid=sendgrid,
        ses=ses,
        fallback_enabled=True,
    )
    
    msg = EmailMessage(
        to="test@example.com",
        subject="Test",
        html="<p>Test</p>",
    )
    
    result = await service.send_email(msg)
    
    assert result["provider"] == "ses"
    assert result["is_fallback"] is True


@pytest.mark.asyncio
async def test_primary_non_retryable_failure_no_fallback():
    """Test that 4xx error doesn't trigger fallback."""
    sendgrid = MockAdapter("sendgrid", should_fail=True, status_code=400)
    ses = MockAdapter("ses")
    
    service = NotificationService(
        sendgrid=sendgrid,
        ses=ses,
        fallback_enabled=True,
    )
    
    msg = EmailMessage(
        to="test@example.com",
        subject="Test",
        html="<p>Test</p>",
    )
    
    with pytest.raises(RuntimeError):
        await service.send_email(msg)
    
    assert sendgrid.send_email.called
    assert not ses.send_email.called


@pytest.mark.asyncio
async def test_both_providers_fail():
    """Test that error is raised when both providers fail."""
    sendgrid = MockAdapter("sendgrid", should_fail=True, status_code=503)
    ses = MockAdapter("ses", should_fail=True, status_code=503)
    
    service = NotificationService(
        sendgrid=sendgrid,
        ses=ses,
        fallback_enabled=True,
    )
    
    msg = EmailMessage(
        to="test@example.com",
        subject="Test",
        html="<p>Test</p>",
    )
    
    with pytest.raises(RuntimeError):
        await service.send_email(msg)
    
    assert sendgrid.send_email.called
    assert ses.send_email.called


@pytest.mark.asyncio
async def test_fallback_disabled():
    """Test that fallback doesn't trigger when disabled."""
    sendgrid = MockAdapter("sendgrid", should_fail=True, status_code=429)
    ses = MockAdapter("ses")
    
    service = NotificationService(
        sendgrid=sendgrid,
        ses=ses,
        fallback_enabled=False,
    )
    
    msg = EmailMessage(
        to="test@example.com",
        subject="Test",
        html="<p>Test</p>",
    )
    
    with pytest.raises(RuntimeError):
        await service.send_email(msg)
    
    assert sendgrid.send_email.called
    assert not ses.send_email.called


@pytest.mark.asyncio
async def test_ses_as_primary():
    """Test using SES as primary provider."""
    sendgrid = MockAdapter("sendgrid")
    ses = MockAdapter("ses")
    
    service = NotificationService(
        sendgrid=sendgrid,
        ses=ses,
        fallback_enabled=True,
        primary="ses",
    )
    
    msg = EmailMessage(
        to="test@example.com",
        subject="Test",
        html="<p>Test</p>",
    )
    
    result = await service.send_email(msg)
    
    assert result["provider"] == "ses"
    assert result["is_fallback"] is False
    assert ses.send_email.called
    assert not sendgrid.send_email.called


@pytest.mark.asyncio
async def test_timeout_error_triggers_fallback():
    """Test that timeout error triggers fallback."""
    sendgrid = MockAdapter("sendgrid")
    sendgrid.send_email.side_effect = RuntimeError("Connection timeout")
    ses = MockAdapter("ses")
    
    service = NotificationService(
        sendgrid=sendgrid,
        ses=ses,
        fallback_enabled=True,
    )
    
    msg = EmailMessage(
        to="test@example.com",
        subject="Test",
        html="<p>Test</p>",
    )
    
    result = await service.send_email(msg)
    
    assert result["provider"] == "ses"
    assert result["is_fallback"] is True


@pytest.mark.asyncio
async def test_circuit_breaker_error_triggers_fallback():
    """Test that circuit breaker error triggers fallback."""
    sendgrid = MockAdapter("sendgrid")
    sendgrid.send_email.side_effect = RuntimeError("Circuit breaker is OPEN")
    ses = MockAdapter("ses")
    
    service = NotificationService(
        sendgrid=sendgrid,
        ses=ses,
        fallback_enabled=True,
    )
    
    msg = EmailMessage(
        to="test@example.com",
        subject="Test",
        html="<p>Test</p>",
    )
    
    result = await service.send_email(msg)
    
    assert result["provider"] == "ses"
    assert result["is_fallback"] is True


@pytest.mark.asyncio
async def test_email_with_all_fields():
    """Test email with all optional fields."""
    sendgrid = MockAdapter("sendgrid")
    ses = MockAdapter("ses")
    
    service = NotificationService(
        sendgrid=sendgrid,
        ses=ses,
    )
    
    msg = EmailMessage(
        to="test@example.com",
        subject="Order Confirmation",
        html="<h1>Thank you</h1>",
        text="Thank you",
        category="order_confirmation",
        custom_args={"order_id": "ORD123"},
        reply_to="support@vorte.com.tr",
        asm_group_id=1234,
        template="order_confirmation",
    )
    
    result = await service.send_email(msg)
    
    assert result["provider"] == "sendgrid"
    
    # Verify all fields were passed
    call_kwargs = sendgrid.send_email.call_args[1]
    assert call_kwargs["to_email"] == "test@example.com"
    assert call_kwargs["subject"] == "Order Confirmation"
    assert call_kwargs["html_content"] == "<h1>Thank you</h1>"
    assert call_kwargs["plain_text_content"] == "Thank you"
    assert call_kwargs["category"] == "order_confirmation"
    assert call_kwargs["custom_args"] == {"order_id": "ORD123"}
    assert call_kwargs["reply_to"] == "support@vorte.com.tr"
    assert call_kwargs["asm_group_id"] == 1234
