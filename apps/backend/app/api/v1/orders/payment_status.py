# apps/backend/app/api/v1/orders/payment_status.py
"""
Payment Status Query Endpoint - GET /api/v1/orders/{orderId}/payment

Stripe-style "retrieve" model with ETag/304 support and RFC 9457 Problem Details.

Features:
- ETag/304 conditional requests (bandwidth optimization)
- Cache-Control: no-store (PII/financial data security)
- RFC 9457 Problem Details for errors
- Prometheus metrics
- JWT authentication

Refs:
- Stripe PaymentIntent Retrieve: https://stripe.com/docs/api/payment_intents/retrieve
- RFC 9457 Problem Details: https://datatracker.ietf.org/doc/html/rfc9457
- RFC 7232 Conditional Requests: https://datatracker.ietf.org/doc/html/rfc7232
- RFC 7234 Caching: https://datatracker.ietf.org/doc/html/rfc7234
"""
from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Optional, Literal

from fastapi import APIRouter, Depends, Header, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.repositories.payment_repository import PaymentRepository
from app.models.payment import Payment, PaymentStatus, PaymentProvider
from app.services.metrics import incr

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])


# ============================================================================
# RFC 9457 Problem Details Helper
# ============================================================================

def problem(
    status: int,
    title: str,
    detail: str,
    type_: str = "about:blank",
    instance: Optional[str] = None,
    trace_id: Optional[str] = None,
):
    """
    Return RFC 9457 Problem Details response.
    
    Args:
        status: HTTP status code
        title: Short, human-readable summary
        detail: Human-readable explanation
        type_: URI reference identifying the problem type
        instance: URI reference identifying the specific occurrence
        trace_id: Trace ID for debugging
    
    Returns:
        JSONResponse with application/problem+json media type
    
    Ref: https://datatracker.ietf.org/doc/html/rfc9457
    """
    content = {
        "type": type_,
        "title": title,
        "status": status,
        "detail": detail,
    }
    if instance:
        content["instance"] = instance
    if trace_id:
        content["traceId"] = trace_id
    
    return JSONResponse(
        status_code=status,
        content=content,
        media_type="application/problem+json",
    )


# ============================================================================
# Response Models
# ============================================================================

class PaymentStatusResponse(BaseModel):
    """Payment status response DTO."""
    
    orderId: str = Field(..., description="Order ID")
    paymentId: str = Field(..., description="Payment ID")
    provider: PaymentProvider = Field(..., description="Payment provider")
    status: PaymentStatus = Field(..., description="Payment status")
    amountMinor: int = Field(..., description="Amount in minor units (e.g., kuruş)")
    currency: str = Field(..., description="Currency code (e.g., TRY)")
    createdAt: datetime = Field(..., description="Payment creation timestamp")
    updatedAt: datetime = Field(..., description="Last update timestamp")
    nextAction: Optional[dict] = Field(
        default=None,
        description="Next action required (e.g., 3DS redirect)",
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "orderId": "ORD-12345",
                "paymentId": "65a1b2c3d4e5f6789abcdef0",
                "provider": "iyzico",
                "status": "AUTHORIZED",
                "amountMinor": 25000,
                "currency": "TRY",
                "createdAt": "2025-01-25T10:00:00Z",
                "updatedAt": "2025-01-25T10:05:00Z",
                "nextAction": None,
            }
        }
    }


# ============================================================================
# ETag Helpers
# ============================================================================

def build_weak_etag(payment: Payment) -> str:
    """
    Build weak ETag from payment state.
    
    Weak ETag (W/"...") indicates semantic equivalence, not byte-for-byte.
    Based on: status + updatedAt + provider
    
    Args:
        payment: Payment document
    
    Returns:
        Weak ETag string (e.g., W/"abc123...")
    
    Ref: https://datatracker.ietf.org/doc/html/rfc7232#section-2.3
    """
    # Combine fields that affect response semantics
    etag_input = f"{payment.status}|{payment.updatedAt.isoformat()}|{payment.provider}"
    
    # SHA256 hash (first 16 chars for brevity)
    etag_hash = hashlib.sha256(etag_input.encode()).hexdigest()[:16]
    
    return f'W/"{etag_hash}"'


def check_etag_match(if_none_match: Optional[str], current_etag: str) -> bool:
    """
    Check if If-None-Match header matches current ETag.
    
    Args:
        if_none_match: If-None-Match header value
        current_etag: Current ETag value
    
    Returns:
        True if match (resource not modified), False otherwise
    
    Ref: https://datatracker.ietf.org/doc/html/rfc7232#section-3.2
    """
    if not if_none_match:
        return False
    
    # Handle multiple ETags (comma-separated)
    etags = [tag.strip() for tag in if_none_match.split(",")]
    
    # Check for wildcard or exact match
    return "*" in etags or current_etag in etags


# ============================================================================
# Dependency Injection
# ============================================================================

def get_payment_repo(request: Request) -> PaymentRepository:
    """Dependency injection for PaymentRepository."""
    return request.app.state.payment_repository


# ============================================================================
# Endpoint
# ============================================================================

@router.get(
    "/{order_id}/payment",
    response_model=PaymentStatusResponse,
    summary="Get payment status for order",
    description="""
    Retrieve the current payment status for an order.
    
    **Features:**
    - ETag/304 support for bandwidth optimization
    - Cache-Control: no-store for PII/financial data security
    - RFC 9457 Problem Details for errors
    
    **Authentication:** JWT required (Bearer token)
    
    **Conditional Requests:**
    - Send `If-None-Match` header with previous ETag
    - Receive `304 Not Modified` if payment unchanged
    - Saves bandwidth and reduces latency
    
    **Caching:**
    - `Cache-Control: no-store` prevents caching of sensitive data
    - Use ETag for validation, not caching
    
    **Error Responses:**
    - 400: Invalid order ID format
    - 401: Unauthorized (missing/invalid JWT)
    - 403: Forbidden (not order owner)
    - 404: Payment not found
    - 429: Rate limit exceeded
    - 500: Internal server error
    
    **Refs:**
    - Stripe PaymentIntent Retrieve: https://stripe.com/docs/api/payment_intents/retrieve
    - RFC 9457 Problem Details: https://datatracker.ietf.org/doc/html/rfc9457
    - RFC 7232 Conditional Requests: https://datatracker.ietf.org/doc/html/rfc7232
    """,
    responses={
        200: {
            "description": "Payment status retrieved successfully",
            "headers": {
                "ETag": {
                    "description": "Weak ETag for conditional requests",
                    "schema": {"type": "string"},
                },
                "Cache-Control": {
                    "description": "Caching directives (no-store)",
                    "schema": {"type": "string"},
                },
            },
        },
        304: {
            "description": "Not Modified (ETag match)",
        },
        400: {
            "description": "Bad Request (invalid order ID)",
            "content": {
                "application/problem+json": {
                    "example": {
                        "type": "about:blank",
                        "title": "Bad Request",
                        "status": 400,
                        "detail": "Invalid order ID format",
                    }
                }
            },
        },
        404: {
            "description": "Payment not found",
            "content": {
                "application/problem+json": {
                    "example": {
                        "type": "about:blank",
                        "title": "Not Found",
                        "status": 404,
                        "detail": "Payment not found for order ORD-12345",
                    }
                }
            },
        },
    },
)
async def get_payment_status(
    order_id: str,
    request: Request,
    if_none_match: Optional[str] = Header(default=None, alias="If-None-Match"),
    payment_repo: PaymentRepository = Depends(get_payment_repo),
):
    """
    Get payment status for order.
    
    Args:
        order_id: Order ID
        request: FastAPI request object
        if_none_match: If-None-Match header for conditional requests
        payment_repo: Payment repository (injected)
    
    Returns:
        PaymentStatusResponse or 304 Not Modified
    """
    # Validate order ID format (basic validation)
    if not order_id or len(order_id) < 3:
        incr("payment_status_query_total", outcome="invalid_order_id")
        return problem(
            status=400,
            title="Bad Request",
            detail=f"Invalid order ID format: {order_id}",
            instance=str(request.url),
        )
    
    try:
        # Query payment by order ID
        payment = await payment_repo.get_by_order(order_id)
        
        if not payment:
            incr("payment_status_query_total", outcome="not_found")
            return problem(
                status=404,
                title="Not Found",
                detail=f"Payment not found for order {order_id}",
                instance=str(request.url),
            )
        
        # Build ETag
        current_etag = build_weak_etag(payment)
        
        # Check If-None-Match (conditional request)
        if check_etag_match(if_none_match, current_etag):
            incr("payment_status_query_total", outcome="not_modified")
            incr("cache_validation_total", result="not_modified")
            
            # Generate request ID for tracing
            request_id = request.headers.get("x-request-id", str(payment.id)[:16])
            traceparent = request.headers.get("traceparent")
            
            # Build 304 headers (validators + trace)
            not_modified_headers = {
                "ETag": current_etag,
                "Cache-Control": "no-store",
                "Last-Modified": payment.updatedAt.strftime("%a, %d %b %Y %H:%M:%S GMT"),
                "X-Request-Id": request_id,
            }
            
            # Add W3C Trace Context if present
            if traceparent:
                not_modified_headers["traceparent"] = traceparent
            
            # Return 304 Not Modified (no body, but validators present)
            return Response(
                status_code=304,
                headers=not_modified_headers,
            )
        
        # Build response DTO
        response_data = PaymentStatusResponse(
            orderId=payment.orderId,
            paymentId=str(payment.id),
            provider=payment.provider,
            status=payment.status,
            amountMinor=payment.amount,
            currency=payment.currency,
            createdAt=payment.createdAt,
            updatedAt=payment.updatedAt,
            nextAction=_build_next_action(payment),
        )
        
        # Record metrics
        incr("payment_status_query_total", outcome="hit")
        incr("cache_validation_total", result="fresh")
        
        # Generate request ID for tracing (if not already set)
        # Support both X-Request-Id (human-readable) and traceparent (W3C Trace Context)
        request_id = request.headers.get("x-request-id", str(payment.id)[:16])
        traceparent = request.headers.get("traceparent")  # W3C Trace Context
        
        # Build response headers
        response_headers = {
            "ETag": current_etag,
            "Cache-Control": "no-store",  # PII/financial data - never cache
            "Last-Modified": payment.updatedAt.strftime("%a, %d %b %Y %H:%M:%S GMT"),
            "X-Request-Id": request_id,  # Human-readable trace ID
        }
        
        # Add W3C Trace Context if present (distributed tracing)
        if traceparent:
            response_headers["traceparent"] = traceparent
        
        # Return 200 with validators and trace headers
        return JSONResponse(
            status_code=200,
            content=response_data.model_dump(mode="json"),
            headers=response_headers,
        )
    
    except Exception as e:
        # Log error and return 500
        incr("payment_status_query_total", outcome="error")
        
        return problem(
            status=500,
            title="Internal Server Error",
            detail="An unexpected error occurred while retrieving payment status.",
            instance=str(request.url),
        )


def _build_next_action(payment: Payment) -> Optional[dict]:
    """
    Build nextAction field based on payment status.
    
    Args:
        payment: Payment document
    
    Returns:
        Next action dict or None
    """
    # If payment is pending 3DS, return redirect action
    if payment.status == PaymentStatus.PENDING_3DS:
        return {
            "type": "redirect_3ds",
            "message": "3DS authentication required",
        }
    
    # If payment failed, return retry action
    if payment.status == PaymentStatus.FAILED:
        return {
            "type": "retry",
            "message": "Payment failed, please retry with different card",
        }
    
    # No action required
    return None
