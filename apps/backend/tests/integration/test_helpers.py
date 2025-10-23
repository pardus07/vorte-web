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
