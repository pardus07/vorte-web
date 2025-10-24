"""Unit tests for cart service business logic."""
import pytest
from app.services.cart_service import CartService


class TestCartTotalsCalculation:
    """Test cart totals calculation logic."""
    
    def test_calculate_totals_empty_cart(self):
        """Test totals calculation for empty cart."""
        service = CartService()
        
        totals = service.calculate_totals([])
        
        assert totals["items"] == 0.0
        assert totals["shipping"] == 0.0
        assert totals["discount"] == 0.0
        assert totals["grand_total"] == 0.0
    
    def test_calculate_totals_single_item(self):
        """Test totals calculation for single item."""
        service = CartService()
        
        items = [
            {
                "line_id": "line-1",
                "product_id": "prod-1",
                "qty": 2,
                "unit_price": 50.00,
                "subtotal": 100.00,
                "discounts": []
            }
        ]
        
        totals = service.calculate_totals(items)
        
        assert totals["items"] == 100.00
        assert totals["shipping"] == 0.0
        assert totals["discount"] == 0.0
        assert totals["grand_total"] == 100.00
    
    def test_calculate_totals_multiple_items(self):
        """Test totals calculation for multiple items."""
        service = CartService()
        
        items = [
            {
                "line_id": "line-1",
                "product_id": "prod-1",
                "qty": 2,
                "unit_price": 50.00,
                "subtotal": 100.00,
                "discounts": []
            },
            {
                "line_id": "line-2",
                "product_id": "prod-2",
                "qty": 1,
                "unit_price": 75.50,
                "subtotal": 75.50,
                "discounts": []
            },
            {
                "line_id": "line-3",
                "product_id": "prod-3",
                "qty": 3,
                "unit_price": 25.00,
                "subtotal": 75.00,
                "discounts": []
            }
        ]
        
        totals = service.calculate_totals(items)
        
        assert totals["items"] == 250.50
        assert totals["shipping"] == 0.0
        assert totals["discount"] == 0.0
        assert totals["grand_total"] == 250.50
    
    def test_calculate_totals_rounding(self):
        """Test that totals are properly rounded to 2 decimal places."""
        service = CartService()
        
        items = [
            {
                "line_id": "line-1",
                "product_id": "prod-1",
                "qty": 3,
                "unit_price": 33.333,
                "subtotal": 99.999,
                "discounts": []
            }
        ]
        
        totals = service.calculate_totals(items)
        
        # Should round to 2 decimal places
        assert totals["items"] == 100.00
        assert totals["grand_total"] == 100.00


class TestETagGeneration:
    """Test ETag generation for optimistic locking."""
    
    def test_generate_etag_format(self):
        """Test ETag format is correct."""
        cart = {"version": 5}
        
        etag = CartService.generate_etag(cart)
        
        assert etag == '"v5"'
    
    def test_generate_etag_different_versions(self):
        """Test ETags differ for different versions."""
        cart_v1 = {"version": 1}
        cart_v2 = {"version": 2}
        
        etag1 = CartService.generate_etag(cart_v1)
        etag2 = CartService.generate_etag(cart_v2)
        
        assert etag1 == '"v1"'
        assert etag2 == '"v2"'
        assert etag1 != etag2
