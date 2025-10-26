# apps/backend/app/api/v1/payments/paytr.py
"""
PayTR payment initialization endpoint.

POST /api/v1/payments/paytr/initialize
- Requires JWT authentication
- Requires Idempotency-Key header
- Returns form parameters for frontend POST to PayTR
"""
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

try:
    from app.core.auth import get_current_user
    from app.models.user import User
except ImportError:
    # Fallback for testing
    from typing import Optional
    from pydantic import BaseModel
    
    class User(BaseModel):
        id: str
        email: str
    
    async def get_current_user() -> User:
        return User(id="test-user", email="test@example.com")


router = APIRouter(prefix="/api/v1/payments/paytr", tags=["Payments - PayTR"])


class BasketItem(BaseModel):
    """PayTR basket item."""
    name: str = Field(..., description="Product name")
    price: str = Field(..., description="Price in minor units (kuruş)")
    quantity: int = Field(..., ge=1, description="Quantity")


class PayTRInitializeRequest(BaseModel):
    """PayTR payment initialization request."""
    orderId: str = Field(..., description="Order ID")
    amount: int = Field(..., gt=0, description="Amount in minor units (kuruş)")
    currency: str = Field(default="TL", description="Currency code")
    email: str = Field(..., description="Customer email")
    userIp: str = Field(..., description="Customer IP address")
    basket: List[BasketItem] = Field(..., description="Basket items")
    merchantOkUrl: str = Field(..., description="Success redirect URL")
    merchantFailUrl: str = Field(..., description="Failure redirect URL")
    noInstallment: int = Field(default=0, ge=0, le=1, description="Disable installments (1) or allow (0)")
    maxInstallment: int = Field(default=0, ge=0, description="Maximum installment count")
    userName: str = Field(default="", description="Customer name")
    userAddress: str = Field(default="", description="Customer address")
    userPhone: str = Field(default="", description="Customer phone")


class PayTRInitializeResponse(BaseModel):
    """PayTR payment initialization response."""
    orderId: str
    paymentDbId: str
    provider: str
    status: str
    paytr: Dict[str, Any]


@router.post("/initialize", response_model=PayTRInitializeResponse)
async def initialize_paytr_payment(
    request: Request,
    body: PayTRInitializeRequest,
    current_user: User = Depends(get_current_user),
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
):
    """
    Initialize PayTR payment flow.
    
    Returns form parameters that frontend must POST to PayTR hosted page.
    
    Idempotency:
    - Same Idempotency-Key + same params → same response (cached 24h)
    - Same Idempotency-Key + different params → 400 error
    
    Ref: https://dev.paytr.com/direct-api
    """
    # Get orchestrator from app state
    orchestrator = request.app.state.payment_orchestrator
    
    # Convert basket items to dict
    user_basket = [item.model_dump() for item in body.basket]
    
    # Initialize payment
    result = await orchestrator.start_paytr_initialize(
        idempotency_key=idempotency_key,
        order_id=body.orderId,
        amount_minor=body.amount,
        currency=body.currency,
        user_basket=user_basket,
        user_ip=body.userIp,
        email=body.email,
        merchant_ok_url=body.merchantOkUrl,
        merchant_fail_url=body.merchantFailUrl,
        no_installment=body.noInstallment,
        max_installment=body.maxInstallment,
        user_name=body.userName,
        user_address=body.userAddress,
        user_phone=body.userPhone,
    )
    
    return result
