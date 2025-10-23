"""Helper functions for integration tests."""
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.db import get_db
from bson import ObjectId


async def create_admin_user() -> dict:
    """
    Create an admin user and return auth headers.
    
    Returns:
        Dict with Authorization header
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Register user
        register_data = {
            "email": "admin@example.com",
            "password": "AdminP4ssw0rd!",
            "first_name": "Admin",
            "last_name": "User",
            "kvkk_data_processing_consent": True,
            "kvkk_marketing_consent": False
        }
        
        response = await ac.post("/api/v1/auth/register", json=register_data)
        if response.status_code != 201:
            print(f"Registration failed: {response.status_code} - {response.text}")
        assert response.status_code == 201
        
        # Update user role to admin in database
        db = get_db()
        await db["users"].update_one(
            {"email": "admin@example.com"},
            {"$set": {"role": "admin"}}
        )
        
        # Login to get tokens
        login_response = await ac.post(
            "/api/v1/auth/login",
            json={
                "email": "admin@example.com",
                "password": "AdminP4ssw0rd!"
            }
        )
        assert login_response.status_code == 200
        
        tokens = login_response.json()["tokens"]
        return {"Authorization": f"Bearer {tokens['access_token']}"}


async def create_test_product(
    client: AsyncClient,
    admin_headers: dict,
    product_data: dict = None
) -> dict:
    """
    Create a test product via admin API.
    
    Args:
        client: HTTP client
        admin_headers: Admin authorization headers
        product_data: Product data (uses default if None)
        
    Returns:
        Created product data
    """
    if product_data is None:
        product_data = {
            "sku": "TEST-001",
            "slug": "test-product",
            "name": "Test Product",
            "description": "A test product for integration testing",
            "base_price": 99.99,
            "category_ids": [],
            "brand": "Test Brand",
            "tags": ["test", "sample"],
            "images": [
                {
                    "url": "https://example.com/image.jpg",
                    "alt_text": "Test product image",
                    "sort_order": 0,
                    "is_primary": True
                }
            ],
            "variants": [
                {
                    "id": "variant-1",
                    "sku": "TEST-001-M",
                    "attributes": {"size": "M", "color": "Blue"},
                    "price_adjustment": 0,
                    "stock_quantity": 10,
                    "weight": 0.5,
                    "status": "available"
                }
            ],
            "status": "active"
        }
    
    response = await client.post(
        "/api/v1/admin/products",
        headers=admin_headers,
        json=product_data
    )
    
    assert response.status_code == 201
    return response.json()


class CartTestClient:
    """Helper class for cart testing with ETag and cookie management."""
    
    def __init__(self, client: AsyncClient):
        """Initialize cart test client."""
        self.client = client
        self.cookies = {}
        self.last_etag = None
    
    async def get_cart(self, headers: dict = None) -> dict:
        """Get cart and store ETag."""
        response = await self.client.get(
            "/api/v1/cart",
            headers=headers or {},
            cookies=self.cookies
        )
        
        # Store cookies
        if "set-cookie" in response.headers:
            # Parse cart_id cookie
            cookie_header = response.headers["set-cookie"]
            if "cart_id=" in cookie_header:
                cart_id = cookie_header.split("cart_id=")[1].split(";")[0]
                self.cookies["cart_id"] = cart_id
        
        # Store ETag
        if "etag" in response.headers:
            self.last_etag = response.headers["etag"]
        
        return response
    
    async def add_item(
        self,
        product_id: str,
        qty: int = 1,
        variant_id: str = None,
        idempotency_key: str = None,
        if_match: str = None,
        headers: dict = None
    ) -> dict:
        """Add item to cart."""
        request_headers = headers or {}
        
        # Use stored ETag if not provided
        if if_match is None and self.last_etag:
            request_headers["If-Match"] = self.last_etag
        elif if_match:
            request_headers["If-Match"] = if_match
        
        if idempotency_key:
            request_headers["Idempotency-Key"] = idempotency_key
        
        body = {"product_id": product_id, "qty": qty}
        if variant_id:
            body["variant_id"] = variant_id
        
        response = await self.client.post(
            "/api/v1/cart/items",
            json=body,
            headers=request_headers,
            cookies=self.cookies
        )
        
        # Update ETag if successful
        if response.status_code == 200 and "etag" in response.headers:
            self.last_etag = response.headers["etag"]
        
        return response
    
    async def update_item(
        self,
        line_id: str,
        qty: int,
        if_match: str = None,
        headers: dict = None
    ) -> dict:
        """Update cart item quantity."""
        request_headers = headers or {}
        
        # Use stored ETag if not provided
        if if_match is None and self.last_etag:
            request_headers["If-Match"] = self.last_etag
        elif if_match:
            request_headers["If-Match"] = if_match
        
        response = await self.client.patch(
            f"/api/v1/cart/items/{line_id}",
            json={"qty": qty},
            headers=request_headers,
            cookies=self.cookies
        )
        
        # Update ETag if successful
        if response.status_code == 200 and "etag" in response.headers:
            self.last_etag = response.headers["etag"]
        
        return response
    
    async def remove_item(
        self,
        line_id: str,
        if_match: str = None,
        headers: dict = None
    ) -> dict:
        """Remove item from cart."""
        request_headers = headers or {}
        
        # Use stored ETag if not provided
        if if_match is None and self.last_etag:
            request_headers["If-Match"] = self.last_etag
        elif if_match:
            request_headers["If-Match"] = if_match
        
        response = await self.client.delete(
            f"/api/v1/cart/items/{line_id}",
            headers=request_headers,
            cookies=self.cookies
        )
        
        # Update ETag if successful
        if response.status_code == 200 and "etag" in response.headers:
            self.last_etag = response.headers["etag"]
        
        return response
