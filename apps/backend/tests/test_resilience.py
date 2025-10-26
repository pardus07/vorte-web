"""
Unit tests for resilience patterns (retry + circuit breaker)

Tests retry logic and circuit breaker behavior.
"""
import pytest
from app.services.resilience import is_retryable_http_error
import httpx


class TestResilience:
    """Test resilience patterns"""

    def test_is_retryable_429(self):
        """Test 429 (rate limit) is retryable"""
        response = httpx.Response(429, request=httpx.Request("GET", "http://test.com"))
        error = httpx.HTTPStatusError("Rate limited", request=response.request, response=response)
        
        assert is_retryable_http_error(error) is True

    def test_is_retryable_500(self):
        """Test 5xx errors are retryable"""
        response = httpx.Response(500, request=httpx.Request("GET", "http://test.com"))
        error = httpx.HTTPStatusError("Server error", request=response.request, response=response)
        
        assert is_retryable_http_error(error) is True

    def test_is_not_retryable_400(self):
        """Test 4xx errors (except 429) are not retryable"""
        response = httpx.Response(400, request=httpx.Request("GET", "http://test.com"))
        error = httpx.HTTPStatusError("Bad request", request=response.request, response=response)
        
        assert is_retryable_http_error(error) is False

    def test_is_not_retryable_404(self):
        """Test 404 is not retryable"""
        response = httpx.Response(404, request=httpx.Request("GET", "http://test.com"))
        error = httpx.HTTPStatusError("Not found", request=response.request, response=response)
        
        assert is_retryable_http_error(error) is False

    def test_is_retryable_timeout(self):
        """Test timeout errors are retryable"""
        error = httpx.TimeoutException("Request timeout")
        
        assert is_retryable_http_error(error) is True

    def test_is_retryable_network_error(self):
        """Test network errors are retryable"""
        error = httpx.NetworkError("Connection failed")
        
        assert is_retryable_http_error(error) is True

    def test_is_not_retryable_other_exception(self):
        """Test other exceptions are not retryable"""
        error = ValueError("Some error")
        
        assert is_retryable_http_error(error) is False
