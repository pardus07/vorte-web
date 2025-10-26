# apps/backend/tests/test_ses_adapter.py
"""
Tests for AWS SES email adapter.

Tests:
- Email sending with EU region
- Configuration Set support
- Email tags (category, custom args)
- Error handling (MessageRejected, MailFromDomainNotVerified, etc.)
- PII masking for emails
- Metrics emission
"""
import pytest
from unittest.mock import MagicMock, patch

# Check if boto3 is available
try:
    import boto3
    from botocore.exceptions import ClientError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False

from app.services.adapters.ses_adapter import SESAdapter


@pytest.fixture
def ses_adapter():
    """Create SES adapter with test configuration."""
    if not BOTO3_AVAILABLE:
        pytest.skip("boto3 not installed")
    
    with patch("boto3.client"):
        adapter = SESAdapter(
            region_name="eu-central-1",
            from_email="test@vorte.com.tr",
            configuration_set="test-config-set",
        )
        return adapter


@pytest.mark.skipif(not BOTO3_AVAILABLE, reason="boto3 not installed")
@pytest.mark.asyncio
async def test_send_email_success(ses_adapter):
    """Test successful email sending."""
    # Mock SES response
    ses_adapter.client.send_email = MagicMock(return_value={
        "MessageId": "test_message_id_123"
    })
    
    result = await ses_adapter.send_email(
        to_email="customer@example.com",
        to_name="Test Customer",
        subject="Test Email",
        html_content="<h1>Test</h1>",
        plain_text_content="Test",
    )
    
    assert result["status"] == "sent"
    assert result["provider"] == "ses"
    assert result["message_id"] == "test_message_id_123"


@pytest.mark.skipif(not BOTO3_AVAILABLE, reason="boto3 not installed")
@pytest.mark.asyncio
async def test_send_email_uses_eu_region(ses_adapter):
    """Test that EU region is configured."""
    assert ses_adapter.region_name == "eu-central-1"


@pytest.mark.skipif(not BOTO3_AVAILABLE, reason="boto3 not installed")
@pytest.mark.asyncio
async def test_send_email_with_configuration_set(ses_adapter):
    """Test email with configuration set."""
    ses_adapter.client.send_email = MagicMock(return_value={
        "MessageId": "test_123"
    })
    
    await ses_adapter.send_email(
        to_email="test@example.com",
        subject="Test",
        html_content="<p>Test</p>",
    )
    
    # Verify configuration set was included
    call_args = ses_adapter.client.send_email.call_args
    assert call_args[1]["ConfigurationSetName"] == "test-config-set"


@pytest.mark.skipif(not BOTO3_AVAILABLE, reason="boto3 not installed")
@pytest.mark.asyncio
async def test_send_email_with_tags(ses_adapter):
    """Test email with category and custom args as tags."""
    ses_adapter.client.send_email = MagicMock(return_value={
        "MessageId": "test_123"
    })
    
    await ses_adapter.send_email(
        to_email="test@example.com",
        subject="Order Confirmation",
        html_content="<p>Your order is confirmed</p>",
        category="order_confirmation",
        custom_args={"order_id": "ORD123", "user_id": "USR456"},
    )
    
    # Verify email tags
    call_args = ses_adapter.client.send_email.call_args
    email_tags = call_args[1]["EmailTags"]
    
    # Check category tag
    category_tag = next((t for t in email_tags if t["Name"] == "category"), None)
    assert category_tag is not None
    assert category_tag["Value"] == "order_confirmation"
    
    # Check custom args tags
    order_tag = next((t for t in email_tags if t["Name"] == "order_id"), None)
    assert order_tag is not None
    assert order_tag["Value"] == "ORD123"


@pytest.mark.skipif(not BOTO3_AVAILABLE, reason="boto3 not installed")
@pytest.mark.asyncio
async def test_send_email_with_reply_to(ses_adapter):
    """Test email with reply-to address."""
    ses_adapter.client.send_email = MagicMock(return_value={
        "MessageId": "test_123"
    })
    
    await ses_adapter.send_email(
        to_email="test@example.com",
        subject="Test",
        html_content="<p>Test</p>",
        reply_to="support@vorte.com.tr",
    )
    
    # Verify reply-to
    call_args = ses_adapter.client.send_email.call_args
    assert "ReplyToAddresses" in call_args[1]
    assert call_args[1]["ReplyToAddresses"] == ["support@vorte.com.tr"]


@pytest.mark.skipif(not BOTO3_AVAILABLE, reason="boto3 not installed")
@pytest.mark.asyncio
async def test_send_email_html_only(ses_adapter):
    """Test email with HTML content only."""
    ses_adapter.client.send_email = MagicMock(return_value={
        "MessageId": "test_123"
    })
    
    await ses_adapter.send_email(
        to_email="test@example.com",
        subject="Test",
        html_content="<h1>HTML Only</h1>",
    )
    
    # Verify content structure
    call_args = ses_adapter.client.send_email.call_args
    body = call_args[1]["Content"]["Simple"]["Body"]
    assert "Html" in body
    assert "Text" not in body


