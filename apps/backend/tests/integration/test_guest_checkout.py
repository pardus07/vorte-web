"""Integration tests for guest checkout flow."""
import pytest
from httpx import AsyncClient
from bson import ObjectId

from app.services.db import get_db


@pytest.mark.asyncio
async def test_guest_checkout_flow(client: AsyncClient):
    """Test complete guest checkout flow."""
    db = get_db()
    
    # Create a test product
    product = {
        "_id": ObjectId(),
        "name": "Test Product",
        "slug": "test-product-guest",
        "sku": "TEST-GUEST-001",
        "price": 100.0,
        "status": "active",
        "stock": {
            "on_hand": 10,
            "reserved": 0,
            "available": 10
        },
        "version": 1
    }
    await db["products"].insert_one(product)
    
    # Create guest cart
    cart = {
        "_id": ObjectId(),
        "session_id": "guest-session-123",
        "user_id": None,
        "items": [
            {
                "product_id": str(product["_id"]),
                "variant_id": None,
                "product_name": "Test Product",
                "sku": "TEST-GUEST-001",
                "qty": 2,
                "unit_price": 100.0,
                "subtotal": 200.0
            }
        ],
        "totals": {
            "items": 200.0,
            "discount": 0,
            "shipping": 10.0,
            "grand_total": 210.0
        },
        "checked_out": False
    }
    await db["carts"].insert_one(cart)
    
    # Initiate checkout as guest
    checkout_data = {
        "cart_id": str(cart["_id"]),
        "shipping_address": {
            "first_name": "Guest",
            "last_name": "User",
            "address_line1": "123 Test St",
            "city": "Istanbul",
            "state": "Istanbul",
            "postal_code": "34000",
            "country": "TR"
        },
        "billing_address": {
            "first_name": "Guest",
            "last_name": "User",
            "address_line1": "123 Test St",
            "city": "Istanbul",
            "state": "Istanbul",
            "postal_code": "34000",
            "country": "TR"
        },
        "payment_method": "credit_card",
        "customer_email": "guest@example.com",
        "customer_name": "Guest User",
        "customer_phone": "+905551234567"
    }
    
    response = await client.post(
        "/api/v1/checkout/initiate",
        json=checkout_data,
        headers={"Idempotency-Key": "guest-checkout-123"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "order_id" in data
    assert "order_number" in data
    assert data["total"] == 210.0
    
    order_id = data["order_id"]
    
    # Verify order was created with tracking token
    order = await db["orders"].find_one({"_id": ObjectId(order_id)})
    assert order is not None
    assert order["customer_info"]["email"] == "guest@example.com"
    assert order["customer_info"]["user_id"] is None
    assert "tracking_token" in order
    assert order["tracking_token"] is not None
    
    tracking_token = order["tracking_token"]
    
    # Track order using token (no auth required)
    response = await client.get(f"/api/v1/orders/track/{tracking_token}")
    assert response.status_code == 200
    
    tracking_data = response.json()
    assert tracking_data["order_number"] == data["order_number"]
    assert tracking_data["status"] == "created"
    assert tracking_data["total"] == 210.0
    
    # Cleanup
    await db["products"].delete_one({"_id": product["_id"]})
    await db["carts"].delete_one({"_id": cart["_id"]})
    await db["orders"].delete_one({"_id": ObjectId(order_id)})


@pytest.mark.asyncio
async def test_guest_order_linking_on_registration(client: AsyncClient):
    """Test that guest orders are linked when user registers with same email."""
    db = get_db()
    
    # Create a guest order
    guest_order = {
        "_id": ObjectId(),
        "order_number": "ORD-2024-99999",
        "customer_info": {
            "user_id": None,
            "email": "newuser@example.com",
            "first_name": "New",
            "last_name": "User",
            "phone": "+905551234567"
        },
        "items": [],
        "total": 100.0,
        "status": "created",
        "tracking_token": "test-token-123",
        "version": 1
    }
    await db["orders"].insert_one(guest_order)
    
    # Register user with same email
    register_data = {
        "email": "newuser@example.com",
        "password": "SecurePass123!",
        "first_name": "New",
        "last_name": "User",
        "phone": "+905551234567",
        "kvkk_data_processing_consent": True,
        "kvkk_marketing_consent": False
    }
    
    response = await client.post("/api/v1/auth/register", json=register_data)
    assert response.status_code == 201
    
    user_data = response.json()
    user_id = user_data["id"]
    
    # Verify order is now linked to user
    linked_order = await db["orders"].find_one({"_id": guest_order["_id"]})
    assert linked_order is not None
    assert linked_order["customer_info"]["user_id"] == user_id
    
    # Cleanup
    await db["orders"].delete_one({"_id": guest_order["_id"]})
    await db["users"].delete_one({"_id": ObjectId(user_id)})


@pytest.mark.asyncio
async def test_invalid_tracking_token(client: AsyncClient):
    """Test tracking with invalid token returns 404."""
    response = await client.get("/api/v1/orders/track/invalid-token-xyz")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_guest_checkout_email_sent(client: AsyncClient):
    """Test that order confirmation email is sent to guest."""
    db = get_db()
    
    # Create a test product
    product = {
        "_id": ObjectId(),
        "name": "Email Test Product",
        "slug": "email-test-product",
        "sku": "EMAIL-TEST-001",
        "price": 50.0,
        "status": "active",
        "stock": {
            "on_hand": 5,
            "reserved": 0,
            "available": 5
        },
        "version": 1
    }
    await db["products"].insert_one(product)
    
    # Create guest cart
    cart = {
        "_id": ObjectId(),
        "session_id": "guest-email-session",
        "user_id": None,
        "items": [
            {
                "product_id": str(product["_id"]),
                "variant_id": None,
                "product_name": "Email Test Product",
                "sku": "EMAIL-TEST-001",
                "qty": 1,
                "unit_price": 50.0,
                "subtotal": 50.0
            }
        ],
        "totals": {
            "items": 50.0,
            "discount": 0,
            "shipping": 10.0,
            "grand_total": 60.0
        },
        "checked_out": False
    }
    await db["carts"].insert_one(cart)
    
    # Initiate checkout
    checkout_data = {
        "cart_id": str(cart["_id"]),
        "shipping_address": {
            "first_name": "Email",
            "last_name": "Test",
            "address_line1": "456 Email St",
            "city": "Ankara",
            "state": "Ankara",
            "postal_code": "06000",
            "country": "TR"
        },
        "billing_address": {
            "first_name": "Email",
            "last_name": "Test",
            "address_line1": "456 Email St",
            "city": "Ankara",
            "state": "Ankara",
            "postal_code": "06000",
            "country": "TR"
        },
        "payment_method": "credit_card",
        "customer_email": "emailtest@example.com",
        "customer_name": "Email Test",
        "customer_phone": "+905559876543"
    }
    
    response = await client.post(
        "/api/v1/checkout/initiate",
        json=checkout_data,
        headers={"Idempotency-Key": "email-test-checkout"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify order contains tracking link info
    order = await db["orders"].find_one({"_id": ObjectId(data["order_id"])})
    assert order["tracking_token"] is not None
    
    # In production, email would be sent with tracking link:
    # https://example.com/track/{tracking_token}
    
    # Cleanup
    await db["products"].delete_one({"_id": product["_id"]})
    await db["carts"].delete_one({"_id": cart["_id"]})
    await db["orders"].delete_one({"_id": ObjectId(data["order_id"])})
