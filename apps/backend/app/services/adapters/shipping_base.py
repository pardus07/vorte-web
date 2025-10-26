# apps/backend/app/services/adapters/shipping_base.py
"""
Shipping Provider Adapter Base Classes

Defines the interface and base implementation for shipping provider adapters.
All shipping providers (Yurtiçi, Aras, MNG) must implement this interface.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ShippingStatus(str, Enum):
    """Standard shipping status codes."""
    
    CREATED = "created"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    FAILED = "failed"
    RETURNED = "returned"
    UNKNOWN = "unknown"


class ShippingEvent(BaseModel):
    """Shipping status event."""
    
    timestamp: datetime
    status: ShippingStatus
    location: Optional[str] = None
    notes: Optional[str] = None


class ShippingInfo(BaseModel):
    """Shipping information model."""
    
    tracking_number: str
    provider: str
    status: ShippingStatus
    estimated_delivery: Optional[datetime] = None
    current_location: Optional[str] = None
    history: list[ShippingEvent] = Field(default_factory=list)


class RecipientInfo(BaseModel):
    """Recipient information for shipment creation."""
    
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=10, max_length=20)
    address: str = Field(..., min_length=1, max_length=500)
    city: str = Field(..., min_length=1, max_length=100)
    district: str = Field(..., min_length=1, max_length=100)
    postal_code: str = Field(..., min_length=5, max_length=10)


class PackageInfo(BaseModel):
    """Package information for shipment creation."""
    
    weight: float = Field(..., gt=0, description="Weight in kg")
    dimensions: Dict[str, float] = Field(
        ...,
        description="Dimensions in cm (length, width, height)"
    )
    declared_value: float = Field(..., gt=0, description="Declared value in TRY")


class ShippingError(Exception):
    """Base shipping error."""
    pass


class ShippingAPIError(ShippingError):
    """Provider API error."""
    pass


class UnsupportedProviderError(ShippingError):
    """Unsupported provider."""
    pass


class InvalidWebhookSignatureError(ShippingError):
    """Invalid webhook signature."""
    pass


class InvalidOrderStatusError(ShippingError):
    """Order status not valid for shipping."""
    pass


class ShippingProviderAdapter(ABC):
    """
    Base interface for shipping provider adapters.
    
    All shipping providers must implement this interface to ensure
    consistent behavior across different providers.
    """
    
    def __init__(
        self,
        api_key: str,
        api_secret: str,
        base_url: str,
        timeout: int = 30,
    ):
        """
        Initialize shipping provider adapter.
        
        Args:
            api_key: Provider API key
            api_secret: Provider API secret
            base_url: Provider API base URL
            timeout: HTTP request timeout in seconds
        """
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = base_url
        self.timeout = timeout
    
    @abstractmethod
    async def create_shipment(
        self,
        order_id: str,
        recipient: RecipientInfo,
        package: PackageInfo,
    ) -> Dict[str, Any]:
        """
        Create shipment with provider.
        
        Args:
            order_id: Internal order ID
            recipient: Recipient details
            package: Package details
        
        Returns:
            {
                "tracking_number": str,
                "provider": str,
                "status": str,
                "estimated_delivery": datetime,
            }
        
        Raises:
            ShippingAPIError: If provider API fails
        """
        pass
    
    @abstractmethod
    async def query_tracking(
        self,
        tracking_number: str,
    ) -> ShippingInfo:
        """
        Query tracking information from provider.
        
        Args:
            tracking_number: Tracking number
        
        Returns:
            ShippingInfo with current status and history
        
        Raises:
            ShippingAPIError: If provider API fails
        """
        pass
    
    @abstractmethod
    def validate_webhook(
        self,
        payload: Dict[str, Any],
        signature: Optional[str],
    ) -> bool:
        """
        Validate webhook signature.
        
        Args:
            payload: Webhook payload
            signature: Signature header value
        
        Returns:
            True if signature is valid, False otherwise
        """
        pass
    
    @abstractmethod
    def parse_webhook(
        self,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Parse provider-specific webhook payload to standard format.
        
        Args:
            payload: Provider webhook payload
        
        Returns:
            {
                "tracking_number": str,
                "status": ShippingStatus,
                "timestamp": datetime,
                "location": Optional[str],
                "delivered_to": Optional[str],
            }
        """
        pass
    
    def _map_status(
        self,
        provider_status: str,
        status_map: Dict[str, ShippingStatus],
    ) -> ShippingStatus:
        """
        Map provider-specific status to standard status.
        
        Args:
            provider_status: Provider's status string
            status_map: Mapping from provider status to ShippingStatus
        
        Returns:
            Standard ShippingStatus
        """
        return status_map.get(provider_status, ShippingStatus.UNKNOWN)
