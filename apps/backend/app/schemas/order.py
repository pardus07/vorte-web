"""Order-related schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict

from app.schemas.user import Address


class OrderStatus(str, Enum):
    """Order status following state machine."""
    CREATED = "created"
    PAID = "paid"
    PICKING = "picking"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"


class PaymentMethod(str, Enum):
    """Payment methods."""
    CREDIT_CARD = "credit_card"
    BANK_TRANSFER = "bank_transfer"
    CASH_ON_DELIVERY = "cash_on_delivery"
    WALLET = "wallet"


class PaymentStatus(str, Enum):
    """Payment status."""
    INITIATED = "initiated"
    REQUIRES_AUTH = "requires_auth"  # 3DS
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"


class CustomerInfo(BaseModel):
    """Denormalized customer information."""
    user_id: Optional[str] = None
    email: str
    first_name: str
    last_name: str
    phone: str


class OrderItem(BaseModel):
    """Order item."""
    product_id: str
    variant_id: str
    product_name: str
    sku: str
    attributes: dict[str, str]
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    discount: Decimal
    image_url: Optional[str] = None


class PaymentInfo(BaseModel):
    """Payment information."""
    provider: str = Field(description="Payment provider (paytr, iyzico, etc.)")
    method: PaymentMethod
    transaction_id: str
    idempotency_key: str = Field(description="Idempotency key for duplicate prevention")
    status: PaymentStatus
    amount: Decimal
    currency: str = Field(default="TRY")
    paid_at: Optional[datetime] = None


class StatusChange(BaseModel):
    """Order status change history."""
    from_status: OrderStatus
    to_status: OrderStatus
    changed_by: str = Field(description="User ID or 'system'")
    reason: Optional[str] = None
    timestamp: datetime


class OrderBase(BaseModel):
    """Base order schema."""
    shipping_address: Address
    billing_address: Address
    notes: Optional[str] = Field(default=None, max_length=500)


class OrderCreate(OrderBase):
    """Schema for creating an order (from checkout)."""
    payment_method: PaymentMethod
    idempotency_key: str = Field(description="Unique key to prevent duplicate orders")


class Order(OrderBase):
    """Order schema for responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    order_number: str = Field(description="Human-readable order number")
    customer_info: CustomerInfo
    items: list[OrderItem]
    subtotal: Decimal
    discount_total: Decimal
    shipping_cost: Decimal
    tax: Decimal
    total: Decimal
    payment: PaymentInfo
    status: OrderStatus
    status_history: list[StatusChange]
    tracking_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    version: int = Field(description="Version for optimistic locking")


class OrderListItem(BaseModel):
    """Simplified order schema for list views."""
    id: str
    order_number: str
    status: OrderStatus
    total: Decimal
    created_at: datetime
    item_count: int


class OrderStatusUpdate(BaseModel):
    """Request to update order status."""
    status: OrderStatus
    reason: Optional[str] = Field(default=None, max_length=200)


class CancelOrderRequest(BaseModel):
    """Request to cancel an order."""
    reason: str = Field(min_length=1, max_length=200)
