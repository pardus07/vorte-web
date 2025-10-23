"""Integration tests for product endpoints."""
import pytest
from httpx import AsyncClient

from app.main import app
from .test_helpers import create_admin_user, create_test_product


@pytest.mark.asyncio
class TestProductCRUD:
    """Test product CRUD operations with admin endpoints."""
    
    async def test_admin_create_product_success(self):
        """Test successful product creation by admin."""
        from httpx import ASGITransport
        admin_headers = await create_admin_user()
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            product_data = {
                "sku": "NIKE-001",
                "slug": "nike-air-max",
                "name": "Nike Air Max",
                "description": "Comfortable running shoes",
                "base_price": 149.99,
                "category_ids": [],
                "brand": "Nike",
                "tags": ["running", "comfortable"],
                "variants": [
                    {
                        "id": "nike-001-42",
                        "sku": "NIKE-001-42",
                        "attributes": {"size": "42", "color": "White"},
                        "price_adjustment": 0,
                        "stock_quantity": 5,
                        "weight": 0.8
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
            data = response.json()
            
            assert data["sku"] == "NIKE-001"
            assert data["slug"] == "nike-air-max"
            assert data["name"] == "Nike Air Max"
            assert data["status"] == "active"
            assert "id" in data
            assert "version" in data


@pytest.mark.asyncio
class TestPublicProductEndpoints:
    """Test public product endpoints."""
    
    async def test_public_get_product_with_etag(self):
        """Test public product retrieval with ETag header."""
        from httpx import ASGITransport
        admin_headers = await create_admin_user()
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Create published product
            product = await create_test_product(client, admin_headers, {
                "sku": "PUB-001",
                "slug": "public-product",
                "name": "Public Product",
                "status": "active"
            })
            product_id = product["id"]
            
            # Get product via public endpoint
            response = await client.get(f"/api/v1/products/{product_id}")
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify ETag header
            etag = response.headers.get("ETag")
            assert etag is not None
            assert etag.startswith('W/"')
            
            # Verify Cache-Control header
            cache_control = response.headers.get("Cache-Control")
            assert "public" in cache_control
            assert "max-age=300" in cache_control
            
            # Verify product data
            assert data["name"] == "Public Product"
            assert data["status"] == "active"
