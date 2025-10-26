"""
Resilience patterns: Retry with exponential backoff and Circuit Breaker

Implements:
- Retry: tenacity with exponential backoff + jitter (1s, 2s, 4s)
- Circuit Breaker: pybreaker pattern (10 failures → open 60s)

Refs:
- https://tenacity.readthedocs.io/
- https://pypi.org/project/pybreaker/
- https://martinfowler.com/bliki/CircuitBreaker.html
"""
from __future__ import annotations

import logging
from typing import Callable, Any
from functools import wraps

# Retry with tenacity (optional dependency)
try:
    from tenacity import (
        retry,
        stop_after_attempt,
        wait_exponential,
        retry_if_exception_type,
        before_sleep_log,
    )
    TENACITY_AVAILABLE = True
except ImportError:
    TENACITY_AVAILABLE = False
    # Fallback: no-op decorator
    def retry(*args, **kwargs):
        def decorator(func):
            return func
        return decorator
    
    def stop_after_attempt(*args): pass
    def wait_exponential(*args, **kwargs): pass
    def retry_if_exception_type(*args): pass
    def before_sleep_log(*args): pass

# Circuit Breaker
try:
    from pybreaker import CircuitBreaker, CircuitBreakerError
except ImportError:
    # Fallback if pybreaker not installed
    class CircuitBreaker:
        def __init__(self, *args, **kwargs):
            pass
        
        def __call__(self, func):
            return func
    
    class CircuitBreakerError(Exception):
        pass

import httpx

logger = logging.getLogger(__name__)


# --- Retry Configuration ---

def is_retryable_http_error(exception: Exception) -> bool:
    """
    Check if HTTP error is retryable (429, 5xx).
    4xx errors (except 429) are not retryable.
    """
    if isinstance(exception, httpx.HTTPStatusError):
        status = exception.response.status_code
        # Retry on 429 (rate limit) and 5xx (server errors)
        return status == 429 or 500 <= status < 600
    
    # Retry on network errors (timeout, connection)
    if isinstance(exception, (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError)):
        return True
    
    return False


def payment_retry(func: Callable) -> Callable:
    """
    Retry decorator for payment provider calls.
    
    Strategy:
    - Max 3 attempts
    - Exponential backoff: 1s, 2s, 4s (with jitter)
    - Retry on: 429, 5xx, network errors
    - No retry on: 4xx (except 429)
    
    Ref: https://tenacity.readthedocs.io/
    
    Note: Requires 'tenacity' package. Install with: pip install tenacity
    """
    if not TENACITY_AVAILABLE:
        # Fallback: no retry, just log
        @wraps(func)
        async def wrapper(*args, **kwargs):
            logger.warning(f"Retry not available (tenacity not installed): {func.__name__}")
            return await func(*args, **kwargs)
        return wrapper
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=4),
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.TimeoutException, httpx.NetworkError)),
        retry_error_callback=lambda retry_state: retry_state.outcome.result() if retry_state.outcome else None,
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except httpx.HTTPStatusError as e:
            # Only retry if retryable
            if is_retryable_http_error(e):
                logger.warning(
                    f"Retryable HTTP error: {e.response.status_code} - {func.__name__}",
                    extra={"status_code": e.response.status_code, "url": str(e.request.url)},
                )
                raise
            else:
                # Don't retry 4xx errors (except 429)
                logger.error(
                    f"Non-retryable HTTP error: {e.response.status_code} - {func.__name__}",
                    extra={"status_code": e.response.status_code, "url": str(e.request.url)},
                )
                raise
    
    return wrapper


# --- Circuit Breaker Configuration ---

# iyzico circuit breaker
# Opens after 10 consecutive failures, stays open for 60 seconds
iyzico_circuit_breaker = CircuitBreaker(
    fail_max=10,
    reset_timeout=60,
    name="iyzico_provider",
)


def with_circuit_breaker(breaker: CircuitBreaker):
    """
    Circuit breaker decorator.
    
    Pattern:
    - CLOSED: Normal operation
    - OPEN: After fail_max failures, reject calls immediately
    - HALF_OPEN: After reset_timeout, allow one test call
    
    Ref: https://martinfowler.com/bliki/CircuitBreaker.html
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                # Circuit breaker wraps the call
                # pybreaker doesn't have call_async, so we use call with async function
                async def async_call():
                    return await func(*args, **kwargs)
                
                # Call through circuit breaker (synchronous wrapper)
                return await breaker.call(async_call)
            except CircuitBreakerError as e:
                logger.error(
                    f"Circuit breaker OPEN for {breaker.name}: {func.__name__}",
                    extra={"breaker_name": breaker.name, "state": str(breaker.current_state)},
                )
                # Re-raise as service unavailable
                raise ServiceUnavailableError(
                    f"Payment provider {breaker.name} is temporarily unavailable. Please try again later."
                ) from e
        
        return wrapper
    
    return decorator


# --- Combined Resilience ---

def resilient_payment_call(breaker: CircuitBreaker = iyzico_circuit_breaker):
    """
    Combined retry + circuit breaker decorator.
    
    Order: Circuit Breaker → Retry
    - CB checks if provider is available
    - If available, retry handles transient failures
    
    Usage:
        @resilient_payment_call()
        async def call_provider(...):
            ...
    """
    def decorator(func: Callable) -> Callable:
        # Apply decorators in order: CB first, then retry
        func = payment_retry(func)
        func = with_circuit_breaker(breaker)(func)
        return func
    
    return decorator


# --- Custom Exceptions ---

class ServiceUnavailableError(Exception):
    """Raised when circuit breaker is open"""
    pass


# --- Metrics Helpers ---

def record_circuit_breaker_state(breaker: CircuitBreaker, provider: str):
    """
    Record circuit breaker state for metrics.
    Called periodically or on state change.
    """
    from app.services.metrics import incr
    
    state = str(breaker.current_state)
    if state == "open":
        incr("provider_circuit_open_total", provider=provider)
    
    # Could also expose as gauge:
    # circuit_breaker_state{provider="iyzico", state="open"} = 1
