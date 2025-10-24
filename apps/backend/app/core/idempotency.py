"""
Idempotency utilities for safe retry of operations.
Implements Stripe-style idempotency pattern with 24-hour replay window.
"""
import json
import hashlib
from typing import Optional, Any
from fastapi import Request, Response
from fastapi.responses import JSONResponse

from app.core.exceptions import PreconditionRequiredError


class IdempotencyManager:
    """
    Manages idempotency keys for safe operation retry.
    Stores request hash + response in Redis with 24-hour TTL.
    """
    
    TTL_SECONDS = 86400  # 24 hours per Stripe pattern
    KEY_PREFIX = "idempotency:"
    
    @classmethod
    async def get_cached_response(
        cls,
        idempotency_key: str,
        request_hash: str,
        redis_client
    ) -> Optional[dict]:
        """
        Get cached response for idempotency key.
        
        Args:
            idempotency_key: Client-provided idempotency key
            request_hash: Hash of request body for validation
            redis_client: Redis client instance
            
        Returns:
            Cached response dict or None if not found
        """
        redis_key = f"{cls.KEY_PREFIX}{idempotency_key}"
        cached_data = await redis_client.get(redis_key)
        
        if not cached_data:
            return None
        
        try:
            cached = json.loads(cached_data)
            
            # Verify request hash matches (prevent key reuse for different requests)
            if cached.get("request_hash") != request_hash:
                # Same key, different request - this is an error
                return None
            
            return cached
        except (json.JSONDecodeError, KeyError):
            return None
    
    @classmethod
    async def cache_response(
        cls,
        idempotency_key: str,
        request_hash: str,
        status_code: int,
        response_body: Any,
        redis_client,
        headers: Optional[dict] = None
    ) -> None:
        """
        Cache response for idempotency key.
        
        Args:
            idempotency_key: Client-provided idempotency key
            request_hash: Hash of request body
            status_code: HTTP status code
            response_body: Response body (JSON-serializable)
            redis_client: Redis client instance
            headers: Optional response headers to cache
        """
        redis_key = f"{cls.KEY_PREFIX}{idempotency_key}"
        
        cached_data = {
            "request_hash": request_hash,
            "status_code": status_code,
            "response_body": response_body,
            "headers": headers or {}
        }
        
        await redis_client.setex(
            redis_key,
            cls.TTL_SECONDS,
            json.dumps(cached_data)
        )
    
    @staticmethod
    def compute_request_hash(request_body: dict) -> str:
        """
        Compute hash of request body for validation.
        
        Args:
            request_body: Request body dict
            
        Returns:
            SHA-256 hash of request body
        """
        # Sort keys for consistent hashing
        body_str = json.dumps(request_body, sort_keys=True)
        return hashlib.sha256(body_str.encode()).hexdigest()
    
    @staticmethod
    def extract_idempotency_key(request: Request) -> Optional[str]:
        """
        Extract Idempotency-Key from request headers.
        
        Args:
            request: FastAPI request object
            
        Returns:
            Idempotency key or None if not present
        """
        return request.headers.get("Idempotency-Key")
    
    @staticmethod
    def require_idempotency_key(request: Request) -> str:
        """
        Require Idempotency-Key header for unsafe operations.
        
        Args:
            request: FastAPI request object
            
        Returns:
            Idempotency key
            
        Raises:
            PreconditionRequiredError: If header is missing (HTTP 428)
        """
        key = IdempotencyManager.extract_idempotency_key(request)
        if not key:
            raise PreconditionRequiredError("Idempotency-Key")
        return key


async def handle_idempotent_request(
    request: Request,
    request_body: dict,
    handler_func: callable,
    redis_client
) -> Response:
    """
    Handle idempotent request with caching.
    
    Args:
        request: FastAPI request object
        request_body: Request body dict
        handler_func: Async function to execute if not cached
        redis_client: Redis client instance
        
    Returns:
        Response (cached or fresh)
    """
    idempotency_key = IdempotencyManager.extract_idempotency_key(request)
    
    if not idempotency_key:
        # No idempotency key - execute normally
        return await handler_func()
    
    # Compute request hash
    request_hash = IdempotencyManager.compute_request_hash(request_body)
    
    # Check cache
    cached = await IdempotencyManager.get_cached_response(
        idempotency_key,
        request_hash,
        redis_client
    )
    
    if cached:
        # Return cached response
        return JSONResponse(
            status_code=cached["status_code"],
            content=cached["response_body"],
            headers=cached.get("headers", {})
        )
    
    # Execute handler
    response = await handler_func()
    
    # Cache response
    if isinstance(response, JSONResponse):
        await IdempotencyManager.cache_response(
            idempotency_key=idempotency_key,
            request_hash=request_hash,
            status_code=response.status_code,
            response_body=response.body.decode() if isinstance(response.body, bytes) else response.body,
            redis_client=redis_client,
            headers=dict(response.headers)
        )
    
    return response
