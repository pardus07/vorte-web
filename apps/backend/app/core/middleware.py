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
        
        # Log 409 Conflict and 428 Precondition Required with context
        if response.status_code in (409, 428):
            log_entry["level"] = "WARN"
            log_entry["context"] = {
                "if_match": request.headers.get("If-Match"),
                "idempotency_key": request.headers.get("Idempotency-Key"),
                "endpoint": request.url.path
            }
            
            # Track metrics for 409/428
            from app.core.metrics import vorte_http_409_total, vorte_http_428_total
            if response.status_code == 409:
                vorte_http_409_total.labels(
                    endpoint=request.url.path,
                    reason="version_mismatch"
                ).inc()
            elif response.status_code == 428:
                missing_header = "if_match" if not request.headers.get("If-Match") else "idempotency_key"
                vorte_http_428_total.labels(
                    endpoint=request.url.path,
                    missing_header=missing_header
                ).inc()
        
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


class ETagMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle ETag generation and validation for conditional requests.
    Implements RFC 9110 HTTP Conditional Requests.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Add ETag to response if resource has version field
        if hasattr(request.state, "resource_version") and response.status_code == 200:
            etag = self.generate_etag(request.state.resource_version)
            response.headers["ETag"] = etag
        
        return response
    
    @staticmethod
    def generate_etag(version: int) -> str:
        """
        Generate strong ETag from version field.
        Format: "v{version}" (strong ETag, no W/ prefix)
        """
        return f'"v{version}"'
    
    @staticmethod
    def parse_etag(etag: str) -> int:
        """Parse version number from ETag."""
        # Remove quotes and 'v' prefix
        return int(etag.strip('"').lstrip('v'))


class IfMatchMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate If-Match header for write operations.
    Returns 428 if missing, 409 if mismatch.
    Implements RFC 9110 HTTP Conditional Requests.
    """
    
    # Methods that require If-Match header
    CONDITIONAL_METHODS = {"PATCH", "DELETE", "PUT"}
    
    # Paths that are exempt from If-Match requirement
    EXEMPT_PATHS = [
        "/api/auth/",
        "/api/health",
        "/metrics",
        "/api/docs",
        "/api/redoc",
        "/api/openapi.json"
    ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check if this request requires If-Match
        if self._requires_if_match(request):
            if_match = request.headers.get("If-Match")
            
            if not if_match:
                # Return 428 Precondition Required
                from app.core.exceptions import PreconditionRequiredError
                raise PreconditionRequiredError("If-Match")
            
            # Store If-Match value in request state for endpoint validation
            request.state.if_match = if_match
        
        response = await call_next(request)
        return response
    
    def _requires_if_match(self, request: Request) -> bool:
        """Check if request requires If-Match header."""
        # Only for conditional methods
        if request.method not in self.CONDITIONAL_METHODS:
            return False
        
        # Check if path is exempt
        path = request.url.path
        for exempt_path in self.EXEMPT_PATHS:
            if path.startswith(exempt_path):
                return False
        
        # POST requests with Idempotency-Key don't need If-Match
        if request.method == "POST" and request.headers.get("Idempotency-Key"):
            return False
        
        return True
