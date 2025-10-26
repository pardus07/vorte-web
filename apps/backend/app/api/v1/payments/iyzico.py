from __future__ import annotations

from typing import Any, Dict, Optional, Literal
from fastapi import APIRouter, Depends, Header, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, PositiveInt

from app.services.payment_orchestrator import PaymentOrchestrator

router = APIRouter(prefix="/api/v1/payments/iyzico", tags=["payments/iyzico"])


# --- RFC 9457 Problem Details helper ---
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
    Ref: https://datatracker.ietf.org/doc/html/rfc9457
    """
    content = {"type": type_, "title": title, "status": status, "detail": detail}
    if instance:
        content["instance"] = instance
    if trace_id:
        content["traceId"] = trace_id
    return JSONResponse(status_code=status, content=content, media_type="application/problem+json")


# DI: Get orchestrator from app state
def get_orchestrator(request: Request) -> PaymentOrchestrator:
    """Dependency injection for PaymentOrchestrator"""
    return request.app.state.payment_orchestrator


class Initialize3DSBody(BaseModel):
    """Request body for 3DS initialization"""

    orderId: str = Field(..., min_length=1, description="Order ID from orders collection")
    amountMinor: PositiveInt = Field(..., description="Amount in minor units (e.g., 1234 for 12.34 TRY)")
    currency: Literal["TRY", "USD", "EUR"] = Field(default="TRY", description="Currency code")
    # iyzico Init 3DS payload (buyer, basket, card, callbackUrl, etc.)
    # Passed directly to adapter
    iyzPayload: Dict[str, Any] = Field(..., description="iyzico 3DS initialize request payload")


@router.post("/initialize", summary="Initialize 3DS payment with iyzico")
async def initialize_3ds(
    body: Initialize3DSBody,
    request: Request,
    response: Response,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
    orchestrator: PaymentOrchestrator = Depends(get_orchestrator),
):
    """
    Initialize 3DS payment flow with iyzico.
    
    **Idempotency-Key header is required** (RFC 6585 Section 3).
    
    Returns:
        - 200: Payment initialized, returns threeDSHtmlContent (Base64) for frontend rendering
        - 428: Idempotency-Key header missing
        - 422: Validation error
        - 500: Internal server error
    
    The threeDSHtmlContent field is Base64-encoded HTML that must be decoded
    and rendered in an iframe or redirect for 3DS authentication.
    
    Ref: https://docs.iyzico.com/
    """
    # Idempotency-Key required (RFC 6585 428 + RFC 9457 problem+json)
    if not idempotency_key:
        return problem(
            status=428,
            title="Precondition Required",
            detail="This endpoint requires an Idempotency-Key header.",
            type_="https://datatracker.ietf.org/doc/html/rfc6585#section-3",
            instance=str(request.url),
        )

    try:
        # Orchestrator handles full flow: INITIATED→PENDING_3DS, idempotency, event log
        result = await orchestrator.start_3ds_initialize(
            idempotency_key=idempotency_key,
            order_id=body.orderId,
            amount_minor=body.amountMinor,
            currency=body.currency,
            iyz_payload=body.iyzPayload,
        )

        # Full response is cached; FE decodes threeDSHtmlContent (Base64) and renders
        response.headers["Cache-Control"] = "no-store"
        return result

    except ValueError as e:
        # Idempotency key reused with different params
        return problem(
            status=422,
            title="Unprocessable Entity",
            detail=str(e),
            instance=str(request.url),
        )
    except Exception as e:
        # Log error and return 500
        return problem(
            status=500,
            title="Internal Server Error",
            detail="An unexpected error occurred while processing payment.",
            instance=str(request.url),
        )
