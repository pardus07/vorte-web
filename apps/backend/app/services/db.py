"""Database connection management using PyMongo Async API."""
import os
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings


# Global database client and database instances
_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


async def init_db() -> None:
    """Initialize database connection."""
    global _client, _db
    
    _client = AsyncIOMotorClient(settings.MONGO_URI)
    _db = _client.get_default_database()
    
    # Test connection
    await _client.admin.command('ping')
    print(f"✓ Connected to MongoDB: {settings.MONGO_URI}")


async def close_db() -> None:
    """Close database connection."""
    global _client
    
    if _client:
        _client.close()
        print("✓ Closed MongoDB connection")


def get_db() -> AsyncIOMotorDatabase:
    """Get database instance."""
    if _db is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return _db


async def start_transaction():
    """Start a MongoDB transaction session."""
    if _client is None:
        raise RuntimeError("Database client not initialized.")
    return await _client.start_session()
