# apps/backend/tests/test_verimor_adapter.py
"""
Tests for Verimor SMS adapter.

Tests:
- SMS sending (success/failure)
- İYS compliance parameters
- Balance query
- Headers query
- Error handling
"""
import pytest
import httpx
from unittest.mock import AsyncMock, MagicMock

from app.services.adapters.verimor_adapter import VerimorAdapter


class TestVerimorAdapter:
    """Test Verimor adapter."""
    
    @pytest.fixture
    def mock_http_client(self):
        """Mock HTTP client."""
        client = MagicMock(spec=httpx.AsyncClient)
        client.request = AsyncMock()
        client.aclose = AsyncMock()
        return client
    
    @pytest.fixture
    def adapter(self, mock_http_client):
        """Create adapter with mocked HTTP client."""
        adapter = VerimorAdapter(
            base_url="https://sms.verimor.com.tr",
            username="test_user",
            password="test_pass",
            source_addr="VORTE",
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
        mock_response.text = "123456789"  # Campaign ID
        mock_http_client.request.return_value = mock_response
        
        campaign_id = await adapter.send_sms(
            messages=[
                {"dest": "905321234567", "text": "Test message"},
            ]
        )
        
        assert campaign_id == "123456789"
        assert mock_http_client.request.called
        
        # Check request parameters
        call_args = mock_http_client.request.call_args
        assert call_args.args[0] == "POST"
        assert "/v2/send.json" in call_args.args[1]
        
        json_data = call_args.kwargs["json"]
        assert json_data["source_addr"] == "VORTE"
        assert json_data["is_commercial"] is False
        assert json_data["iys_recipient_type"] == "BIREYSEL"
        assert len(json_data["messages"]) == 1
    
    @pytest.mark.asyncio
    async def test_send_sms_commercial(self, adapter, mock_http_client):
        """Test commercial SMS send with İYS parameters."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "123456789"
        mock_http_client.request.return_value = mock_response
        
        campaign_id = await adapter.send_sms(
            messages=[
                {"dest": "905321234567", "text": "Kampanya mesajı"},
            ],
            is_commercial=True,
            iys_recipient_type="TACIR",
        )
        
        # Check İYS parameters
        call_args = mock_http_client.request.call_args
        json_data = call_args.kwargs["json"]
        assert json_data["is_commercial"] is True
        assert json_data["iys_recipient_type"] == "TACIR"
    
    @pytest.mark.asyncio
    async def test_send_sms_multiple_recipients(self, adapter, mock_http_client):
        """Test SMS send to multiple recipients."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "123456789"
        mock_http_client.request.return_value = mock_response
        
        campaign_id = await adapter.send_sms(
            messages=[
                {"dest": "905321234567", "text": "Test 1"},
                {"dest": "905329876543", "text": "Test 2"},
            ]
        )
        
        # Check multiple messages
        call_args = mock_http_client.request.call_args
        json_data = call_args.kwargs["json"]
        assert len(json_data["messages"]) == 2
    
    @pytest.mark.asyncio
    async def test_send_sms_with_schedule(self, adapter, mock_http_client):
        """Test scheduled SMS send."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "123456789"
        mock_http_client.request.return_value = mock_response
        
        campaign_id = await adapter.send_sms(
            messages=[
                {"dest": "905321234567", "text": "Test"},
            ],
            send_at="2025-01-01T12:00:00Z",
        )
        
        # Check schedule parameter
        call_args = mock_http_client.request.call_args
        json_data = call_args.kwargs["json"]
        assert json_data["send_at"] == "2025-01-01T12:00:00Z"
    
    @pytest.mark.asyncio
    async def test_send_sms_with_custom_id(self, adapter, mock_http_client):
        """Test SMS send with custom tracking ID."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "123456789"
        mock_http_client.request.return_value = mock_response
        
        campaign_id = await adapter.send_sms(
            messages=[
                {"dest": "905321234567", "text": "Test"},
            ],
            custom_id="ORDER-12345",
        )
        
        # Check custom_id parameter
        call_args = mock_http_client.request.call_args
        json_data = call_args.kwargs["json"]
        assert json_data["custom_id"] == "ORDER-12345"
    
    @pytest.mark.asyncio
    async def test_send_sms_error(self, adapter, mock_http_client):
        """Test SMS send with error response."""
        # Mock error response
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Invalid parameters"
        mock_http_client.request.return_value = mock_response
        
        with pytest.raises(RuntimeError) as exc_info:
            await adapter.send_sms(
                messages=[
                    {"dest": "905321234567", "text": "Test"},
                ]
            )
        
        assert "400" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_send_sms_empty_response(self, adapter, mock_http_client):
        """Test SMS send with empty response."""
        # Mock empty response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = ""
        mock_http_client.request.return_value = mock_response
        
        with pytest.raises(RuntimeError):
            await adapter.send_sms(
                messages=[
                    {"dest": "905321234567", "text": "Test"},
                ]
            )
    
    @pytest.mark.asyncio
    async def test_get_balance_success(self, adapter, mock_http_client):
        """Test balance query."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "1234.56"
        mock_response.raise_for_status = MagicMock()
        mock_http_client.request.return_value = mock_response
        
        balance = await adapter.get_balance()
        
        assert balance == "1234.56"
        
        # Check request
        call_args = mock_http_client.request.call_args
        assert call_args.args[0] == "GET"
        assert "/v2/balance" in call_args.args[1]
    
    @pytest.mark.asyncio
    async def test_get_headers_success(self, adapter, mock_http_client):
        """Test headers query."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"header": "VORTE", "status": "active"},
            {"header": "VORTECOM", "status": "active"},
        ]
        mock_response.raise_for_status = MagicMock()
        mock_http_client.request.return_value = mock_response
        
        headers = await adapter.get_headers()
        
        assert len(headers) == 2
        assert headers[0]["header"] == "VORTE"
        
        # Check request
        call_args = mock_http_client.request.call_args
        assert call_args.args[0] == "GET"
        assert "/v2/headers" in call_args.args[1]
    
    @pytest.mark.asyncio
    async def test_mask_phone(self, adapter):
        """Test phone number masking for logging."""
        masked = adapter.mask_phone("905321234567")
        assert masked == "90532***4567"
        assert "1234" not in masked
