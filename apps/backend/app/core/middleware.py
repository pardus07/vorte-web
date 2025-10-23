"""Custom middleware for logging, tracing, and request handling."""
import time
import uuid
import json
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import settings


class TraceIDMiddleware(BaseHTTPMiddleware):
    """Middleware to generate and propagate trace IDs for distributed tracing."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate or extract trace ID
        trace_id = request.headers.get("X-Trace-ID") or str(uuid.uuid4())
        request.state.trace_id = trace_id
        
        # Call next middleware/endpoint
        response = await call_next(request)
        
        # Add trace ID to response headers
        response.headers["X-Trace-ID"] = trace_id
        
        return response


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for structured logging of all requests."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Get trace ID from request state
        trace_id = getattr(request.state, "trace_id", "unknown")
        
        # Call next middleware/endpoint
        response = await call_next(request)
        
        # Calculate duration
        duration_ms = int((time.time() - start_time) * 1000)
        
        # Structured log entry
        log_entry = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "level": "INFO" if response.status_code < 400 else "ERROR",
            "traceId": trace_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
            "client_ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", "unknown")
        }
        
        # Mask PII in logs (if path contains sensitive data)
        if any(sensitive in request.url.path for sensitive in ["/auth/", "/users/"]):
            log_entry["path"] = self._mask_sensitive_path(request.url.path)
        
        # Print structured log (in production, send to log aggregator)
        print(json.dumps(log_entry))
        
        return response
    
    @staticmethod
    def _mask_sensitive_path(path: str) -> str:
        """Mask sensitive information in URL paths."""
        # Simple masking - in production, use more sophisticated approach
        parts = path.split("/")
        masked_parts = []
        for part in parts:
            if "@" in part or len(part) > 20:  # Likely email or token
                masked_parts.append("***")
            else:
                masked_parts.append(part)
        return "/".join(masked_parts)