@pytest.mark.skipif(not BOTO3_AVAILABLE, reason="boto3 not installed")
@pytest.mark.asyncio
async def test_send_email_text_only(ses_adapter):
    """Test email with plain text content only."""
    ses_adapter.client.send_email = MagicMock(return_value={
        "MessageId": "test_123"
    })
    
    await ses_adapter.send_email(
        to_email="test@example.com",
        subject="Test",
        plain_text_content="Plain text only",
    )
    
    # Verify content structure
    call_args = ses_adapter.client.send_email.call_args
    body = call_args[1]["Content"]["Simple"]["Body"]
    assert "Text" in body
    assert "Html" not in body


@pytest.mark.skipif(not BOTO3_AVAILABLE, reason="boto3 not installed")
@pytest.mark.asyncio
async def test_send_email_no_content_raises_error(ses_adapter):
    """Test that error is raised when no content provided."""
    with pytest.raises(ValueError, match="Either html_content or plain_text_content"):
        await ses_adapter.send_email(
            to_email="test@example.com",
            subject="Test",
        )


@pytest.mark.skipif(not BOTO3_AVAILABLE, reason="boto3 not installed")
@pytest.mark.asyncio
async def test_send_email_message_rejected(ses_adapter):
    """Test handling of MessageRejected error."""
    # Mock MessageRejected error
    error_response = {
        "Error": {
            "Code": "MessageRejected",
            "Message": "Email address is not verified"
        }
    }
    ses_adapter.client.send_email = MagicMock(
        side_effect=ClientError(error_response, "SendEmail")
    )
    
    with pytest.raises(ValueError, match="Email rejected by SES"):
        await ses_adapter.send_email(
            to_email="test@example.com",
            subject="Test",
            html_content="<p>Test</p>",
        )


@pytest.mark.skipif(not BOTO3_AVAILABLE, reason="boto3 not installed")
@pytest.mark.asyncio
async def test_send_email_domain_not_verified(ses_adapter):
    """Test handling of MailFromDomainNotVerifiedException."""
    error_response = {
        "Error": {
            "Code": "MailFromDomainNotVerifiedException",
            "Message": "Domain not verified"
        }
    }
    ses_adapter.client.send_email = MagicMock(
        side_effect=ClientError(error_response, "SendEmail")
    )
    
    with pytest.raises(ValueError, match="Sender domain not verified"):
        await ses_adapter.send_email(
            to_email="test@example.com",
            subject="Test",
            html_content="<p>Test</p>",
        )


@pytest.mark.skipif(not BOTO3_AVAILABLE, reason="boto3 not installed")
@pytest.mark.asyncio
async def test_send_email_configuration_set_not_found(ses_adapter):
    """Test handling of ConfigurationSetDoesNotExistException."""
    error_response = {
        "Error": {
            "Code": "ConfigurationSetDoesNotExistException",
            "Message": "Configuration set not found"
        }
    }
    ses_adapter.client.send_email = MagicMock(
        side_effect=ClientError(error_response, "SendEmail")
    )
    
    with pytest.raises(ValueError, match="SES configuration set not found"):
        await ses_adapter.send_email(
            to_email="test@example.com",
            subject="Test",
            html_content="<p>Test</p>",
        )


@pytest.mark.skipif(not BOTO3_AVAILABLE, reason="boto3 not installed")
@pytest.mark.asyncio
async def test_send_email_throttling(ses_adapter):
    """Test handling of TooManyRequestsException (throttling)."""
    error_response = {
        "Error": {
            "Code": "TooManyRequestsException",
            "Message": "Rate exceeded"
        }
    }
    ses_adapter.client.send_email = MagicMock(
        side_effect=ClientError(error_response, "SendEmail")
    )
    
    # Should raise ClientError (boto3 retry will handle)
    with pytest.raises(ClientError):
        await ses_adapter.send_email(
            to_email="test@example.com",
            subject="Test",
            html_content="<p>Test</p>",
        )


@pytest.mark.skipif(not BOTO3_AVAILABLE, reason="boto3 not installed")
def test_mask_email(ses_adapter):
    """Test email masking for PII protection."""
    assert ses_adapter.mask_email("test@example.com") == "te**@ex**.com"
    assert ses_adapter.mask_email("a@b.com") == "*@b**.com"
    assert ses_adapter.mask_email("ab@cd.com") == "**@cd**.com"
    assert ses_adapter.mask_email("john.doe@company.co.uk") == "jo**@co**.uk"
    assert ses_adapter.mask_email("invalid") == "***"


@pytest.mark.skipif(not BOTO3_AVAILABLE, reason="boto3 not installed")
def test_ses_adapter_requires_boto3():
    """Test that SESAdapter raises ImportError if boto3 not available."""
    with patch("app.services.adapters.ses_adapter.BOTO3_AVAILABLE", False):
        with pytest.raises(ImportError, match="boto3 is required"):
            SESAdapter()
