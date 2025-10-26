# apps/backend/tests/test_notification_templated.py
"""
Integration tests for NotificationService.send_templated_email().

Tests:
- Template rendering integration
- SendGrid/SES provider integration
- Fallback behavior with templates
- Category and custom_args propagation
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.notification_service import NotificationService, EmailMessage
from app.services.adapters.sendgrid_adapter import SendGridAdapter
from app.services.adapters.ses_adapter import SESAdapter


@pytest.fixture
def mock_sendgrid():
    """Mock SendGrid adapter."""
    adapter = MagicMock(spec=SendGridAdapter)
    adapter.send_email = AsyncMock(return_value={"message_id": "sg-123"})
    adapter.mask_email = MagicMock(side_effect=lambda x: x.replace("@", "@***"))
    return adapter


@pytest.fixture
def mock_ses():
    """Mock SES adapter."""
    adapter = MagicMock(spec=SESAdapter)
    adapter.send_email = AsyncMock(return_value={"MessageId": "ses-456"})
    adapter.mask_email = MagicMock(side_effect=lambda x: x.replace("@", "@***"))
    return adapter


@pytest.fixture
def notification_service(mock_sendgrid, mock_ses):
    """Create NotificationService with mocked adapters."""
    return NotificationService(
        sendgrid=mock_sendgrid,
        ses=mock_ses,
        fallback_enabled=True,
        primary="sendgrid",
    )


class TestSendTemplatedEmail:
    """Test send_templated_email method."""

    @pytest.mark.asyncio
    async def test_send_order_confirmation_tr(
        self, notification_service, mock_sendgrid
    ):
        """Test sending Turkish order confirmation email."""
        context = {
            "order": {
                "id": "ORD-12345",
                "order_items": [
                    {
                        "name": "Ürün 1",
                        "quantity": 2,
                        "price_formatted": "100,00 TL",
                    },
                ],
                "total_formatted": "200,00 TL",
                "tracking_url": "https://example.com/orders/ORD-12345",
            },
            "customer": {
                "first_name": "Ahmet",
                "address": {
                    "line1": "Test Caddesi",
                    "city": "İstanbul",
                    "postal_code": "34000",
                    "country": "Türkiye",
                },
            },
            "brand_name": "TestStore",
            "current_year": "2025",
        }

        result = await notification_service.send_templated_email(
            template="order_confirmation",
            locale="tr",
            to="customer@example.com",
            context=context,
            category="order",
            custom_args={"order_id": "ORD-12345"},
        )

        # Verify SendGrid was called
        assert mock_sendgrid.send_email.called
        call_kwargs = mock_sendgrid.send_email.call_args.kwargs

        # Check email parameters
        assert call_kwargs["to_email"] == "customer@example.com"
        assert "Sipariş Onayı" in call_kwargs["subject"]
        assert call_kwargs["category"] == "order"
        assert call_kwargs["custom_args"]["order_id"] == "ORD-12345"

        # Check HTML content
        assert "ORD-12345" in call_kwargs["html_content"]
        assert "Ahmet" in call_kwargs["html_content"]

        # Check plain text content
        assert call_kwargs["plain_text_content"]
        assert "ORD-12345" in call_kwargs["plain_text_content"]

        # Check result
        assert result["provider"] == "sendgrid"
        assert not result["is_fallback"]

    @pytest.mark.asyncio
    async def test_send_payment_failed_en(self, notification_service, mock_sendgrid):
        """Test sending English payment failed email."""
        context = {
            "payment": {
                "id": "PAY-12345",
                "amount_formatted": "$100.00",
                "created_at": "2025-01-15",
                "error_message": "Insufficient funds",
            },
            "order": {"id": "ORD-12345"},
            "customer": {"first_name": "John"},
            "retry_url": "https://example.com/retry",
            "support_url": "https://example.com/support",
            "brand_name": "TestStore",
        }

        result = await notification_service.send_templated_email(
            template="payment_failed",
            locale="en",
            to="customer@example.com",
            context=context,
            category="payment",
        )

        call_kwargs = mock_sendgrid.send_email.call_args.kwargs

        # Check content
        assert "Payment Failed" in call_kwargs["subject"]
        assert "Insufficient funds" in call_kwargs["html_content"]
        assert "Try Again" in call_kwargs["html_content"]

    @pytest.mark.asyncio
    async def test_fallback_to_ses_on_sendgrid_failure(
        self, notification_service, mock_sendgrid, mock_ses
    ):
        """Test fallback to SES when SendGrid fails with retryable error."""
        # SendGrid fails with 429 (rate limit)
        error = Exception("Rate limit exceeded")
        error.status_code = 429
        mock_sendgrid.send_email.side_effect = error

        context = {
            "payment": {
                "id": "PAY-12345",
                "amount_formatted": "250,00 TL",
                "created_at": "2025-01-15",
                "card_last4": "**** 1234",
            },
            "order": {
                "id": "ORD-12345",
                "tracking_url": "https://example.com/orders/ORD-12345",
            },
            "customer": {"first_name": "Ahmet"},
            "brand_name": "TestStore",
        }

        result = await notification_service.send_templated_email(
            template="payment_authorized",
            locale="tr",
            to="customer@example.com",
            context=context,
        )

        # Verify SendGrid was tried first
        assert mock_sendgrid.send_email.called

        # Verify SES was used as fallback
        assert mock_ses.send_email.called
        assert result["provider"] == "ses"
        assert result["is_fallback"]

    @pytest.mark.asyncio
    async def test_custom_subject_override(self, notification_service, mock_sendgrid):
        """Test custom subject override."""
        context = {
            "payment": {
                "id": "PAY-12345",
                "amount_formatted": "250,00 TL",
                "created_at": "2025-01-15",
                "card_last4": "**** 1234",
            },
            "order": {
                "id": "ORD-12345",
                "tracking_url": "https://example.com/orders/ORD-12345",
            },
            "customer": {"first_name": "Ahmet"},
            "brand_name": "TestStore",
        }

        await notification_service.send_templated_email(
            template="payment_authorized",
            locale="tr",
            to="customer@example.com",
            subject="Özel Konu Başlığı",
            context=context,
        )

        call_kwargs = mock_sendgrid.send_email.call_args.kwargs
        assert call_kwargs["subject"] == "Özel Konu Başlığı"

    @pytest.mark.asyncio
    async def test_reply_to_and_asm_group(self, notification_service, mock_sendgrid):
        """Test reply_to and ASM group ID (marketing emails)."""
        context = {
            "order": {
                "id": "ORD-12345",
                "order_items": [],
                "total_formatted": "100,00 TL",
                "tracking_url": "https://example.com/orders/ORD-12345",
            },
            "customer": {
                "first_name": "Ahmet",
                "address": {
                    "line1": "Test",
                    "city": "İstanbul",
                    "postal_code": "34000",
                    "country": "TR",
                },
            },
            "brand_name": "TestStore",
        }

        await notification_service.send_templated_email(
            template="order_confirmation",
            locale="tr",
            to="customer@example.com",
            context=context,
            reply_to="support@example.com",
            asm_group_id=12345,  # Marketing unsubscribe group
        )

        call_kwargs = mock_sendgrid.send_email.call_args.kwargs
        assert call_kwargs["reply_to"] == "support@example.com"
        assert call_kwargs["asm_group_id"] == 12345

    @pytest.mark.asyncio
    async def test_css_inlined_in_sent_email(self, notification_service, mock_sendgrid):
        """Test that CSS is inlined in sent email."""
        context = {
            "payment": {
                "id": "PAY-12345",
                "amount_formatted": "250,00 TL",
                "created_at": "2025-01-15",
                "card_last4": "**** 1234",
            },
            "order": {
                "id": "ORD-12345",
                "tracking_url": "https://example.com/orders/ORD-12345",
            },
            "customer": {"first_name": "Ahmet"},
            "brand_name": "TestStore",
        }

        await notification_service.send_templated_email(
            template="payment_authorized",
            locale="tr",
            to="customer@example.com",
            context=context,
        )

        call_kwargs = mock_sendgrid.send_email.call_args.kwargs
        html = call_kwargs["html_content"]

        # Verify inline styles exist (premailer output)
        assert 'style=' in html
        assert 'background-color' in html.lower()

    @pytest.mark.asyncio
    async def test_all_templates_render_successfully(
        self, notification_service, mock_sendgrid
    ):
        """Test that all templates can be rendered without errors."""
        templates = [
            ("order_confirmation", {
                "order": {
                    "id": "ORD-123",
                    "order_items": [],
                    "total_formatted": "100 TL",
                    "tracking_url": "https://example.com",
                },
                "customer": {
                    "first_name": "Test",
                    "address": {
                        "line1": "Test",
                        "city": "Test",
                        "postal_code": "12345",
                        "country": "TR",
                    },
                },
            }),
            ("payment_authorized", {
                "payment": {
                    "id": "PAY-123",
                    "amount_formatted": "100 TL",
                    "created_at": "2025-01-15",
                    "card_last4": "**** 1234",
                },
                "order": {"id": "ORD-123", "tracking_url": "https://example.com"},
                "customer": {"first_name": "Test"},
            }),
            ("payment_failed", {
                "payment": {
                    "id": "PAY-123",
                    "amount_formatted": "100 TL",
                    "created_at": "2025-01-15",
                },
                "order": {"id": "ORD-123"},
                "customer": {"first_name": "Test"},
                "retry_url": "https://example.com",
                "support_url": "https://example.com",
            }),
            ("refund_issued", {
                "refund": {
                    "id": "REF-123",
                    "amount_formatted": "100 TL",
                    "created_at": "2025-01-15",
                },
                "payment": {"id": "PAY-123", "amount_formatted": "100 TL"},
                "order": {"id": "ORD-123", "tracking_url": "https://example.com"},
                "customer": {"first_name": "Test"},
            }),
        ]

        for template_name, context in templates:
            context["brand_name"] = "TestStore"
            
            # Test both TR and EN
            for locale in ["tr", "en"]:
                result = await notification_service.send_templated_email(
                    template=template_name,
                    locale=locale,
                    to="test@example.com",
                    context=context,
                )
                
                assert result["provider"] == "sendgrid"
                assert mock_sendgrid.send_email.called
