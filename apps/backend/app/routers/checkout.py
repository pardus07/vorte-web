"""Checkout endpoints."""
from typing import Optional
from decimal import Decimal

from fastapi import APIRouter, Header, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr

from app.services.order_service import order_service
from app.services.payment_service import payment_service
from app.core.deps import optional_current_user
from app.core.exceptions import ValidationError, ConflictError, NotFoundError
from app.schemas.user import Address


router = APIRouter(prefix="/api/v1/checkout", tags=["Checkout"])


class CheckoutInitiateRequest(BaseModel):
    """Request to initiate checkout."""
    cart_id: str
    shipping_address: Address
    billing_address: Address
    payment_method: str
    customer_email: EmailStr
    customer_name: str
    customer_phone: str


class CheckoutInitiateResponse(BaseModel):
    """Response from checkout initiation."""
    order_id: str
    order_number: str
    total: float
    payment_redirect_url: Optional[str] = None
    requires_3ds: bool


class CheckoutConfirmRequest(BaseModel):
    """Request to confirm checkout."""
    order_id: str
    transaction_id: str


@router.post(
    "/initiate",
    response_model=CheckoutInitiateResponse,
    status_code=status.HTTP_200_OK,
    summary="Initiate checkout",
    description="Initiate checkout process with cart validation and stock reservation"
)
async def initiate_checkout(
    req: CheckoutInitiateRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    user=Depends(optional_current_user)
):
    """
    Initiate checkout.
    
    Steps:
    1. Validate cart
    2. Reserve stock
    3. Create order
    4. Initiate payment
    
    Requires Idempotency-Key header.
    """
    if not idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Idempotency-Key header required"
        )
    
    try:
        # Prepare customer info
        customer_info = {
            "user_id": str(user.id) if user else None,
            "email": req.customer_email,
            "first_name": req.customer_name.split()[0] if req.customer_name else "",
            "last_name": " ".join(req.customer_name.split()[1:]) if len(req.customer_name.split()) > 1 else "",
            "phone": req.customer_phone
        }
        
        # Create order from cart
        order = await order_service.create_order_from_cart(
            cart_id=req.cart_id,
            shipping_address=req.shipping_address.model_dump(),
            billing_address=req.billing_address.model_dump(),
            payment_method=req.payment_method,
            customer_info=customer_info,
            idempotency_key=idempotency_key
        )
        
        # Initiate payment
        payment_result = await payment_service.initiate_payment(
            amount=Decimal(str(order["total"])),
            currency="TRY",
            order_id=order["order_number"],
            customer_email=req.customer_email,
            customer_name=req.customer_name,
            idempotency_key=f"payment_{idempotency_key}",
            customer_phone=req.customer_phone
        )
        
        # Update order with payment info
        from app.repositories.order_repository import order_repository
        await order_repository.update_with_version(
            str(order["_id"]),
            order["version"],
            {
                "payment.transaction_id": payment_result["transaction_id"],
                "payment.status": payment_result["status"]
            }
        )
        
        return CheckoutInitiateResponse(
            order_id=str(order["_id"]),
            order_number=order["order_number"],
            total=float(order["total"]),
            payment_redirect_url=payment_result.get("redirect_url"),
            requires_3ds=payment_result.get("requires_3ds", False)
        )
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post(
    "/confirm",
    status_code=status.HTTP_200_OK,
    summary="Confirm checkout",
    description="Confirm checkout after payment authentication"
)
async def confirm_checkout(
    req: CheckoutConfirmRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
):
    """
    Confirm checkout after payment.
    
    Updates order status to PAID and commits stock reservations.
    """
    if not idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Idempotency-Key header required"
        )
    
    try:
        # Confirm payment
        payment_result = await payment_service.confirm_payment(
            transaction_id=req.transaction_id,
            idempotency_key=f"confirm_{idempotency_key}"
        )
        
        if payment_result["status"] != "captured":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment not successful"
            )
        
        # Update order status to PAID
        order = await order_service.update_order_status(
            order_id=req.order_id,
            new_status="paid",
            changed_by="system",
            reason="Payment confirmed"
        )
        
        # Commit reservations
        from app.repositories.reservation_repository import reservation_repository
        reservation_ids = order.get("reservation_ids", [])
        for res_id in reservation_ids:
            await reservation_repository.commit_reservation(res_id)
        
        return {
            "order_id": str(order["_id"]),
            "order_number": order["order_number"],
            "status": order["status"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
