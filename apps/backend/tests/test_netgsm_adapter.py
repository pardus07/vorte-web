# apps/backend/tests/test_netgsm_adapter.py
"""
Tests for Netgsm SMS adapter.

Tests:
- Encoding detection (GSM 03.38 vs Unicode)
- Segment count calculation
- Turkish character transliteration
- Phone number normalization
- SMS sending (success/failure)
- Error handling
"""
import pytest
import httpx
from unittest.mock import AsyncMock, MagicMock

from app.services.adapters.netgsm_adapter import (
    NetgsmAdapter,
    _is_gsm0338,
    _segment_count,
    _normalize_msisdn,
)


class TestEncodingDetection:
    """Test GSM 03.38 encoding detection."""
    
    def test_gsm0338_basic_latin(self):
        """Test basic Latin characters."""
        assert _is_gsm0338("Hello World")
        assert _is_gsm0338("0123456789")
        # Note: ^ and * are not in GSM 03.38 basic set
        assert _is_gsm0338("!@#$%&()")
    
    def test_gsm0338_turkish_fails(self):
        """Test Turkish characters not in GSM 03.38."""
        assert not _is_gsm0338("İğne")
        assert not _is_gsm0338("Çığ")
        assert not _is_gsm0338("Öğrenci")
    
    def test_gsm0338_unicode_fails(self):
        """Test Unicode characters not in GSM 03.38."""
        assert not _is_gsm0338("Hello 😀")
        assert not _is_gsm0338("Привет")


class TestSegmentCount:
    """Test SMS segment count calculation."""
    
    def test_gsm_single_segment(self):
        """Test GSM 03.38 single segment (≤160 chars)."""
        result = _segment_count("Hello World")
        assert result["encoding"] == "GSM"
        assert result["segments"] == 1
        assert result["length"] == 11
    
    def test_gsm_multiple_segments(self):
        """Test GSM 03.38 multiple segments (>160 chars)."""
        text = "A" * 200
        result = _segment_count(text)
        assert result["encoding"] == "GSM"
        assert result["segments"] == 2  # 200 / 153 = 2
    
    def test_unicode_single_segment(self):
        """Test Unicode single segment (≤70 chars)."""
        result = _segment_count("İğne")
        assert result["encoding"] == "UCS2"
        assert result["segments"] == 1
        assert result["length"] == 4
    
    def test_unicode_multiple_segments(self):
        """Test Unicode multiple segments (>70 chars)."""
        text = "İ" * 100
        result = _segment_count(text)
        assert result["encoding"] == "UCS2"
        assert result["segments"] == 2  # 100 / 67 = 2
    
    def test_transliteration_reduces_segments(self):
        """Test Turkish transliteration reduces segments."""
        text = "Çığ ÖĞÜŞ" * 20  # Would be Unicode
        
        without_trans = _segment_count(text, transliterate=False)
        with_trans = _segment_count(text, transliterate=True)
        
        # Transliteration should reduce to GSM encoding
        assert with_trans["encoding"] == "GSM"
        assert with_trans["segments"] <= without_trans["segments"]


class TestPhoneNormalization:
    """Test E.164 phone number normalization."""
    
    def test_normalize_with_leading_zero(self):
        """Test normalization with leading zero."""
        assert _normalize_msisdn("05321234567") == "+905321234567"
    
    def test_normalize_without_leading_zero(self):
        """Test normalization without leading zero."""
        assert _normalize_msisdn("5321234567") == "+905321234567"
    
    def test_normalize_with_country_code(self):
        """Test normalization with country code."""
        assert _normalize_msisdn("+905321234567") == "+905321234567"
        assert _normalize_msisdn("905321234567") == "+905321234567"
    
    def test_normalize_with_spaces(self):
        """Test normalization with spaces."""
        assert _normalize_msisdn("+90 532 123 4567") == "+905321234567"
        assert _normalize_msisdn("0532 123 45 67") == "+905321234567"
    
    def test_normalize_with_dashes(self):
        """Test normalization with dashes."""
        assert _normalize_msisdn("0532-123-4567") == "+905321234567"


