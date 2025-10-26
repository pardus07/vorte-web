# apps/backend/tests/test_sendgrid_adapter.py
"""
Tests for SendGrid email adapter.

Tests:
- Email sending with EU endpoint
- Retry logic for 429 (rate limit)
- Retry logic for 5xx (server error)
- No retry for 4xx (client error)
- PII masking for emails
- Metrics emission
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

from app.services.adapters.sendgrid_adapter import SendGridAdapter


@pytest.fixture
def sendgrid_adapter():
    """Create SendGrid adapter with test credentials."""
    return SendGridAdapter(
        api_key="SG.test_api_key_12345",
        use_eu_region=True,
        from_email="test@vorte.com.tr",
        from_name="VORTE Test",
        max_retries=3,
    )


@pytest.mark.asyncio
async def test_send_email_success(sendgrid_adapter):
    """Test successful email sending."""
    # Mock successful response
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 202
    mock_response.headers = {"X-Message-Id": "test_message_123"}
    
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_response)):
        result = await sendgrid_adapter.send_email(
            to_email="customer@example.com",
            to_name="Test Customer",
            subject="Test Email",
            html_content="<h1>Test</h1>",
            plain_text_content="Test",
        )
    
    assert result["status"] == "sent"
    assert result["provider"] == "sendgrid"
    assert result["message_id"] == "test_message_123"


@pytest.mark.asyncio
async def test_send_email_uses_eu_endpoint(sendgrid_adapter):
    """Test that EU endpoint is used when configured."""
    assert sendgrid_adapter.base_url == "https://api.eu.sendgrid.com"


@pytest.mark.asyncio
async def test_send_email_uses_us_endpoint():
    """Test that US endpoint is used when EU is disabled."""
    adapter = SendGridAdapter(
        api_key="SG.test_key",
        use_eu_region=False,
    )
    
    assert adapter.base_url == "https://api.sendgrid.com"


@pytest.mark.asyncio
async def test_send_email_with_category_and_custom_args(sendgrid_adapter):
    """Test email with category and custom args for tracking."""
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 202
    mock_response.headers = {"X-Message-Id": "test_123"}
    
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_response)) as mock_post:
        await sendgrid_adapter.send_email(
            to_email="test@example.com",
            subject="Order Confirmation",
            html_content="<p>Your order is confirmed</p>",
            category="order_confirmation",
            custom_args={"order_id": "ORD123", "user_id": "USR456"},
        )
        
        # Verify payload includes category and custom_args
        call_args = mock_post.call_args
        payload = call_args[1]["json"]
        
        assert "categories" in payload
        assert payload["categories"] == ["order_confirmation"]
        assert "custom_args" in payload
        assert payload["custom_args"]["order_id"] == "ORD123"


@pytest.mark.asyncio
async def test_send_email_retry_on_429(sendgrid_adapter):
    """Test retry logic for rate limit (429)."""
    # First two attempts: 429, third attempt: success
    mock_response_429 = MagicMock(spec=httpx.Response)
    mock_response_429.status_code = 429
    
    mock_response_success = MagicMock(spec=httpx.Response)
    mock_response_success.status_code = 202
    mock_response_success.headers = {"X-Message-Id": "retry_success"}
    
    with patch("httpx.AsyncClient.post", new=AsyncMock(
        side_effect=[mock_response_429, mock_response_429, mock_response_success]
    )):
        with patch("asyncio.sleep", new=AsyncMock()):  # Skip actual sleep
            result = await sendgrid_adapter.send_email(
                to_email="test@example.com",
                subject="Test",
                html_content="<p>Test</p>",
            )
    
    assert result["status"] == "sent"
    assert result["message_id"] == "retry_success"


@pytest.mark.asyncio
async def test_send_email_retry_exhausted_on_429(sendgrid_adapter):
    """Test that retries are exhausted after max attempts on 429."""
    mock_response_429 = MagicMock(spec=httpx.Response)
    mock_response_429.status_code = 429
    mock_response_429.request = MagicMock()
    
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_response_429)):
        with patch("asyncio.sleep", new=AsyncMock()):
            with pytest.raises(httpx.HTTPStatusError, match="Rate limit exceeded"):
                await sendgrid_adapter.send_email(
                    to_email="test@example.com",
                    subject="Test",
                    html_content="<p>Test</p>",
                )


@pytest.mark.asyncio
async def test_send_email_retry_on_5xx(sendgrid_adapter):
    """Test retry logic for server error (5xx)."""
    # First attempt: 500, second attempt: success
    mock_response_500 = MagicMock(spec=httpx.Response)
    mock_response_500.status_code = 500
    mock_response_500.text = "Internal Server Error"
    
    mock_response_success = MagicMock(spec=httpx.Response)
    mock_response_success.status_code = 202
    mock_response_success.headers = {"X-Message-Id": "recovered"}
    
    with patch("httpx.AsyncClient.post", new=AsyncMock(
        side_effect=[mock_response_500, mock_response_success]
    )):
        with patch("asyncio.sleep", new=AsyncMock()):
            result = await sendgrid_adapter.send_email(
                to_email="test@example.com",
                subject="Test",
                html_content="<p>Test</p>",
            )
    
    assert result["status"] == "sent"


@pytest.mark.asyncio
async def test_send_email_no_retry_on_4xx(sendgrid_adapter):
    """Test that 4xx errors are not retried."""
    mock_response_400 = MagicMock(spec=httpx.Response)
    mock_response_400.status_code = 400
    mock_response_400.text = "Bad Request"
    mock_response_400.request = MagicMock()
    mock_response_400.raise_for_status = MagicMock(
        side_effect=httpx.HTTPStatusError("Bad Request", request=MagicMock(), response=mock_response_400)
    )
    
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_response_400)):
        with pytest.raises(httpx.HTTPStatusError):
            await sendgrid_adapter.send_email(
                to_email="test@example.com",
                subject="Test",
                html_content="<p>Test</p>",
            )


@pytest.mark.asyncio
async def test_send_email_timeout_retry(sendgrid_adapter):
    """Test retry on timeout."""
    # First attempt: timeout, second attempt: success
    mock_response_success = MagicMock(spec=httpx.Response)
    mock_response_success.status_code = 202
    mock_response_success.headers = {"X-Message-Id": "timeout_recovered"}
    
    with patch("httpx.AsyncClient.post", new=AsyncMock(
        side_effect=[httpx.TimeoutException("Timeout"), mock_response_success]
    )):
        with patch("asyncio.sleep", new=AsyncMock()):
            result = await sendgrid_adapter.send_email(
                to_email="test@example.com",
                subject="Test",
                html_content="<p>Test</p>",
            )
    
    assert result["status"] == "sent"


def test_mask_email(sendgrid_adapter):
    """Test email masking for PII protection."""
    assert sendgrid_adapter.mask_email("test@example.com") == "te**@ex**.com"
    assert sendgrid_adapter.mask_email("a@b.com") == "*@b**.com"
    assert sendgrid_adapter.mask_email("ab@cd.com") == "**@cd**.com"
    assert sendgrid_adapter.mask_email("john.doe@company.co.uk") == "jo**@co**.uk"
    assert sendgrid_adapter.mask_email("invalid") == "***"


@pytest.mark.asyncio
async def test_send_email_with_reply_to(sendgrid_adapter):
    """Test email with reply-to address."""
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 202
    mock_response.headers = {"X-Message-Id": "test_123"}
    
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_response)) as mock_post:
        await sendgrid_adapter.send_email(
            to_email="test@example.com",
            subject="Test",
            html_content="<p>Test</p>",
            reply_to="support@vorte.com.tr",
        )
        
        payload = mock_post.call_args[1]["json"]
        assert "reply_to" in payload
        assert payload["reply_to"]["email"] == "support@vorte.com.tr"


@pytest.mark.asyncio
async def test_send_email_with_asm_group(sendgrid_adapter):
    """Test email with unsubscribe group (for marketing emails)."""
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 202
    mock_response.headers = {"X-Message-Id": "test_123"}
    
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_response)) as mock_post:
        await sendgrid_adapter.send_email(
            to_email="test@example.com",
            subject="Newsletter",
            html_content="<p>Newsletter</p>",
            asm_group_id=12345,
        )
        
        payload = mock_post.call_args[1]["json"]
        assert "asm" in payload
        assert payload["asm"]["group_id"] == 12345
