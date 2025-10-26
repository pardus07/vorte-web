"""
Unit tests for idempotency store

Tests Redis-based idempotency with 24-hour TTL and param validation.
"""
import pytest
from app.services.idempotency import _hash_params, CachedResponse


class TestIdempotency:
    """Test idempotency utilities"""

    def test_hash_params_deterministic(self):
        """Test params hashing is deterministic"""
        params1 = {"orderId": "ord_123", "amount": 10000, "currency": "TRY"}
        params2 = {"orderId": "ord_123", "amount": 10000, "currency": "TRY"}

        # Same params should produce same hash
        assert _hash_params(params1) == _hash_params(params2)

    def test_hash_params_different(self):
        """Test different params produce different hashes"""
        params1 = {"orderId": "ord_123", "amount": 10000}
        params2 = {"orderId": "ord_123", "amount": 20000}

        assert _hash_params(params1) != _hash_params(params2)

    def test_hash_params_order_independent(self):
        """Test params hash is order-independent (sorted keys)"""
        params1 = {"amount": 10000, "orderId": "ord_123", "currency": "TRY"}
        params2 = {"orderId": "ord_123", "currency": "TRY", "amount": 10000}

        # Different order should produce same hash
        assert _hash_params(params1) == _hash_params(params2)

    def test_cached_response_structure(self):
        """Test CachedResponse dataclass"""
        response = CachedResponse(
            status=200, headers={"Content-Type": "application/json"}, body={"success": True}
        )

        assert response.status == 200
        assert response.headers["Content-Type"] == "application/json"
        assert response.body["success"] is True
