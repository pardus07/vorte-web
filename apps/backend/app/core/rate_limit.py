"""
Rate limiting utilities using Redis.
Implements sliding window rate limiting per IP address.
"""
from functools import wraps
from typing import Optional
from fastapi import Request, HTTPException, status
from app.services.redis_service import redis_service
from app.core.config import settings


class RateLimiter:
    """
    Rate limiter using Redis for distributed rate limiting.
    Implements sliding window algorithm.
    """
    
    def __init__(
        self,
        requests_per_minute: int = 60,
        key_prefix: str = "ratelimit"
    ):
        """
        Initialize rate limiter.
        
        Args:
            requests_per_minute: Maximum requests allowed per minute
            key_prefix: Redis key prefix for rate limit counters
        """
        self.requests_per_minute = requests_per_minute
        self.key_prefix = key_prefix
        self.window_seconds = 60
    
    async def is_rate_limited(self, identifier: str) -> tuple[bool, int, int]:
        """
        Check if identifier is rate limited.
        
        Args:
            identifier: Unique identifier (e.g., IP address, user ID)
            
        Returns:
            Tuple of (is_limited, current_count, limit)
        """
        key = f"{self.key_prefix}:{identifier}"
        
        # Get current count
        current = await redis_service.get(key)
        current_count = int(current) if current else 0
        
        # Check if limit exceeded
        is_limited = current_count >= self.requests_per_minute
        
        return is_limited, current_count, self.requests_per_minute
    
    async def increment(self, identifier: str) -> int:
        """
        Increment request counter for identifier.
        
        Args:
            identifier: Unique identifier
            
        Returns:
            New count after increment
        """
        key = f"{self.key_prefix}:{identifier}"
        
        # Increment counter
        new_count = await redis_service.increment(key)
        
        # Set TTL on first request
        if new_count == 1:
            await redis_service.expire(key, self.window_seconds)
        
        return new_count
    
    async def get_remaining(self, identifier: str) -> int:
        """
        Get remaining requests for identifier.
        
        Args:
            identifier: Unique identifier
            
        Returns:
            Number of remaining requests
        """
        key = f"{self.key_prefix}:{identifier}"
        current = await redis_service.get(key)
        current_count = int(current) if current else 0
        
        return max(0, self.requests_per_minute - current_count)


# Global rate limiters for different endpoints
auth_rate_limiter = RateLimiter(
    requests_per_minute=settings.RATE_LIMIT_PER_MINUTE,
    key_prefix="ratelimit:auth"
)

api_rate_limiter = RateLimiter(
    requests_per_minute=300,  # More lenient for general API
    key_prefix="ratelimit:api"
)


def get_client_ip(request: Request) -> str:
    """
    Extract client IP address from request.
    
    Handles X-Forwarded-For header for proxied requests.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Client IP address
    """
    # Check X-Forwarded-For header (for proxied requests)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take first IP in chain
        return forwarded_for.split(",")[0].strip()
    
    # Check X-Real-IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fall back to direct client IP
    return request.client.host if request.client else "unknown"


async def check_rate_limit(
    request: Request,
    limiter: RateLimiter = auth_rate_limiter
) -> None:
    """
    Check rate limit and raise exception if exceeded.
    
    Args:
        request: FastAPI request object
        limiter: RateLimiter instance to use
        
    Raises:
        HTTPException: 429 Too Many Requests if limit exceeded
    """
    if not settings.RATE_LIMIT_ENABLED:
        return
    
    client_ip = get_client_ip(request)
    
    # Check if rate limited
    is_limited, current_count, limit = await limiter.is_rate_limited(client_ip)
    
    if is_limited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "type": "https://api.vorte.com.tr/errors/RATE_LIMIT_EXCEEDED",
                "title": "RATE_LIMIT_EXCEEDED",
                "status": 429,
                "detail": f"Rate limit exceeded. Maximum {limit} requests per minute.",
                "current": current_count,
                "limit": limit,
                "retry_after": 60
            },
            headers={"Retry-After": "60"}
        )
    
    # Increment counter
    await limiter.increment(client_ip)


# Dependency for FastAPI endpoints
async def rate_limit_dependency(request: Request):
    """
    FastAPI dependency for rate limiting.
    
    Usage:
        @app.post("/api/v1/auth/login", dependencies=[Depends(rate_limit_dependency)])
    """
    await check_rate_limit(request, auth_rate_limiter)


async def api_rate_limit_dependency(request: Request):
    """
    FastAPI dependency for general API rate limiting.
    
    Usage:
        @app.get("/api/v1/products", dependencies=[Depends(api_rate_limit_dependency)])
    """
    await check_rate_limit(request, api_rate_limiter)


def rate_limit(limiter: RateLimiter = auth_rate_limiter):
    """
    Decorator for rate limiting endpoint functions.
    
    Usage:
        @rate_limit(auth_rate_limiter)
        async def login(request: Request):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            await check_rate_limit(request, limiter)
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator
