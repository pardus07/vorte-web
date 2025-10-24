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


def get_client() -> AsyncIOMotorClient:
    """Get database client instance."""
    if _client is None:
        raise RuntimeError("Database client not initialized. Call init_db() first.")
    return _client


async def start_transaction():
    """
    Start a MongoDB transaction session.
    
    Returns:
        AsyncIOMotorClientSession for transaction management
        
    Example:
        async with await start_transaction() as session:
            async with session.start_transaction():
                # Your transactional operations here
                await collection.insert_one(doc, session=session)
    """
    if _client is None:
        raise RuntimeError("Database client not initialized.")
    return await _client.start_session()


async def execute_transaction(operations: list, session=None):
    """
    Execute multiple operations in a single transaction.
    
    Args:
        operations: List of async callables to execute
        session: Optional existing session (creates new if None)
        
    Returns:
        List of operation results
        
    Raises:
        Exception: If any operation fails (transaction rolled back)
        
    Example:
        results = await execute_transaction([
            lambda s: collection1.insert_one(doc1, session=s),
            lambda s: collection2.update_one(filter, update, session=s)
        ])
    """
    if _client is None:
        raise RuntimeError("Database client not initialized.")
    
    # Create session if not provided
    should_close_session = session is None
    if session is None:
        session = await _client.start_session()
    
    results = []
    
    try:
        async with session.start_transaction():
            for operation in operations:
                result = await operation(session)
                results.append(result)
        
        return results
    finally:
        if should_close_session:
            await session.end_session()


class TransactionContext:
    """
    Context manager for MongoDB transactions with automatic rollback.
    
    Example:
        async with TransactionContext() as session:
            await collection.insert_one(doc, session=session)
            await collection.update_one(filter, update, session=session)
            # Commits on success, rolls back on exception
    """
    
    def __init__(self):
        self.session = None
        self.transaction = None
    
    async def __aenter__(self):
        """Start session and transaction."""
        if _client is None:
            raise RuntimeError("Database client not initialized.")
        
        self.session = await _client.start_session()
        self.transaction = self.session.start_transaction()
        await self.transaction.__aenter__()
        return self.session
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Commit or rollback transaction and end session."""
        try:
            if exc_type is not None:
                # Exception occurred - rollback
                await self.transaction.__aexit__(exc_type, exc_val, exc_tb)
                return False
            else:
                # Success - commit
                await self.transaction.__aexit__(None, None, None)
                return True
        finally:
            await self.session.end_session()
