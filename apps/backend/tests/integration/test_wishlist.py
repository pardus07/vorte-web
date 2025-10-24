"""Integration tests for wishlist and comparison."""
import pytest
from httpx import AsyncClient
from bson import ObjectId

from app.services.db import get_db


@pytest.mark.asyncio
async def test_wishlist_crud(client: AsyncClient, auth_headers: dict):
    """Test wishlist CRUD operations."""
    db = get_db()
    
    # Create a test product
    product = {
        "_id": ObjectId(),
        "name": "Wishlist Test Product",
        "slug": "wishlist-test-product",
        "sku": "WISH-001",
        "price": 150.0,
        "status": "active",
        "images": [{"url": "https://example.com/image.jpg"}],
        "version": 1
    }
    await db["products"].insert_one(product)
    product_id = str(product["_id"])
    
    # Add to wishlist
    response = await client.post(
        "/api/v1/wishlist/items",
        json={"product_id": product_id},
        headers=auth_headers
    )
    assert response.status_code == 201
    item = response.json()
    assert item["product_id"] == product_id
    
    # Get wishlist
    response = await client.get("/api/v1/wishlist", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 1
    assert data["items"][0]["product_id"] == product_id
    
    # Remove from wishlist
    response = await client.delete(
        f"/api/v1/wishlist/items/{product_id}",
        headers=auth_headers
    )
    assert response.status_code == 204
    
    # Verify removed
    response = await client.get("/api/v1/wishlist", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 0
    
    # Cleanup
    await db["products"].delete_one({"_id": product["_id"]})


@pytest.mark.asyncio
async def test_product_comparison(client: AsyncClient):
    """Test product comparison with max 4 products."""
    db = get_db()
    
    # Create test products
    products = []
    for i in range(5):
        product = {
            "_id": ObjectId(),
            "name": f"Compare Product {i+1}",
            "slug": f"compare-product-{i+1}",
            "sku": f"CMP-{i+1:03d}",
            "price": 100.0 + (i * 10),
            "status": "active",
            "attributes": {
                "Brand": f"Brand {i+1}",
                "Color": "Black" if i % 2 == 0 else "White"
            },
            "version": 1
        }
        await db["products"].insert_one(product)
        products.append(str(product["_id"]))
    
    # Compare 3 products
    response = await client.post(
        "/api/v1/compare",
        json={"product_ids": products[:3]}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 3
    assert len(data["products"]) == 3
    assert "attributes" in data
    
    # Compare more than 4 products (should limit to 4)
    response = await client.post(
        "/api/v1/compare",
        json={"product_ids": products}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 4  # Limited to max 4
    
    # Cleanup
    for pid in products:
        await db["products"].delete_one({"_id": ObjectId(pid)})


@pytest.mark.asyncio
async def test_comparison_with_invalid_products(client: AsyncClient):
    """Test comparison with invalid product IDs."""
    response = await client.post(
        "/api/v1/compare",
        json={"product_ids": ["invalid-id-1", "invalid-id-2"]}
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_price_drop_notification(client: AsyncClient, auth_headers: dict):
    """Test price drop detection in wishlist."""
    db = get_db()
    
    # Create a product
    product = {
        "_id": ObjectId(),
        "name": "Price Drop Product",
        "slug": "price-drop-product",
        "sku": "PRICE-001",
        "price": 200.0,
        "status": "active",
        "images": [{"url": "https://example.com/image.jpg"}],
        "version": 1
    }
    await db["products"].insert_one(product)
    product_id = str(product["_id"])
    
    # Add to wishlist
    response = await client.post(
        "/api/v1/wishlist/items",
        json={"product_id": product_id},
        headers=auth_headers
    )
    assert response.status_code == 201
    
    # Update product price (drop by 15%)
    await db["products"].update_one(
        {"_id": product["_id"]},
        {"$set": {"price": 170.0}}
    )
    
    # Check for price drops
    from app.services.wishlist_service import wishlist_service
    price_drops = await wishlist_service.check_price_drops(threshold_percentage=10.0)
    
    # Should detect the price drop
    assert len(price_drops) > 0
    found = False
    for item in price_drops:
        if item["product_id"] == product_id:
            found = True
            assert item["price_drop_percentage"] >= 10.0
            break
    assert found
    
    # Cleanup
    await db["products"].delete_one({"_id": product["_id"]})
    await db["wishlists"].delete_many({"product_id": product_id})
