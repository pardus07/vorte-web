"""Cart-related schemas for shopping cart management."""
from datetime import datetime
from typing import Optional, List, Literal
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict


class CartOwnerType(str, Enum):
    """Cart owner type."""
    USER = "user"
    GUEST = "guest"


class CartStatus(str, Enum):
    """Cart status."""
    ACTIVE = "active"
    CHECKED_OUT = "checked_out"
    EXPIRED = "expired"


class CartOwner(BaseModel):
    """Cart owner information."""
    type: CartOwnerType = Field(description="Owner type (user or guest)")
    id: str = Field(description="User ID or guest session ID")


class CartDiscount(BaseModel):
    """Discount applied to cart item."""
    code: str = Field(description="Discount code")
    amount: float = Field(ge=0, description="Discount amount")


class CartItem(BaseModel):
    """Cart item."""
    line_id: str = Field(description="Unique line item ID")
    product_id: str = Field(description="Product ID")
    variant_id: Optional[str] = Field(default=None, description="Product variant ID")
    qty: int = Field(gt=0, le=100, description="Quantity")
    unit_price: float = Field(ge=0, description="Unit price snapshot")
    discounts: List[CartDiscount] = Field(default_factory=list)
    subtotal: float = Field(ge=0, description="Line item subtotal")


class CartTotals(BaseModel):
    """Cart totals."""
    items: float = Field(ge=0, description="Items subtotal")
    shipping: float = Field(ge=0, description="Shipping cost")
    discount: float = Field(ge=0, description="Total discount")
    grand_total: float = Field(ge=0, description="Grand total")


class Cart(BaseModel):
    """Shopping cart."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(description="Cart ID")
    owner: CartOwner
    status: CartStatus = Field(default=CartStatus.ACTIVE)
    currency: str = Field(default="TRY", max_length=3)
    items: List[CartItem] = Field(default_factory=list)
    totals: CartTotals
    version: int = Field(ge=1, description="Version for optimistic locking")
    expires_at: Optional[datetime] = Field(default=None, description="Expiration date (guest carts only)")
    created_at: datetime
    updated_at: datetime


class AddItemRequest(BaseModel):
    """Request to add item to cart."""
    product_id: str = Field(min_length=10, description="Product ID")
    variant_id: Optional[str] = Field(default=None, description="Product variant ID")
    qty: int = Field(gt=0, le=100, description="Quantity to add")


class UpdateItemRequest(BaseModel):
    """Request to update cart item quantity."""
    qty: int = Field(gt=0, le=100, description="New quantity")


class CartResponse(BaseModel):
    """Cart response with ETag."""
    cart: Cart
    etag: str = Field(description="ETag for optimistic locking")
