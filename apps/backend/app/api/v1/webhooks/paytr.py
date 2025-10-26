# apps/backend/app/api/v1/webhooks/paytr.py
"""
PayTR callback webhook endpoint.

POST /api/v1/webhooks/paytr
- Public endpoint (no auth, IP allowlist via Nginx)
- MUST return exactly "OK" (plain text) or PayTR keeps retrying
- Validates callback hash for authenticity
- Idempotent via unique index on (provider, externalEventId)

Ref: https://dev.paytr.com/callback-validation
"""
from fastapi import APIRouter, BackgroundTasks, Request, Response
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field


router = APIRouter(prefix="/api/v1/webhooks/paytr", tags=["Webhooks - PayTR"])


class PayTRCallbackPayload(BaseModel):
    """PayTR callback payload."""

    merchant_oid: str = Field(..., description="Merchant order ID (our payment DB ID)")
    status: str = Field(..., description="Payment status (success/failed)")
    total_amount: str = Field(..., description="Total amount in minor units")
    hash: str = Field(..., alias="hash", description="HMAC-SHA256 hash for validation")
    failed_reason_code: str = Field(default="", description="Failure reason code")
    failed_reason_msg: str = Field(default="", description="Failure reason message")
    test_mode: str = Field(default="0", description="Test mode (1) or production (0)")
    payment_type: str = Field(default="card", description="Payment type")
    currency: str = Field(default="TL", description="Currency code")
    payment_amount: str = Field(default="", description="Payment amount")


async def process_paytr_callback_background(orchestrator, payload: dict):
    """
    Process PayTR callback in background.
    
    This allows us to return 200 OK immediately while processing
    the callback asynchronously.
    """
    try:
        await orchestrator.handle_paytr_callback(payload)
    except Exception as e:
        # Log error but don't raise (already returned 200 to PayTR)
        import logging
        logging.error(f"PayTR callback processing failed: {e}")


@router.post(
    "",
    response_class=PlainTextResponse,
    responses={
        200: {
            "description": "Callback accepted (MUST return 'OK')",
            "content": {"text/plain": {"example": "OK"}},
        }
    },
)
async def paytr_callback_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    merchant_oid: str = "",
    status: str = "",
    total_amount: str = "",
    hash: str = "",
    failed_reason_code: str = "",
    failed_reason_msg: str = "",
    test_mode: str = "0",
    payment_type: str = "card",
    currency: str = "TL",
    payment_amount: str = "",
):
    """
    Handle PayTR callback webhook.
    
    CRITICAL: This endpoint MUST return exactly "OK" (plain text) or PayTR
    will keep the payment status as "Devam Ediyor" (In Progress) and retry
    indefinitely.
    
    Security:
    - No authentication (public endpoint)
    - IP allowlist configured in Nginx (PayTR IPs only)
    - Hash validation ensures callback is from PayTR
    
    Idempotency:
    - Duplicate callbacks are detected via unique index
    - Safe to receive same callback multiple times
    
    Flow:
    1. Receive callback from PayTR
    2. Return "OK" immediately (fast response)
    3. Process callback in background:
       - Validate hash
       - Deduplicate via event store
       - Update payment status
       - Update order status if AUTHORIZED
    
    Ref: https://dev.paytr.com/callback-validation
    """
    # Get orchestrator from app state
    orchestrator = request.app.state.payment_orchestrator

    # Build payload dict
    payload = {
        "merchant_oid": merchant_oid,
        "status": status,
        "total_amount": total_amount,
        "hash": hash,
        "failed_reason_code": failed_reason_code,
        "failed_reason_msg": failed_reason_msg,
        "test_mode": test_mode,
        "payment_type": payment_type,
        "currency": currency,
        "payment_amount": payment_amount,
    }

    # Process in background (return 200 immediately)
    background_tasks.add_task(process_paytr_callback_background, orchestrator, payload)

    # CRITICAL: Must return exactly "OK" (plain text)
    return "OK"
