"""
Unit tests for iyzico signature generation and validation

Tests IYZWSv2 authentication and response signature validation
based on iyzico official documentation examples.
"""
import pytest
from app.services.adapters.iyzico_adapter import _hmac_hex, _normalize_price, IyzicoAuth


class TestIyzicoSignature:
    """Test iyzico signature generation and validation"""

    def test_response_signature_sample_from_docs(self):
        """
        Test response signature validation with example from iyzico docs
        Ref: https://docs.iyzico.com/.../advanced/response-signature-validation
        """
        # Response Signature Validation örneğindeki sıralama:
        # paymentId, currency, basketId, conversationId, paidPrice, price
        joined = ":".join(["22416032", "TRY", "basketId", "conversationId", "10.5", "10.5"])
        expected = "836c3a6c8db86c81043f2ca74edb13518b54a813f454f8dd762f0dd658610173"
        assert _hmac_hex("sandbox-qaIiLIxhjMgx3LSKIVvp6j17NunHOFtD", joined) == expected

    def test_normalize_price_trailing_zeros(self):
        """Test price normalization removes trailing zeros"""
        assert _normalize_price("10.50") == "10.5"
        assert _normalize_price("10.00") == "10"
        assert _normalize_price("10.5") == "10.5"
        assert _normalize_price("10") == "10"
        assert _normalize_price(10.50) == "10.5"
        assert _normalize_price(10.00) == "10"

    def test_normalize_price_edge_cases(self):
        """Test price normalization edge cases"""
        assert _normalize_price(None) == ""
        assert _normalize_price("") == ""
        assert _normalize_price("invalid") == "invalid"

    def test_iyzico_auth_header_generation(self):
        """Test IYZWSv2 authorization header generation"""
        auth = IyzicoAuth(
            api_key="sandbox-test-api-key",
            secret_key="sandbox-test-secret-key"
        )
        
        payload = {"locale": "tr", "price": "100.0"}
        headers = auth.build_headers(
            base_url="https://sandbox-api.iyzipay.com",
            path="/payment/3dsecure/initialize",
            body=payload
        )
        
        # Check required headers exist
        assert "Authorization" in headers
        assert headers["Authorization"].startswith("IYZWSv2 ")
        assert "x-iyzi-rnd" in headers
        assert headers["Content-Type"] == "application/json"
        
        # Check authorization header is base64 encoded
        auth_value = headers["Authorization"].replace("IYZWSv2 ", "")
        import base64
        decoded = base64.b64decode(auth_value).decode("utf-8")
        
        # Should contain apiKey, randomKey, and signature
        assert "apiKey:sandbox-test-api-key" in decoded
        assert "randomKey:" in decoded
        assert "signature:" in decoded

    def test_json_minified(self):
        """Test JSON minification for deterministic signatures"""
        auth = IyzicoAuth("key", "secret")
        
        # Test with dict
        data = {"locale": "tr", "price": "100.0"}
        minified = auth._json_minified(data)
        assert minified == '{"locale":"tr","price":"100.0"}'
        
        # Test with None
        assert auth._json_minified(None) == ""
        
        # Test with empty dict - returns empty string per implementation
        assert auth._json_minified({}) == ""

    def test_hmac_hex_consistency(self):
        """Test HMAC-SHA256 hex generation is consistent"""
        secret = "test-secret"
        message = "test-message"
        
        # Same input should produce same output
        result1 = _hmac_hex(secret, message)
        result2 = _hmac_hex(secret, message)
        assert result1 == result2
        
        # Different input should produce different output
        result3 = _hmac_hex(secret, "different-message")
        assert result1 != result3
