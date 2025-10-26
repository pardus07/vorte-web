# apps/backend/tests/test_notification_sms.py
"""
Tests for NotificationService SMS integration.

Tests:
- SMS sending via NotificationService
- Templated SMS
- İYS compliance parameters
- Error handling
"""
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.services.notification_service import NotificationService
from app.services.adapters.sendgrid_adapter import SendGridAdapter
from app.services.adapters.ses_adapter import SESAdapter
from app.services.sms_service import SmsService


@pytest.fixture
def mock_sendgrid():
    """Mock SendGrid adapter."""
    adapter = MagicMock(spec=SendGridAdapter)
    adapter.send_email = AsyncMock()
    adapter.mask_email = MagicMock(side_effect=lambda x: x.replace("@", "@***"))
    return adapter


@pytest.fixture
def mock_ses():
    """Mock SES adapter."""
    adapter = MagicMock(spec=SESAdapter)
    adapter.send_email = AsyncMock()
    adapter.mask_email = MagicMock(side_effect=lambda x: x.replace("@", "@***"))
    return adapter


@pytest.fixture
def mock_sms_service():
    """Mock SMS service."""
    service = MagicMock(spec=SmsService)
    service.send_sms = AsyncMock()
    return service


@pytest.fixture
def notification_service(mock_sendgrid, mock_ses, mock_sms_service):
    """Create NotificationService with mocked adapters."""
    return NotificationService(
        sendgrid=mock_sendgrid,
        ses=mock_ses,
        sms_service=mock_sms_service,
        fallback_enabled=True,
        primary="sendgrid",
    )


class TestSmsNotification:
    """Test SMS notification methods."""
    
    @pytest.mark.asyncio
    async def test_send_sms_notification_success(
        self, notification_service, mock_sms_service
    ):
        """Test successful SMS send."""
        # Mock successful SMS response
        mock_sms_service.send_sms.return_value = {
            "provider": "netgsm",
            "result": {"ok": True, "message_id": "123456789"},
            "is_fallback": False,
            "latency_ms": 234,
        }
        
        result = await notification_service.send_sms_notification(
            to=["05321234567"],
            text="Siparişiniz kargoya verildi.",
            is_commercial=False,
        )
        
        # Verify SMS service was called
        assert mock_sms_service.send_sms.called
        call_args = mock_sms_service.send_sms.call_args.args[0]
        
        assert call_args.to == ["05321234567"]
        assert call_args.text == "Siparişiniz kargoya verildi."
        assert call_args.is_commercial is False
        
        # Verify result
        assert result["provider"] == "netgsm"
        assert not result["is_fallback"]
    
    @pytest.mark.asyncio
    async def test_send_sms_notification_with_iys_parameters(
        self, notification_service, mock_sms_service
    ):
        """Test SMS send with İYS parameters."""
        mock_sms_service.send_sms.return_value = {
            "provider": "verimor",
            "result": {"campaign_id": "987654321"},
            "is_fallback": False,
        }
        
        result = await notification_service.send_sms_notification(
            to=["05321234567"],
            text="Kampanya mesajı",
            is_commercial=True,
            iys_recipient_type="TACIR",
        )
        
        # Verify İYS parameters
        call_args = mock_sms_service.send_sms.call_args.args[0]
        assert call_args.is_commercial is True
        assert call_args.iys_recipient_type == "TACIR"
    
    @pytest.mark.asyncio
    async def test_send_sms_notification_with_schedule(
        self, notification_service, mock_sms_service
    ):
        """Test scheduled SMS send."""
        mock_sms_service.send_sms.return_value = {
            "provider": "netgsm",
            "result": {"ok": True},
            "is_fallback": False,
        }
        
        result = await notification_service.send_sms_notification(
            to=["05321234567"],
            text="Scheduled message",
            schedule_at="01012025120000",
        )
        
        # Verify schedule parameter
        call_args = mock_sms_service.send_sms.call_args.args[0]
        assert call_args.schedule_at == "01012025120000"
    
    @pytest.mark.asyncio
    async def test_send_sms_notification_without_sms_service(
        self, mock_sendgrid, mock_ses
    ):
        """Test SMS send without SMS service configured."""
        service = NotificationService(
            sendgrid=mock_sendgrid,
            ses=mock_ses,
            sms_service=None,  # No SMS service
        )
        
        with pytest.raises(RuntimeError) as exc_info:
            await service.send_sms_notification(
                to=["05321234567"],
                text="Test",
            )
        
        assert "not configured" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_send_sms_notification_failure(
        self, notification_service, mock_sms_service
    ):
        """Test SMS send failure."""
        # Mock SMS failure
        mock_sms_service.send_sms.side_effect = Exception("SMS send failed")
        
        with pytest.raises(Exception) as exc_info:
            await notification_service.send_sms_notification(
                to=["05321234567"],
                text="Test",
            )
        
        assert "SMS send failed" in str(exc_info.value)


