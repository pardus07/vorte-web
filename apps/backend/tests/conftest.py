"""Pytest configuration and shared fixtures for profile management tests."""
import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from typing import AsyncGenerator

from app.services.db import get_db
from app.core.security import create_access_token


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def test_user() -> AsyncGenerator[dict, None]:
    """
    Create a test user in the database.
    
    Yields:
        User document with _id
        
    Cleanup:
        Removes user after test completes
    """
    db = get_db()
    
    user_doc = {
        "email": "test@example.com",
        "password_hash": "$argon2id$v=19$m=65536,t=2,p=2$somehash",
        "first_name": "Test",
        "last_name": "User",
        "phone": "+905551234567",
        "role": "customer",
        "email_verified": True,
        "phone_verified": False,
        "addresses": [],
        "version": 1,
        "created_at": datetime.now(timezone.utc),
        "last_login_at": None
    }
    
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    
    yield user_doc
    
    # Cleanup
    await db.users.delete_one({"_id": result.inserted_id})


@pytest.fixture
def auth_token(test_user: dict) -> str:
    """
    Generate JWT access token for test user.
    
    Args:
        test_user: Test user fixture
        
    Returns:
        JWT access token string
    """
    token_data = {
        "sub": str(test_user["_id"]),
        "email": test_user["email"],
        "role": test_user.get("role", "customer")
    }
    
    return create_access_token(
        data=token_data,
        expires_delta=timedelta(minutes=30)
    )


@pytest.fixture
def auth_headers(auth_token: str) -> dict:
    """
    Create authorization headers with Bearer token.
    
    Args:
        auth_token: JWT token fixture
        
    Returns:
        Dictionary with Authorization header
    """
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
async def client() -> AsyncGenerator:
    """
    Create async HTTP client for testing.
    
    Yields:
        AsyncClient instance
    """
    from httpx import AsyncClient
    from app.main import app
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def clean_redis():
    """
    Clean Redis test database before and after tests.
    
    Yields:
        None
        
    Cleanup:
        Flushes Redis test database
    """
    from app.services.redis_service import redis_service
    
    client = await redis_service.get_client()
    
    # Clean before test
    await client.flushdb()
    
    yield
    
    # Clean after test
    await client.flushdb()


@pytest.fixture
async def test_user_with_avatar(test_user: dict) -> AsyncGenerator[dict, None]:
    """
    Create a test user with avatar URL.
    
    Yields:
        User document with avatar_url
        
    Cleanup:
        Removes user after test completes
    """
    db = get_db()
    
    # Update user with avatar
    await db.users.update_one(
        {"_id": test_user["_id"]},
        {
            "$set": {
                "avatar_url": "http://localhost:9000/avatars/users/123/avatar.jpg",
                "avatar_object_key": "users/123/avatar.jpg"
            }
        }
    )
    
    # Fetch updated user
    updated_user = await db.users.find_one({"_id": test_user["_id"]})
    
    yield updated_user
    
    # Cleanup handled by test_user fixture


@pytest.fixture
async def test_user_deleted(test_user: dict) -> AsyncGenerator[dict, None]:
    """
    Create a test user marked for deletion.
    
    Yields:
        User document with deleted_at set
        
    Cleanup:
        Removes user after test completes
    """
    db = get_db()
    
    now = datetime.now(timezone.utc)
    
    # Mark user as deleted
    await db.users.update_one(
        {"_id": test_user["_id"]},
        {
            "$set": {
                "deleted_at": now,
                "erasure_requested": True,
                "erasure_job_id": "test-job-123",
                "erasure_retention_until": now + timedelta(days=30)
            }
        }
    )
    
    # Fetch updated user
    updated_user = await db.users.find_one({"_id": test_user["_id"]})
    
    yield updated_user
    
    # Cleanup handled by test_user fixture


@pytest.fixture
def mock_minio_client():
    """
    Mock MinIO client for unit tests.
    
    Returns:
        Mock MinIO client with common methods
    """
    from unittest.mock import MagicMock, AsyncMock
    
    mock_client = MagicMock()
    mock_client.presigned_put_object = MagicMock(return_value="http://minio/presigned-url")
    mock_client.stat_object = MagicMock()
    mock_client.remove_object = MagicMock()
    
    return mock_client


@pytest.fixture
def mock_redis_client():
    """
    Mock Redis client for unit tests.
    
    Returns:
        Mock Redis client with common methods
    """
    from unittest.mock import AsyncMock
    
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=None)
    mock_client.set = AsyncMock(return_value=True)
    mock_client.delete = AsyncMock(return_value=1)
    mock_client.incr = AsyncMock(return_value=1)
    mock_client.expire = AsyncMock(return_value=True)
    
    return mock_client


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "integration: mark test as integration test (requires infrastructure)"
    )
    config.addinivalue_line(
        "markers", "unit: mark test as unit test (isolated with mocks)"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "e2e: mark test as end-to-end test"
    )
    config.addinivalue_line(
        "markers", "notification: mark test as notification system test"
    )
