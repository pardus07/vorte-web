"""Integration tests for cart endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from .test_helpers import create_admin_user, create_test_product, CartTestClient


@pytest.mark.asyncio
class TestCartBasicOperations:
    """Test basic cart CRUD operations."""
    
    async def test_get_empty_cart_creates_guest_cart(self):
        """Test that GET /cart creates empty guest cart with cookie."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            cart_client = CartTestClient(client)
            
            response = await cart_client.get_cart()
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify cart structure
            assert data["owner"]["type"] == "guest"
            assert data["status"] == "active"
            assert data["items"] == []
            assert data["totals"]["grand_total"] == 0.0
            assert data["version"] == 1
            
            # Verify ETag header
            assert "etag" in response.headers
            assert response.headers["etag"].startswith('"v')
            
            # Verify cookie is set
            assert "set-cookie" in response.headers
            assert "cart_id=" in response.headers["set-cookie"]
            assert "HttpOnly" in response.headers["set-cookie"]
            assert "SameSite=lax" in response.headers["set-cookie"].lower()
    
    async def test_add_item_to_cart_success(self):
        """Test successfully adding item to cart."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Setup: create admin and product
            admin_headers = await create_admin_user()
            product = await create_test_product(client, admin_headers, {
                "sku": "CART-TEST-001",
                "slug": "cart-test-product",
                "name": "Cart Test Product",
                "base_price": 100.00,
                "status": "active"
            })
            product_id = product["id"]
            
            # Test: add item to cart
            cart_client = CartTestClient(client)
            
            # Get cart first (to get ETag)
            await cart_client.get_cart()
            
            # Add item
            response = await cart_client.add_item(product_id, qty=2)
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify item was added
            assert len(data["items"]) == 1
            assert data["items"][0]["product_id"] == product_id
            assert data["items"][0]["qty"] == 2
            assert data["items"][0]["unit_price"] == 100.00
            assert data["items"][0]["subtotal"] == 200.00
            
            # Verify totals
            assert data["totals"]["items"] == 200.00
            assert data["totals"]["grand_total"] == 200.00
            
            # Verify version incremented
            assert data["version"] == 2
            
            # Verify new ETag
            assert "etag" in response.headers
            assert response.headers["etag"] == '"v2"'
    
    async def test_add_same_product_increases_quantity(self):
        """Test adding same product increases quantity."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            admin_headers = await create_admin_user()
            product = await create_test_product(client, admin_headers, {
                "sku": "CART-TEST-002",
                "slug": "cart-test-product-2",
                "name": "Cart Test Product 2",
                "base_price": 50.00,
                "status": "active"
            })
            product_id = product["id"]
            
            cart_client = CartTestClient(client)
            await cart_client.get_cart()
            
            # Add item first time
            response1 = await cart_client.add_item(product_id, qty=1)
            assert response1.status_code == 200
            assert len(response1.json()["items"]) == 1
            assert response1.json()["items"][0]["qty"] == 1
            
            # Add same item again
            response2 = await cart_client.add_item(product_id, qty=2)
            assert response2.status_code == 200
            
            data = response2.json()
            # Should still be one line item with increased quantity
            assert len(data["items"]) == 1
            assert data["items"][0]["qty"] == 3
            assert data["items"][0]["subtotal"] == 150.00
            assert data["totals"]["grand_total"] == 150.00
    
    async def test_update_item_quantity(self):
        """Test updating cart item quantity."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            admin_headers = await create_admin_user()
            product = await create_test_product(client, admin_headers, {
                "sku": "CART-TEST-003",
                "slug": "cart-test-product-3",
                "name": "Cart Test Product 3",
                "base_price": 75.00,
                "status": "active"
            })
            product_id = product["id"]
            
            cart_client = CartTestClient(client)
            await cart_client.get_cart()
            
            # Add item
            add_response = await cart_client.add_item(product_id, qty=1)
            line_id = add_response.json()["items"][0]["line_id"]
            
            # Update quantity
            update_response = await cart_client.update_item(line_id, qty=5)
            
            assert update_response.status_code == 200
            data = update_response.json()
            
            assert data["items"][0]["qty"] == 5
            assert data["items"][0]["subtotal"] == 375.00
            assert data["totals"]["grand_total"] == 375.00
    
    async def test_remove_item_from_cart(self):
        """Test removing item from cart."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            admin_headers = await create_admin_user()
            product = await create_test_product(client, admin_headers, {
                "sku": "CART-TEST-004",
                "slug": "cart-test-product-4",
                "name": "Cart Test Product 4",
                "base_price": 25.00,
                "status": "active"
            })
            product_id = product["id"]
            
            cart_client = CartTestClient(client)
            await cart_client.get_cart()
            
            # Add item
            add_response = await cart_client.add_item(product_id, qty=1)
            line_id = add_response.json()["items"][0]["line_id"]
            
            # Remove item
            remove_response = await cart_client.remove_item(line_id)
            
            assert remove_response.status_code == 200
            data = remove_response.json()
            
            assert len(data["items"]) == 0
            assert data["totals"]["grand_total"] == 0.0


