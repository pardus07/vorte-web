from __future__ import annotations

from typing import Any, Dict
from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import JSONResponse

from app.services.payment_orchestrator import PaymentOrchestrator

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


def get_orchestrator(request: Request) -> PaymentOrchestrator:
    """Dependency injection for PaymentOrchestrator"""
    return request.app.state.payment_orchestrator


@router.post("/iyzico", summary="iyzico webhook (always returns 2xx)")
async def iyzico_webhook(request: Request, bg: BackgroundTasks):
    """
    Handle iyzico webhook notifications.
    
    **Always returns 2xx** to prevent provider retries.
    Processing happens in background task for fast response.
    
    Webhook deduplication is handled via unique index on (provider, externalEventId).
    
    Best practices:
    - Fast 2xx response (< 5s)
    - Idempotent processing (duplicate webhooks are safe)
    - Background processing for business logic
    
    Ref: https://hookdeck.com/webhooks/guides/webhook-retries-best-practices
    Ref: https://fastapi.tiangolo.com/tutorial/background-tasks/
    """
    payload: Dict[str, Any] = await request.json()
    orchestrator: PaymentOrchestrator = request.app.state.payment_orchestrator

    # Fast 2xx response: Schedule processing in background
    # BackgroundTasks supports async functions
    # Orchestrator handles deduplication and idempotency
    bg.add_task(orchestrator.handle_iyzico_webhook, payload)

    return JSONResponse({"ok": True}, status_code=200)