class TestNetgsmAdapter:
    """Test Netgsm adapter."""
    
    @pytest.fixture
    def mock_http_client(self):
        """Mock HTTP client."""
        client = MagicMock(spec=httpx.AsyncClient)
        client.get = AsyncMock()
        client.aclose = AsyncMock()
        return client
    
    @pytest.fixture
    def adapter(self, mock_http_client):
        """Create adapter with mocked HTTP client."""
        adapter = NetgsmAdapter(
            username="test_user",
            password="test_pass",
            header="VORTE",
            max_retries=1,  # Disable retry for tests
        )
        adapter.http = mock_http_client
        return adapter
    
    @pytest.mark.asyncio
    async def test_send_sms_success(self, adapter, mock_http_client):
        """Test successful SMS send."""
        # Mock successful response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "00 123456789"
        mock_http_client.get.return_value = mock_response
        
        result = await adapter.send_sms(
            to=["05321234567"],
            message="Test message"
        )
        
        assert result["ok"] is True
        assert result["provider"] == "netgsm"
        assert result["message_id"] == "123456789"
        assert result["recipients"] == 1
        assert mock_http_client.get.called
    
    @pytest.mark.asyncio
    async def test_send_sms_error_code(self, adapter, mock_http_client):
        """Test SMS send with error code."""
        # Mock error response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "30"  # Invalid username/password
        mock_http_client.get.return_value = mock_response
        
        with pytest.raises(RuntimeError) as exc_info:
            await adapter.send_sms(
                to=["05321234567"],
                message="Test message"
            )
        
        assert "30" in str(exc_info.value)
        assert "username/password" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_send_sms_multiple_recipients(self, adapter, mock_http_client):
        """Test SMS send to multiple recipients."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "00 123456789"
        mock_http_client.get.return_value = mock_response
        
        result = await adapter.send_sms(
            to=["05321234567", "05329876543"],
            message="Test message"
        )
        
        assert result["recipients"] == 2
        
        # Check that phone numbers were normalized and joined
        call_args = mock_http_client.get.call_args
        params = call_args.kwargs["params"]
        assert "+905321234567,+905329876543" in params["gsmno"]
    
    @pytest.mark.asyncio
    async def test_send_sms_with_transliteration(self, mock_http_client):
        """Test SMS send with Turkish transliteration."""
        adapter = NetgsmAdapter(
            username="test_user",
            password="test_pass",
            header="VORTE",
            transliterate_tr=True,
            max_retries=1,
        )
        adapter.http = mock_http_client
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "00 123456789"
        mock_http_client.get.return_value = mock_response
        
        result = await adapter.send_sms(
            to=["05321234567"],
            message="Çığ ÖĞÜŞ"
        )
        
        # Check that message was transliterated
        call_args = mock_http_client.get.call_args
        params = call_args.kwargs["params"]
        assert params["message"] == "Cig OGUS"
    
    @pytest.mark.asyncio
    async def test_send_sms_with_schedule(self, adapter, mock_http_client):
        """Test scheduled SMS send."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "00 123456789"
        mock_http_client.get.return_value = mock_response
        
        result = await adapter.send_sms(
            to=["05321234567"],
            message="Test message",
            schedule_at="01012025120000",  # ddMMyyyyHHmmss
        )
        
        # Check that schedule was included
        call_args = mock_http_client.get.call_args
        params = call_args.kwargs["params"]
        assert params["startdate"] == "01012025120000"
    
    @pytest.mark.asyncio
    async def test_mask_phone(self, adapter):
        """Test phone number masking for logging."""
        masked = adapter.mask_phone("+905321234567")
        assert masked == "+90532***4567"
        assert "1234" not in masked