@pytest.mark.asyncio
class TestCartOptimisticLocking:
    """Test ETag/If-Match optimistic locking."""
    
    async def test_add_item_requires_if_match(self):
        """Test that add item requires If-Match header (428)."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            admin_headers = await create_admin_user()
            product = await create_test_product(client, admin_headers, {
                "sku": "LOCK-TEST-001",
                "slug": "lock-test-product",
                "name": "Lock Test Product",
                "base_price": 100.00,
                "status": "active"
            })
            product_id = product["id"]
            
            cart_client = CartTestClient(client)
            await cart_client.get_cart()
            
            # Try to add without If-Match
            response = await client.post(
                "/api/v1/cart/items",
                json={"product_id": product_id, "qty": 1},
                cookies=cart_client.cookies
            )
            
            assert response.status_code == 428  # Precondition Required
            assert "If-Match" in response.json()["detail"]
    
    async def test_add_item_with_wrong_etag_fails(self):
        """Test that add item with wrong ETag fails (409)."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            admin_headers = await create_admin_user()
            product = await create_test_product(client, admin_headers, {
                "sku": "LOCK-TEST-002",
                "slug": "lock-test-product-2",
                "name": "Lock Test Product 2",
                "base_price": 100.00,
                "status": "active"
            })
            product_id = product["id"]
            
            cart_client = CartTestClient(client)
            await cart_client.get_cart()
            old_etag = cart_client.last_etag
            
            # Add item (changes ETag)
            await cart_client.add_item(product_id, qty=1)
            
            # Try to add with old ETag
            response = await cart_client.add_item(
                product_id,
                qty=1,
                if_match=old_etag
            )
            
            assert response.status_code == 409  # Conflict
            assert "mismatch" in response.json()["detail"].lower()
    
    async def test_update_item_requires_if_match(self):
        """Test that update item requires If-Match header (428)."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            admin_headers = await create_admin_user()
            product = await create_test_product(client, admin_headers, {
                "sku": "LOCK-TEST-003",
                "slug": "lock-test-product-3",
                "name": "Lock Test Product 3",
                "base_price": 100.00,
                "status": "active"
            })
            product_id = product["id"]
            
            cart_client = CartTestClient(client)
            await cart_client.get_cart()
            
            # Add item
            add_response = await cart_client.add_item(product_id, qty=1)
            line_id = add_response.json()["items"][0]["line_id"]
            
            # Try to update without If-Match
            response = await client.patch(
                f"/api/v1/cart/items/{line_id}",
                json={"qty": 2},
                cookies=cart_client.cookies
            )
            
            assert response.status_code == 428  # Precondition Required
    
    async def test_remove_item_requires_if_match(self):
        """Test that remove item requires If-Match header (428)."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            admin_headers = await create_admin_user()
            product = await create_test_product(client, admin_headers, {
                "sku": "LOCK-TEST-004",
                "slug": "lock-test-product-4",
                "name": "Lock Test Product 4",
                "base_price": 100.00,
                "status": "active"
            })
            product_id = product["id"]
            
            cart_client = CartTestClient(client)
            await cart_client.get_cart()
            
            # Add item
            add_response = await cart_client.add_item(product_id, qty=1)
            line_id = add_response.json()["items"][0]["line_id"]
            
            # Try to remove without If-Match
            response = await client.delete(
                f"/api/v1/cart/items/{line_id}",
                cookies=cart_client.cookies
            )
            
            assert response.status_code == 428  # Precondition Required


@pytest.mark.asyncio
class TestCartIdempotency:
    """Test idempotency key support."""
    
    async def test_add_item_with_idempotency_key(self):
        """Test that same idempotency key returns same result."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            admin_headers = await create_admin_user()
            product = await create_test_product(client, admin_headers, {
                "sku": "IDEM-TEST-001",
                "slug": "idem-test-product",
                "name": "Idempotency Test Product",
                "base_price": 100.00,
                "status": "active"
            })
            product_id = product["id"]
            
            cart_client = CartTestClient(client)
            await cart_client.get_cart()
            
            idempotency_key = "test-key-12345"
            
            # First request
            response1 = await cart_client.add_item(
                product_id,
                qty=2,
                idempotency_key=idempotency_key
            )
            
            assert response1.status_code == 200
            data1 = response1.json()
            
            # Get fresh ETag for second request
            await cart_client.get_cart()
            
            # Second request with same idempotency key
            response2 = await cart_client.add_item(
                product_id,
                qty=2,
                idempotency_key=idempotency_key
            )
            
            assert response2.status_code == 200
            data2 = response2.json()
            
            # Should return same result (idempotent)
            # Note: Version might differ due to cache, but items should be same
            assert len(data2["items"]) == len(data1["items"])
            assert data2["totals"]["grand_total"] == data1["totals"]["grand_total"]


@pytest.mark.asyncio
class TestCartValidation:
    """Test cart validation and error cases."""
    
    async def test_add_nonexistent_product_fails(self):
        """Test adding non-existent product fails (404)."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            cart_client = CartTestClient(client)
            await cart_client.get_cart()
            
            # Try to add non-existent product
            response = await cart_client.add_item("000000000000000000000000", qty=1)
            
            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()
    
    async def test_update_nonexistent_item_fails(self):
        """Test updating non-existent item fails (404)."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            cart_client = CartTestClient(client)
            await cart_client.get_cart()
            
            # Try to update non-existent line item
            response = await cart_client.update_item("nonexistent-line-id", qty=5)
            
            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()
    
    async def test_remove_nonexistent_item_fails(self):
        """Test removing non-existent item fails (404)."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            cart_client = CartTestClient(client)
            await cart_client.get_cart()
            
            # Try to remove non-existent line item
            response = await cart_client.remove_item("nonexistent-line-id")
            
            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()
