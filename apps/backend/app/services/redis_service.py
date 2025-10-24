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
    
    # Idempotency key storage (24-hour TTL per Stripe pattern)
    
    async def store_idempotency_response(
        self,
        idempotency_key: str,
        request_hash: str,
        status_code: int,
        response_body: str,
        headers: dict = None,
        ttl: int = 86400  # 24 hours
    ) -> bool:
        """
        Store idempotent response in Redis.
        
        Args:
            idempotency_key: Client-provided idempotency key
            request_hash: Hash of request body for validation
            status_code: HTTP status code
            response_body: Response body (JSON string)
            headers: Optional response headers
            ttl: Time to live in seconds (default 24h)
            
        Returns:
            True if stored successfully
        """
        import json
        
        client = await self.get_client()
        key = f"idempotency:{idempotency_key}"
        
        data = {
            "request_hash": request_hash,
            "status_code": status_code,
            "response_body": response_body,
            "headers": headers or {}
        }
        
        await client.setex(key, ttl, json.dumps(data))
        return True
    
    async def get_idempotency_response(
        self,
        idempotency_key: str,
        request_hash: str
    ) -> Optional[dict]:
        """
        Get cached idempotent response from Redis.
        
        Args:
            idempotency_key: Client-provided idempotency key
            request_hash: Hash of request body for validation
            
        Returns:
            Cached response dict or None if not found/invalid
        """
        import json
        
        client = await self.get_client()
        key = f"idempotency:{idempotency_key}"
        
        cached_data = await client.get(key)
        if not cached_data:
            return None
        
        try:
            cached = json.loads(cached_data)
            
            # Verify request hash matches (prevent key reuse for different requests)
            if cached.get("request_hash") != request_hash:
                return None
            
            return cached
        except (json.JSONDecodeError, KeyError):
            return None
    
    # Generic caching methods
    
    async def set(self, key: str, value: str, ttl: Optional[int] = None) -> bool:
        """
        Set a key-value pair in Redis.
        
        Args:
            key: Redis key
            value: Value to store
            ttl: Optional time to live in seconds
            
        Returns:
            True if set successfully
        """
        client = await self.get_client()
        if ttl:
            await client.setex(key, ttl, value)
        else:
            await client.set(key, value)
        return True
    
    async def get(self, key: str) -> Optional[str]:
        """
        Get value for key from Redis.
        
        Args:
            key: Redis key
            
        Returns:
            Value or None if not found
        """
        client = await self.get_client()
        return await client.get(key)
    
    async def delete(self, key: str) -> bool:
        """
        Delete key from Redis.
        
        Args:
            key: Redis key
            
        Returns:
            True if deleted
        """
        client = await self.get_client()
        await client.delete(key)
        return True
    
    async def exists(self, key: str) -> bool:
        """
        Check if key exists in Redis.
        
        Args:
            key: Redis key
            
        Returns:
            True if key exists
        """
        client = await self.get_client()
        return await client.exists(key) > 0
    
    async def increment(self, key: str, amount: int = 1) -> int:
        """
        Increment counter in Redis.
        
        Args:
            key: Redis key
            amount: Amount to increment by
            
        Returns:
            New value after increment
        """
        client = await self.get_client()
        return await client.incrby(key, amount)
    
    async def expire(self, key: str, ttl: int) -> bool:
        """
        Set TTL on existing key.
        
        Args:
            key: Redis key
            ttl: Time to live in seconds
            
        Returns:
            True if TTL set successfully
        """
        client = await self.get_client()
        return await client.expire(key, ttl)


# Singleton instance
redis_service = RedisService()