class TestSmsTemplated:
    """Test templated SMS methods."""
    
    @pytest.mark.asyncio
    async def test_send_sms_templated_payment_authorized_tr(
        self, notification_service, mock_sms_service
    ):
        """Test Turkish payment authorized SMS template."""
        mock_sms_service.send_sms.return_value = {
            "provider": "netgsm",
            "result": {"ok": True},
            "is_fallback": False,
        }
        
        result = await notification_service.send_sms_templated(
            template="payment_authorized",
            locale="tr",
            to=["05321234567"],
            context={
                "order_id": "ORD-12345",
                "amount": "250,00 TL",
                "brand_name": "Vorte",
            },
            is_commercial=False,
        )
        
        # Verify SMS was sent
        assert mock_sms_service.send_sms.called
        call_args = mock_sms_service.send_sms.call_args.args[0]
        
        # Verify text was rendered from template
        assert "Ödemeniz onaylandı" in call_args.text
        assert "ORD-12345" in call_args.text
        assert "250,00 TL" in call_args.text
        assert "Vorte" in call_args.text
    
    @pytest.mark.asyncio
    async def test_send_sms_templated_payment_authorized_en(
        self, notification_service, mock_sms_service
    ):
        """Test English payment authorized SMS template."""
        mock_sms_service.send_sms.return_value = {
            "provider": "netgsm",
            "result": {"ok": True},
            "is_fallback": False,
        }
        
        result = await notification_service.send_sms_templated(
            template="payment_authorized",
            locale="en",
            to=["05321234567"],
            context={
                "order_id": "ORD-12345",
                "amount": "$100.00",
                "brand_name": "Vorte",
            },
            is_commercial=False,
        )
        
        call_args = mock_sms_service.send_sms.call_args.args[0]
        
        # Verify English text
        assert "Payment confirmed" in call_args.text
        assert "ORD-12345" in call_args.text
        assert "$100.00" in call_args.text
    
    @pytest.mark.asyncio
    async def test_send_sms_templated_order_confirmation_tr(
        self, notification_service, mock_sms_service
    ):
        """Test Turkish order confirmation SMS template."""
        mock_sms_service.send_sms.return_value = {
            "provider": "netgsm",
            "result": {"ok": True},
            "is_fallback": False,
        }
        
        result = await notification_service.send_sms_templated(
            template="order_confirmation",
            locale="tr",
            to=["05321234567"],
            context={
                "order_id": "ORD-12345",
                "amount": "250,00 TL",
                "brand_name": "Vorte",
            },
        )
        
        call_args = mock_sms_service.send_sms.call_args.args[0]
        
        assert "Siparişiniz alındı" in call_args.text
        assert "ORD-12345" in call_args.text
    
    @pytest.mark.asyncio
    async def test_send_sms_templated_payment_failed_tr(
        self, notification_service, mock_sms_service
    ):
        """Test Turkish payment failed SMS template."""
        mock_sms_service.send_sms.return_value = {
            "provider": "netgsm",
            "result": {"ok": True},
            "is_fallback": False,
        }
        
        result = await notification_service.send_sms_templated(
            template="payment_failed",
            locale="tr",
            to=["05321234567"],
            context={
                "order_id": "ORD-12345",
                "brand_name": "Vorte",
            },
        )
        
        call_args = mock_sms_service.send_sms.call_args.args[0]
        
        assert "Ödeme başarısız" in call_args.text
        assert "ORD-12345" in call_args.text
    
    @pytest.mark.asyncio
    async def test_send_sms_templated_refund_issued_tr(
        self, notification_service, mock_sms_service
    ):
        """Test Turkish refund issued SMS template."""
        mock_sms_service.send_sms.return_value = {
            "provider": "netgsm",
            "result": {"ok": True},
            "is_fallback": False,
        }
        
        result = await notification_service.send_sms_templated(
            template="refund_issued",
            locale="tr",
            to=["05321234567"],
            context={
                "order_id": "ORD-12345",
                "amount": "250,00 TL",
                "brand_name": "Vorte",
            },
        )
        
        call_args = mock_sms_service.send_sms.call_args.args[0]
        
        assert "İade işleminiz başlatıldı" in call_args.text
        assert "ORD-12345" in call_args.text
    
    @pytest.mark.asyncio
    async def test_send_sms_templated_fallback_to_context(
        self, notification_service, mock_sms_service
    ):
        """Test fallback to context when template not found."""
        mock_sms_service.send_sms.return_value = {
            "provider": "netgsm",
            "result": {"ok": True},
            "is_fallback": False,
        }
        
        result = await notification_service.send_sms_templated(
            template="nonexistent_template",
            locale="tr",
            to=["05321234567"],
            context={
                "message": "Custom message from context",
            },
        )
        
        call_args = mock_sms_service.send_sms.call_args.args[0]
        
        # Should use message from context
        assert call_args.text == "Custom message from context"
    
    @pytest.mark.asyncio
    async def test_send_sms_templated_no_text_raises_error(
        self, notification_service, mock_sms_service
    ):
        """Test error when no text can be resolved."""
        with pytest.raises(ValueError) as exc_info:
            await notification_service.send_sms_templated(
                template="nonexistent_template",
                locale="tr",
                to=["05321234567"],
                context={},  # No message or text
            )
        
        assert "could not be resolved" in str(exc_info.value).lower()
