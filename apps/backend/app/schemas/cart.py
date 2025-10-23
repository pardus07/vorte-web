"""Cart-related schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class ProductSnapshot(BaseModel):
    """Denormalized product info for cart items."""
    product_id: str
    variant_id: str
    name: str
    sku: str
    attributes: dict[str, str]
    image_url: Optional[str] = None


class CartItemBase(BaseModel):
    """Base cart item schema."""
    product_id: str = Field(description="Product ID")
    variant_id: str = Field(description="Variant ID")
    quantity: int = Field(gt=0, le=99, description="Quantity (1-99)")


class CartItemCreate(CartItemBase):
    """Schema for adding item to cart."""
    pass


class CartItemUpdate(BaseModel):
    """Schema for updating cart item."""
    quantity: int = Field(gt=0, le=99, description="New quantity")


class CartItem(CartItemBase):
    """Cart item schema for responses."""
    model_config = ConfigDict(from_attributes=True)
    
    unit_price: Decimal = Field(description="Price at time of adding")
    subtotal: Decimal = Field(description="unit_price * quantity")
    discount: Decimal = Field(default=Decimal("0"))
    product_snapshot: ProductSnapshot


class Cart(BaseModel):
    """Cart schema for responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    user_id: Optional[str] = None
    session_id: str = Field(description="Session ID for guest carts")
    items: list[CartItem]
    subtotal: Decimal
    discount_total: Decimal
    shipping_cost: Decimal
    tax: Decimal
    total: Decimal
    applied_coupons: list[str] = Field(default_factory=list)
    expires_at: datetime
    created_at: datetime
    updated_at: datetime


class ApplyCouponRequest(BaseModel):
    """Request to apply coupon code."""
    coupon_code: str = Field(min_length=1, max_length=50)
