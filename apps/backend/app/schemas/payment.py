"""Payment-related schemas."""
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, EmailStr


class PaymentInitiateRequest(BaseModel):
    """Request to initiate payment."""
    amount: Decimal = Field(gt=0, description="Payment amount")
    currency: str = Field(min_length=3, max_length=3, description="Currency code (TRY, USD, EUR)")
    order_id: str = Field(min_length=1, description="Order identifier")
    customer_email: EmailStr = Field(description="Customer email")
    customer_name: str = Field(min_length=1, description="Customer name")
    customer_phone: Optional[str] = Field(default=None, description="Customer phone")
    callback_url: Optional[str] = Field(default=None, description="Payment callback URL")


class PaymentInitiateResponse(BaseModel):
    """Response from payment initiation."""
    transaction_id: str
    status: str
    requires_3ds: bool
    redirect_url: Optional[str] = None
    initiated_at: str


class PaymentConfirmRequest(BaseModel):
    """Request to confirm payment."""
    transaction_id: str = Field(min_length=1, description="Transaction identifier")


class PaymentConfirmResponse(BaseModel):
    """Response from payment confirmation."""
    transaction_id: str
    status: str
    amount: float
    currency: str
    confirmed_at: str


class PaymentRefundRequest(BaseModel):
    """Request to refund payment."""
    transaction_id: str = Field(min_length=1, description="Transaction identifier")
    amount: Decimal = Field(gt=0, description="Amount to refund")
    reason: str = Field(min_length=1, max_length=500, description="Refund reason")


class PaymentRefundResponse(BaseModel):
    """Response from refund."""
    refund_id: str
    transaction_id: str
    amount: float
    status: str
    refunded_at: str


class PaymentWebhookPayload(BaseModel):
    """Webhook payload from payment provider."""
    transaction_id: str
    status: str
    amount: Optional[float] = None
    currency: Optional[str] = None
