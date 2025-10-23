"""Inventory-related schemas for stock management."""
from datetime import datetime
from typing import List, Optional
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict


class ReservationStatus(str, Enum):
    """Reservation status."""
    PENDING = "pending"
    COMMITTED = "committed"
    RELEASED = "released"


class InventoryItem(BaseModel):
    """Inventory item for a SKU."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(description="Inventory ID")
    sku: str = Field(description="Product SKU (unique)")
    on_hand: int = Field(ge=0, description="Physical stock on hand")
    reserved: int = Field(ge=0, description="Reserved stock (pending orders)")
    available: int = Field(ge=0, description="Available stock (on_hand - reserved)")
    low_stock_threshold: int = Field(ge=0, description="Low stock alert threshold")
    version: int = Field(ge=1, description="Version for optimistic locking")
    updated_at: datetime = Field(description="Last update timestamp")


class ReservationItem(BaseModel):
    """Item in a reservation."""
    sku: str = Field(description="Product SKU")
    qty: int = Field(gt=0, le=100, description="Quantity to reserve")


class Reservation(BaseModel):
    """Stock reservation."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(description="Reservation ID (UUID)")
    status: ReservationStatus = Field(description="Reservation status")
    user_id: Optional[str] = Field(default=None, description="User ID (if authenticated)")
    guest_id: Optional[str] = Field(default=None, description="Guest session ID")
    items: List[ReservationItem] = Field(description="Reserved items")
    expires_at: datetime = Field(description="Expiration timestamp")
    idempotency_key: Optional[str] = Field(default=None, description="Idempotency key")
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")


class CreateReservationRequest(BaseModel):
    """Request to create stock reservation."""
    items: List[ReservationItem] = Field(min_length=1, description="Items to reserve")


class StockAdjustmentRequest(BaseModel):
    """Request to adjust stock (admin only)."""
    sku: str = Field(description="Product SKU")
    delta: int = Field(description="Stock adjustment (positive or negative)")
    reason: str = Field(min_length=1, max_length=200, description="Adjustment reason")


class BulkStockAdjustmentRequest(BaseModel):
    """Request to adjust multiple SKUs (admin only)."""
    adjustments: List[StockAdjustmentRequest] = Field(
        min_length=1,
        description="Stock adjustments"
    )


class AvailabilityResponse(BaseModel):
    """Stock availability response."""
    sku: str = Field(description="Product SKU")
    available: int = Field(ge=0, description="Available quantity")
    low_stock: bool = Field(description="Whether stock is below threshold")


class ReservationResponse(BaseModel):
    """Reservation response."""
    reservation: Reservation
    etag: str = Field(description="ETag for optimistic locking")
