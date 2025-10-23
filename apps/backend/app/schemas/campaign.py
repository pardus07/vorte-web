"""Campaign and discount-related schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict


class CampaignType(str, Enum):
    """Campaign types."""
    COUPON = "coupon"
    CART_RULE = "cart_rule"
    PRODUCT_DISCOUNT = "product_discount"


class CampaignStatus(str, Enum):
    """Campaign status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"


class RuleType(str, Enum):
    """Campaign rule types."""
    MIN_AMOUNT = "min_amount"
    PRODUCT_IN_CART = "product_in_cart"
    CATEGORY = "category"
    QUANTITY = "quantity"
    USER_ROLE = "user_role"


class ActionType(str, Enum):
    """Campaign action types."""
    PERCENTAGE_DISCOUNT = "percentage_discount"
    FIXED_DISCOUNT = "fixed_discount"
    FREE_SHIPPING = "free_shipping"
    GIFT_PRODUCT = "gift_product"
    BUY_X_GET_Y = "buy_x_get_y"


class CampaignRule(BaseModel):
    """Campaign rule definition."""
    type: RuleType
    operator: str = Field(description="Comparison operator (>=, ==, in, etc.)")
    value: Any = Field(description="Rule value (amount, product IDs, etc.)")


class CampaignAction(BaseModel):
    """Campaign action definition."""
    type: ActionType
    value: Any = Field(description="Action value (percentage, amount, product ID, etc.)")


class CampaignBase(BaseModel):
    """Base campaign schema."""
    name: str = Field(min_length=1, max_length=200)
    type: CampaignType
    rules: list[CampaignRule] = Field(min_length=1, description="At least one rule required")
    actions: list[CampaignAction] = Field(min_length=1, description="At least one action required")
    priority: int = Field(default=0, description="Higher priority campaigns apply first")
    start_date: datetime
    end_date: datetime
    usage_limit: Optional[int] = Field(default=None, ge=1, description="Maximum number of uses")


class CampaignCreate(CampaignBase):
    """Schema for creating a campaign."""
    pass


class CampaignUpdate(BaseModel):
    """Schema for updating a campaign."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    rules: Optional[list[CampaignRule]] = None
    actions: Optional[list[CampaignAction]] = None
    priority: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    usage_limit: Optional[int] = Field(default=None, ge=1)
    status: Optional[CampaignStatus] = None


class Campaign(CampaignBase):
    """Campaign schema for responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    status: CampaignStatus
    usage_count: int = Field(default=0)
    created_at: datetime
    updated_at: datetime


class CouponValidationRequest(BaseModel):
    """Request to validate a coupon code."""
    coupon_code: str = Field(min_length=1, max_length=50)
    cart_total: Decimal = Field(gt=0)


class CouponValidationResponse(BaseModel):
    """Response for coupon validation."""
    valid: bool
    discount_amount: Decimal = Field(default=Decimal("0"))
    message: Optional[str] = None
