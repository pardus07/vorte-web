"""Product-related schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict


class ProductStatus(str, Enum):
    """Product status."""
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class VariantStatus(str, Enum):
    """Product variant status."""
    AVAILABLE = "available"
    OUT_OF_STOCK = "out_of_stock"
    DISCONTINUED = "discontinued"


class ProductImage(BaseModel):
    """Product image."""
    url: str = Field(description="Image URL")
    alt_text: str = Field(description="Alt text for accessibility")
    sort_order: int = Field(default=0, description="Display order")
    is_primary: bool = Field(default=False)


class ProductVariant(BaseModel):
    """Product variant (size, color, etc.)."""
    id: str = Field(description="Variant ID")
    sku: str = Field(description="Stock keeping unit")
    attributes: dict[str, str] = Field(description="Variant attributes (e.g., {size: M, color: Red})")
    price_adjustment: Decimal = Field(default=Decimal("0"), description="Price offset from base price")
    stock_quantity: int = Field(ge=0, description="Available stock")
    low_stock_threshold: int = Field(default=5, ge=0)
    weight: Decimal = Field(gt=0, description="Weight in kg for shipping")
    status: VariantStatus = Field(default=VariantStatus.AVAILABLE)
    version: int = Field(default=1, description="Version for optimistic locking")


class ProductBase(BaseModel):
    """Base product schema."""
    sku: str = Field(min_length=1, max_length=50, description="Product SKU")
    name: str = Field(min_length=1, max_length=200)
    slug: str = Field(pattern=r"^[a-z0-9-]+$", description="URL-friendly slug")
    description: str = Field(min_length=1)
    category_ids: list[str] = Field(default_factory=list)
    brand: Optional[str] = Field(default=None, max_length=100)
    tags: list[str] = Field(default_factory=list)
    base_price: Decimal = Field(gt=0, description="Base price before variant adjustments")


class ProductCreate(ProductBase):
    """Schema for creating a product."""
    images: list[ProductImage] = Field(default_factory=list)
    variants: list[ProductVariant] = Field(min_length=1, description="At least one variant required")


class ProductUpdate(BaseModel):
    """Schema for updating a product."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, min_length=1)
    category_ids: Optional[list[str]] = None
    brand: Optional[str] = Field(default=None, max_length=100)
    tags: Optional[list[str]] = None
    base_price: Optional[Decimal] = Field(default=None, gt=0)
    status: Optional[ProductStatus] = None


class Product(ProductBase):
    """Product schema for responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    images: list[ProductImage]
    variants: list[ProductVariant]
    status: ProductStatus
    created_at: datetime
    updated_at: datetime
    version: int = Field(description="Version for optimistic locking")


class ProductListItem(BaseModel):
    """Simplified product schema for list views."""
    id: str
    sku: str
    name: str
    slug: str
    base_price: Decimal
    primary_image: Optional[ProductImage] = None
    status: ProductStatus
    in_stock: bool = Field(description="Whether any variant is in stock")
