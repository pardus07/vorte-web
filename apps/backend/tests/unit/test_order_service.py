"""Unit tests for order service."""
import pytest
from app.services.order_service import OrderService


class TestStatusTransitions:
    """Test order status transition validation."""
    
    def test_valid_transitions(self):
        """Test valid status transitions."""
        service = OrderService()
        
        # Valid transitions
        assert service.validate_status_transition("created", "paid") is True
        assert service.validate_status_transition("paid", "picking") is True
        assert service.validate_status_transition("picking", "shipped") is True
        assert service.validate_status_transition("shipped", "delivered") is True
        assert service.validate_status_transition("delivered", "returned") is True
    
    def test_invalid_transitions(self):
        """Test invalid status transitions."""
        service = OrderService()
        
        # Invalid transitions
        assert service.validate_status_transition("created", "shipped") is False
        assert service.validate_status_transition("paid", "delivered") is False
        assert service.validate_status_transition("shipped", "paid") is False
        assert service.validate_status_transition("cancelled", "paid") is False
    
    def test_cancellation_allowed(self):
        """Test cancellation is allowed from multiple states."""
        service = OrderService()
        
        assert service.validate_status_transition("created", "cancelled") is True
        assert service.validate_status_transition("paid", "cancelled") is True
        assert service.validate_status_transition("picking", "cancelled") is True
        assert service.validate_status_transition("shipped", "cancelled") is False


class TestETagGeneration:
    """Test ETag generation for orders."""
    
    def test_etag_format(self):
        """Test ETag format."""
        order = {"version": 3}
        etag = OrderService.generate_etag(order)
        assert etag == '"v3"'
    
    def test_etag_changes_with_version(self):
        """Test ETag changes when version changes."""
        order_v1 = {"version": 1}
        order_v2 = {"version": 2}
        
        etag1 = OrderService.generate_etag(order_v1)
        etag2 = OrderService.generate_etag(order_v2)
        
        assert etag1 != etag2
