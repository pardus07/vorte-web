"""Redis service for caching and token denylist."""
import redis.asyncio as aioredis
from typing import Optional

from app.core.config import settings


class RedisService:
    """Redis service for caching and denylist management."""
    
    def __init__(self):
        self._client: Optional[aioredis.Redis] = None
    
    async def get_client(self) -> aioredis.Redis:
        """Get or create Redis client."""
        if self._client is None:
            self._client = await aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
        return self._client
    
    async def close(self):
        """Close Redis connection."""
        if self._client:
            await self._client.close()
    
    async def add_to_denylist(self, jti: str, expires_in: int) -> bool:
        """
        Add token JTI to denylist with TTL.
        
        Args:
            jti: JWT ID
            expires_in: Seconds until token naturally expires
            
        Returns:
            True if added successfully
        """
        client = await self.get_client()
        key = f"denylist:{jti}"
        await client.setex(key, expires_in, "1")
        return True
    
    async def is_denied(self, jti: str) -> bool:
        """
        Check if token JTI is in denylist.
        
        Args:
            jti: JWT ID
            
        Returns:
            True if token is denied
        """
        client = await self.get_client()
        key = f"denylist:{jti}"
        return await client.exists(key) > 0


# Singleton instance
redis_service = RedisService()
