"""Payment endpoints."""
from typing import Optional
from decimal import Decimal

from fastapi import APIRouter, Header, HTTPException, status, Request

from app.services.payment_service import payment_service
from app.integrations.payments.base import (
    PaymentError,
    PaymentTimeoutError,
    Payment3DSFailedError
)
from app.schemas.payment import (
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentConfirmRequest,
    PaymentConfirmResponse,
    PaymentRefundRequest,
    PaymentRefundResponse
)
from app.core.exceptions import ValidationError


router = APIRouter(prefix="/api/v1/payments", tags=["Payments"])


@router.post(
    "/initiate",
    response_model=PaymentInitiateResponse,
    status_code=status.HTTP_200_OK,
    summary="Initiate payment",
    description="Initiate payment transaction with 3DS support and idempotency"
)
async def initiate_payment(
    req: PaymentInitiateRequest,
    request: Request,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
):
    """
    Initiate payment transaction.
    
    Requires Idempotency-Key header for safe retries.
    Returns transaction details and 3DS redirect URL if required.
    
    Args:
        req: Payment initiation request
        request: FastAPI request
        idempotency_key: Idempotency key header
        
    Returns:
        Payment initiation response
        
    Raises:
        428: Idempotency-Key header required
        400: Validation error
        504: Payment timeout
    """
    # Require Idempotency-Key header
    if not idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Idempotency-Key header required for payment operations"
        )
    
    # Get customer IP
    customer_ip = request.client.host if request.client else None
    
    try:
        result = await payment_service.initiate_payment(
            amount=req.amount,
            currency=req.currency,
            order_id=req.order_id,
            customer_email=req.customer_email,
            customer_name=req.customer_name,
            idempotency_key=idempotency_key,
            callback_url=req.callback_url,
            customer_phone=req.customer_phone,
            customer_ip=customer_ip
        )
        
        return PaymentInitiateResponse(**result)
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except PaymentTimeoutError as e:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail={
                "type": "https://api.vorte.com.tr/errors/PAYMENT_TIMEOUT",
                "title": "PAYMENT_TIMEOUT",
                "status": 504,
                "detail": e.message,
                "traceId": getattr(request.state, "trace_id", None)
            }
        )
    except PaymentError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "type": f"https://api.vorte.com.tr/errors/{e.code}",
                "title": e.code,
                "status": 400,
                "detail": e.message,
                "traceId": getattr(request.state, "trace_id", None)
            }
        )



@router.post(
    "/confirm",
    response_model=PaymentConfirmResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm payment",
    description="Confirm payment after 3DS authentication"
)
async def confirm_payment(
    req: PaymentConfirmRequest,
    request: Request,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
):
    """
    Confirm payment after 3DS authentication.
    
    Requires Idempotency-Key header for safe retries.
    
    Args:
        req: Payment confirmation request
        request: FastAPI request
        idempotency_key: Idempotency key header
        
    Returns:
        Payment confirmation response
        
    Raises:
        428: Idempotency-Key header required
        400: Payment error
        504: Payment timeout
    """
    # Require Idempotency-Key header
    if not idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Idempotency-Key header required for payment operations"
        )
    
    try:
        result = await payment_service.confirm_payment(
            transaction_id=req.transaction_id,
            idempotency_key=idempotency_key
        )
        
        return PaymentConfirmResponse(**result)
        
    except Payment3DSFailedError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "type": "https://api.vorte.com.tr/errors/PAYMENT_3DS_FAILED",
                "title": "PAYMENT_3DS_FAILED",
                "status": 400,
                "detail": e.message,
                "traceId": getattr(request.state, "trace_id", None)
            }
        )
    except PaymentTimeoutError as e:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail={
                "type": "https://api.vorte.com.tr/errors/PAYMENT_TIMEOUT",
                "title": "PAYMENT_TIMEOUT",
                "status": 504,
                "detail": e.message,
                "traceId": getattr(request.state, "trace_id", None)
            }
        )
    except PaymentError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "type": f"https://api.vorte.com.tr/errors/{e.code}",
                "title": e.code,
                "status": 400,
                "detail": e.message,
                "traceId": getattr(request.state, "trace_id", None)
            }
        )


@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
    summary="Payment webhook",
    description="Receive payment status updates from provider"
)
async def payment_webhook(
    payload: dict,
    request: Request,
    signature: Optional[str] = Header(None, alias="X-Payment-Signature")
):
    """
    Handle payment webhook from provider.
    
    Verifies webhook signature and processes payment status update.
    
    Args:
        payload: Webhook payload
        request: FastAPI request
        signature: Webhook signature header
        
    Returns:
        Success response
        
    Raises:
        401: Invalid signature
    """
    # Verify webhook signature
    try:
        is_valid = await payment_service.provider.verify_webhook(
            payload=payload,
            signature=signature or ""
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature"
            )
        
        # Process webhook
        # TODO: Update order status based on payment status
        transaction_id = payload.get("transaction_id")
        payment_status = payload.get("status")
        
        # Log webhook
        import logging
        logger = logging.getLogger(__name__)
        logger.info(
            f"Payment webhook received: transaction={transaction_id}, "
            f"status={payment_status}"
        )
        
        return {"status": "received"}
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Webhook processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )


@router.get(
    "/status/{transaction_id}",
    summary="Get payment status",
    description="Get current status of a payment transaction"
)
async def get_payment_status(
    transaction_id: str,
    request: Request
):
    """
    Get payment transaction status.
    
    Args:
        transaction_id: Transaction identifier
        request: FastAPI request
        
    Returns:
        Transaction status
        
    Raises:
        404: Transaction not found
    """
    try:
        result = await payment_service.get_transaction_status(transaction_id)
        return result
        
    except PaymentError as e:
        if e.code == "TRANSACTION_NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
