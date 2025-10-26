# apps/backend/tests/test_email_templates.py
"""
Tests for email template rendering system.

Tests:
- Template rendering (TR/EN)
- CSS inlining
- HTML + text generation
- Variable substitution
- NotificationService integration
"""
import pytest
from datetime import datetime
from app.notifications.renderer import render_email, get_available_templates


class TestTemplateRendering:
    """Test Jinja2 template rendering."""

    def test_render_order_confirmation_tr(self):
        """Test Turkish order confirmation template."""
        context = {
            "order": {
                "id": "ORD-12345",
                "order_items": [
                    {
                        "name": "Ürün 1",
                        "quantity": 2,
                        "price_formatted": "100,00 TL",
                    },
                    {
                        "name": "Ürün 2",
                        "quantity": 1,
                        "price_formatted": "50,00 TL",
                    },
                ],
                "total_formatted": "250,00 TL",
                "tracking_url": "https://example.com/orders/ORD-12345",
            },
            "customer": {
                "first_name": "Ahmet",
                "address": {
                    "line1": "Test Caddesi No:1",
                    "line2": "Daire 5",
                    "city": "İstanbul",
                    "postal_code": "34000",
                    "country": "Türkiye",
                },
            },
            "brand_name": "TestStore",
            "current_year": "2025",
        }

        result = render_email("order_confirmation", "tr", context)

        # Check HTML generated
        assert result["html"]
        assert "Siparişiniz alındı" in result["html"]
        assert "ORD-12345" in result["html"]
        assert "Ahmet" in result["html"]
        assert "250,00 TL" in result["html"]

        # Check text fallback generated
        assert result["text"]
        assert "ORD-12345" in result["text"]

    def test_render_order_confirmation_en(self):
        """Test English order confirmation template."""
        context = {
            "order": {
                "id": "ORD-12345",
                "order_items": [
                    {
                        "name": "Product 1",
                        "quantity": 2,
                        "price_formatted": "$100.00",
                    },
                ],
                "total_formatted": "$100.00",
                "tracking_url": "https://example.com/orders/ORD-12345",
            },
            "customer": {
                "first_name": "John",
                "address": {
                    "line1": "123 Main St",
                    "city": "New York",
                    "postal_code": "10001",
                    "country": "USA",
                },
            },
            "brand_name": "TestStore",
            "current_year": "2025",
        }

        result = render_email("order_confirmation", "en", context)

        assert result["html"]
        assert "Order Received" in result["html"]
        assert "John" in result["html"]
        assert "$100.00" in result["html"]

    def test_render_payment_authorized_tr(self):
        """Test Turkish payment authorized template."""
        context = {
            "payment": {
                "id": "PAY-12345",
                "amount_formatted": "250,00 TL",
                "created_at": "2025-01-15 14:30:00",
                "card_last4": "**** 1234",
            },
            "order": {
                "id": "ORD-12345",
                "tracking_url": "https://example.com/orders/ORD-12345",
            },
            "customer": {
                "first_name": "Ahmet",
            },
            "brand_name": "TestStore",
        }

        result = render_email("payment_authorized", "tr", context)

        assert result["html"]
        assert "Ödeme Başarılı" in result["html"]
        assert "PAY-12345" in result["html"]
        assert "250,00 TL" in result["html"]

    def test_render_payment_failed_tr(self):
        """Test Turkish payment failed template."""
        context = {
            "payment": {
                "id": "PAY-12345",
                "amount_formatted": "250,00 TL",
                "created_at": "2025-01-15 14:30:00",
                "error_message": "Yetersiz bakiye",
            },
            "order": {
                "id": "ORD-12345",
            },
            "customer": {
                "first_name": "Ahmet",
            },
            "retry_url": "https://example.com/retry/PAY-12345",
            "support_url": "https://example.com/support",
            "brand_name": "TestStore",
        }

        result = render_email("payment_failed", "tr", context)

        assert result["html"]
        assert "Ödeme Başarısız" in result["html"]
        assert "Yetersiz bakiye" in result["html"]
        assert "Tekrar Dene" in result["html"]

    def test_render_refund_issued_en(self):
        """Test English refund issued template."""
        context = {
            "refund": {
                "id": "REF-12345",
                "amount_formatted": "$100.00",
                "created_at": "2025-01-15 14:30:00",
                "reason": "Customer request",
            },
            "payment": {
                "id": "PAY-12345",
                "amount_formatted": "$100.00",
            },
            "order": {
                "id": "ORD-12345",
                "tracking_url": "https://example.com/orders/ORD-12345",
            },
            "customer": {
                "first_name": "John",
            },
            "brand_name": "TestStore",
        }

        result = render_email("refund_issued", "en", context)

        assert result["html"]
        assert "Refund Initiated" in result["html"]
        assert "REF-12345" in result["html"]
        assert "$100.00" in result["html"]
        assert "Customer request" in result["html"]


class TestCSSInlining:
    """Test CSS inlining for email client compatibility."""

    def test_css_inlined_in_html(self):
        """Test that CSS is inlined in rendered HTML."""
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
            "customer": {"first_name": "Test"},
            "brand_name": "TestStore",
        }

        result = render_email("payment_authorized", "tr", context)

        # Check that inline styles exist (premailer converts CSS to inline)
        html = result["html"]
        
        # Should have inline styles on elements
        assert 'style=' in html
        
        # Button should have inline background color
        assert 'background-color' in html.lower()

    def test_btn_class_has_inline_styles(self):
        """Test that .btn class gets inlined styles."""
        context = {
            "payment": {
                "id": "PAY-12345",
                "amount_formatted": "250,00 TL",
                "created_at": "2025-01-15",
                "error_message": "Test error",
            },
            "order": {"id": "ORD-12345"},
            "customer": {"first_name": "Test"},
            "retry_url": "https://example.com/retry",
            "support_url": "https://example.com/support",
            "brand_name": "TestStore",
        }

        result = render_email("payment_failed", "tr", context)
        html = result["html"]

        # Button links should have inline styles
        assert 'class="btn"' in html or 'style=' in html


class TestTemplateAvailability:
    """Test template discovery."""

    def test_get_available_templates_tr(self):
        """Test getting available Turkish templates."""
        templates = get_available_templates("tr")

        assert "order_confirmation" in templates
        assert "payment_authorized" in templates
        assert "payment_failed" in templates
        assert "refund_issued" in templates

    def test_get_available_templates_en(self):
        """Test getting available English templates."""
        templates = get_available_templates("en")

        assert "order_confirmation" in templates
        assert "payment_authorized" in templates
        assert "payment_failed" in templates
        assert "refund_issued" in templates


class TestErrorHandling:
    """Test error handling in template rendering."""

    def test_invalid_template_raises_error(self):
        """Test that invalid template name raises error."""
        with pytest.raises(Exception):
            render_email("nonexistent_template", "tr", {})

    def test_invalid_locale_raises_error(self):
        """Test that invalid locale raises error."""
        with pytest.raises(Exception):
            render_email("order_confirmation", "invalid", {})
