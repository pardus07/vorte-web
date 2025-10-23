"""Pytest configuration and fixtures."""
import asyncio
import pytest
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient

from app.main import app
from app.core.config import settings


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def test_db():
    """
    Create a test database and clean it up after each test.
    
    Uses a separate test database to avoid polluting production data.
    """
    # Connect to test database
    test_db_name = "vorte_test"
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[test_db_name]
    
    yield db
    
    # Cleanup: drop all collections after test
    collection_names = await db.list_collection_names()
    for collection_name in collection_names:
        await db[collection_name].drop()
    
    client.close()


@pytest.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Create an async HTTP client for testing FastAPI endpoints.
    
    Uses httpx.AsyncClient with ASGITransport for direct app testing.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(scope="function")
async def test_user_data():
    """Provide test user data."""
    return {
        "email": "test@example.com",
        "password": "TestP4ssw0rd!",
        "first_name": "Test",
        "last_name": "User",
        "phone": "+905551234567",
        "kvkk_data_processing_consent": True,
        "kvkk_marketing_consent": False
    }


@pytest.fixture(scope="function")
async def registered_user(client: AsyncClient, test_user_data: dict):
    """
    Register a test user and return user data with tokens.
    
    Useful for tests that need an authenticated user.
    """
    # Register user
    response = await client.post("/api/v1/auth/register", json=test_user_data)
    assert response.status_code == 201
    user = response.json()
    
    # Login to get tokens
    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
    )
    assert login_response.status_code == 200
    auth_result = login_response.json()
    
    return {
        "user": user,
        "tokens": auth_result["tokens"],
        "password": test_user_data["password"]
    }


@pytest.fixture(scope="function")
async def auth_headers(registered_user: dict):
    """Provide authentication headers with Bearer token."""
    return {
        "Authorization": f"Bearer {registered_user['tokens']['access_token']}"
    }
