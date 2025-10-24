"""Integration tests for campaign endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timedelta

from app.main import app
from .test_helpers import create_admin_user, create_test_product, CartTestClient


@pytest.mark.asyncio
class TestCouponApplication:
    """Test coupon application to cart."""
    
    async def test_apply_valid_coupon_to_cart(self):
        """Test applying a valid coupon code to cart."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Setup: create admin, product, and campaign
            admin_headers = await create_admin_user()
            
            product = await create_test_product(client, admin_headers, {
                "sku": "COUPON-TEST-001",
                "slug": "coupon-test-product",
                "name": "Coupon Test Product",
                "base_price": 100.00,
                "status": "active"
            })
            product_id = product["id"]
            
            # Create a coupon campaign
            now = datetime.utcnow()
            campaign_data = {
                "name": "Test Coupon 20% Off",
                "type": "coupon",
                "coupon_code": "TEST20",
                "rules": [
                    {
                        "type": "min_amount",
                        "operator": ">=",
                        "value": 50
                    }
                ],
                "actions": [
                    {
                        "type": "percentage_discount",
                        "value": 20
                    }
                ],
                "priority": 1,
                "start_date": (now - timedelta(days=1)).isoformat(),
                "end_date": (now + timedelta(days=30)).isoformat()
            }
            
            # Create campaign via admin API (would need admin campaign endpoint)
            # For now, insert directly into database
            from app.services.db import get_db
            db = get_db()
            await db["campaigns"].insert_one({
                **campaign_data,
                "status": "active",
                "usage_count": 0,
                "created_at": now,
                "updated_at": now,
                "start_date": now - timedelta(days=1),
                "end_date": now + timedelta(days=30)
            })
            
            # Add product to cart
            cart_client = CartTestClient(client)
            await cart_client.get_cart()
            await cart_client.add_item(product_id, qty=2)
            
            # Apply coupon
            response = await client.post(
                "/api/v1/cart/apply-coupon",
                params={"coupon_code": "TEST20"},
                headers={"If-Match": cart_client.last_etag},
                cookies=cart_client.cookies
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify discount was applied
            assert "applied_coupons" in data
            assert "TEST20" in data["applied_coupons"]
            
            # Cart total should be 200, discount should be 40 (20%)
            assert data["totals"]["items"] == 200.00
            assert data["totals"]["discount"] == 40.00
            assert data["totals"]["grand_total"] == 160.00
    
    async def test_apply_invalid_coupon_fails(self):
        """Test applying invalid coupon code fails."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            admin_headers = await create_admin_user()
            product = await create_test_product(client, admin_headers, {
                "sku": "COUPON-TEST-002",
                "slug": "coupon-test-product-2",
                "name": "Coupon Test Product 2",
                "base_price": 100.00,
                "status": "active"
            })
            product_id = product["id"]
            
            # Add product to cart
            cart_client = CartTestClient(client)
            await cart_client.get_cart()
            await cart_client.add_item(product_id, qty=1)
            
            # Try to apply non-existent coupon
            response = await client.post(
                "/api/v1/cart/apply-coupon",
                params={"coupon_code": "INVALID"},
                headers={"If-Match": cart_client.last_etag},
                cookies=cart_client.cookies
            )
            
            assert response.status_code == 400
            assert "invalid" in response.json()["detail"].lower()
    
    async def test_remove_coupon_from_cart(self):
        """Test removing an applied coupon from cart."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            admin_headers = await create_admin_user()
            product = await create_test_product(client, admin_headers, {
                "sku": "COUPON-TEST-003",
                "slug": "coupon-test-product-3",
                "name": "Coupon Test Product 3",
                "base_price": 100.00,
                "status": "active"
            })
            product_id = product["id"]
            
            # Create coupon
            now = datetime.utcnow()
            from app.services.db import get_db
            db = get_db()
            await db["campaigns"].insert_one({
                "name": "Test Coupon 10% Off",
                "type": "coupon",
                "coupon_code": "TEST10",
                "rules": [{"type": "min_amount", "operator": ">=", "value": 50}],
                "actions": [{"type": "percentage_discount", "value": 10}],
                "priority": 1,
                "status": "active",
                "usage_count": 0,
                "start_date": now - timedelta(days=1),
                "end_date": now + timedelta(days=30),
                "created_at": now,
                "updated_at": now
            })
            
            # Add product and apply coupon
            cart_client = CartTestClient(client)
            await cart_client.get_cart()
            await cart_client.add_item(product_id, qty=2)
            
            apply_response = await client.post(
                "/api/v1/cart/apply-coupon",
                params={"coupon_code": "TEST10"},
                headers={"If-Match": cart_client.last_etag},
                cookies=cart_client.cookies
            )
            assert apply_response.status_code == 200
            
            # Update ETag
            cart_client.last_etag = apply_response.headers["etag"]
            
            # Remove coupon
            remove_response = await client.delete(
                "/api/v1/cart/coupons/TEST10",
                headers={"If-Match": cart_client.last_etag},
                cookies=cart_client.cookies
            )
            
            assert remove_response.status_code == 200
            data = remove_response.json()
            
            # Verify coupon was removed
            assert "TEST10" not in data.get("applied_coupons", [])
            
            # Discount should be 0
            assert data["totals"]["discount"] == 0.0
            assert data["totals"]["grand_total"] == 200.00


@pytest.mark.asyncio
class TestAutomaticCartRules:
    """Test automatic cart rule application."""
    
    async def test_automatic_cart_rule_applies(self):
        """Test that automatic cart rules apply when conditions are met."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            admin_headers = await create_admin_user()
            product = await create_test_product(client, admin_headers, {
                "sku": "RULE-TEST-001",
                "slug": "rule-test-product",
                "name": "Rule Test Product",
                "base_price": 100.00,
                "status": "active"
            })
            product_id = product["id"]
            
            # Create automatic cart rule (10% off for orders over 150)
            now = datetime.utcnow()
            from app.services.db import get_db
            db = get_db()
            await db["campaigns"].insert_one({
                "name": "Auto 10% Off Over 150",
                "type": "cart_rule",
                "rules": [{"type": "min_amount", "operator": ">=", "value": 150}],
                "actions": [{"type": "percentage_discount", "value": 10}],
                "priority": 1,
                "status": "active",
                "usage_count": 0,
                "start_date": now - timedelta(days=1),
                "end_date": now + timedelta(days=30),
                "created_at": now,
                "updated_at": now
            })
            
            # Add products to cart (total 200)
            cart_client = CartTestClient(client)
            await cart_client.get_cart()
            response = await cart_client.add_item(product_id, qty=2)
            
            # Automatic discount should be applied
            data = response.json()
            assert data["totals"]["items"] == 200.00
            # 10% discount should be applied automatically
            assert data["totals"]["discount"] == 20.00
            assert data["totals"]["grand_total"] == 180.00
