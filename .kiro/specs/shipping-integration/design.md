# Shipping Integration - Design Document

## Overview

This document describes the design for integrating Turkish shipping providers (Yurtiçi Kargo, Aras Kargo, MNG Kargo) into the e-commerce platform.

## Architecture

### High-Level Architecture

```
┌─────────────┐
│   Admin     │
│   Panel     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│      Shipping Service                    │
│  ┌────────────────────────────────────┐ │
│  │  ShippingOrchestrator              │ │
│  │  - create_shipment()               │ │
│  │  - query_tracking()                │ │
│  │  - process_webhook()               │ │
│  └────────────────────────────────────┘ │
│           │                              │
│           ▼                              │
│  ┌────────────────────────────────────┐ │
│  │  Provider Adapters                 │ │
│  │  - YurticiAdapter                  │ │
│  │  - ArasAdapter                     │ │
│  │  - MNGAdapter                      │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
       │                    ▲
       │                    │
       ▼                    │
┌─────────────┐      ┌─────────────┐
│  Provider   │      │  Provider   │
│  APIs       │      │  Webhooks   │
└─────────────┘      └─────────────┘
```

## Components and Interfaces

### 1. ShippingProviderAdapter (Interface)

```python
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime

class ShippingProviderAdapter(ABC):
    """Base interface for shipping provider adapters."""
    
    @abstractmethod
    async def create_shipment(
        self,
        order_id: str,
        recipient: Dict[str, Any],
        package: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Create shipment with provider.
        
        Args:
            order_id: Internal order ID
            recipient: Recipient details (name, phone, address, city, district, postal_code)
            package: Package details (weight, dimensions, declared_value)
        
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
    ) -> Dict[str, Any]:
        """
        Query tracking information from provider.
        
        Args:
            tracking_number: Tracking number
        
        Returns:
            {
                "tracking_number": str,
                "status": str,
                "current_location": str,
                "estimated_delivery": datetime,
                "history": List[Dict],
            }
        
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
                "status": str,  # Standard status
                "timestamp": datetime,
                "location": Optional[str],
                "delivered_to": Optional[str],
            }
        """
        pass
```

### 2. YurticiAdapter

```python
class YurticiAdapter(ShippingProviderAdapter):
    """Yurtiçi Kargo adapter."""
    
    def __init__(
        self,
        api_key: str,
        api_secret: str,
        base_url: str,
        timeout: int = 30,
    ):
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = base_url
        self.timeout = timeout
        self.http_client = httpx.AsyncClient(timeout=timeout)
    
    async def create_shipment(self, order_id, recipient, package):
        # Build Yurtiçi API request
        request_data = {
            "apiKey": self.api_key,
            "orderId": order_id,
            "receiverName": recipient["name"],
            "receiverPhone": recipient["phone"],
            "receiverAddress": recipient["address"],
            "receiverCity": recipient["city"],
            "receiverDistrict": recipient["district"],
            "receiverPostalCode": recipient["postal_code"],
            "packageWeight": package["weight"],
            "packageDimensions": package["dimensions"],
            "declaredValue": package["declared_value"],
        }
        
        # Call Yurtiçi API
        response = await self.http_client.post(
            f"{self.base_url}/shipment/create",
            json=request_data,
        )
        
        if response.status_code != 200:
            raise ShippingAPIError(f"Yurtiçi API error: {response.text}")
        
        data = response.json()
        
        return {
            "tracking_number": data["trackingNumber"],
            "provider": "yurtici",
            "status": "created",
            "estimated_delivery": datetime.fromisoformat(data["estimatedDelivery"]),
        }
    
    def validate_webhook(self, payload, signature):
        # Yurtiçi uses HMAC-SHA256
        expected_signature = hmac.new(
            self.api_secret.encode(),
            json.dumps(payload, sort_keys=True).encode(),
            hashlib.sha256,
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature or "")
    
    def parse_webhook(self, payload):
        # Map Yurtiçi status to standard status
        status_map = {
            "Gönderi Oluşturuldu": "created",
            "Şubeden Alındı": "picked_up",
            "Transfer Merkezinde": "in_transit",
            "Dağıtıma Çıktı": "out_for_delivery",
            "Teslim Edildi": "delivered",
            "Teslim Edilemedi": "failed",
            "İade Edildi": "returned",
        }
        
        return {
            "tracking_number": payload["trackingNumber"],
            "status": status_map.get(payload["status"], "unknown"),
            "timestamp": datetime.fromisoformat(payload["timestamp"]),
            "location": payload.get("location"),
            "delivered_to": payload.get("deliveredTo"),
        }
```

### 3. ShippingOrchestrator

```python
class ShippingOrchestrator:
    """Orchestrates shipping operations across providers."""
    
    def __init__(
        self,
        order_repository: OrderRepository,
        notification_service: NotificationService,
        metrics: PrometheusMetrics,
        cache: RedisCache,
    ):
        self.order_repo = order_repository
        self.notification_service = notification_service
        self.metrics = metrics
        self.cache = cache
        
        # Initialize adapters
        self.adapters = {
            "yurtici": YurticiAdapter(
                api_key=os.getenv("YURTICI_API_KEY"),
                api_secret=os.getenv("YURTICI_API_SECRET"),
                base_url=os.getenv("YURTICI_BASE_URL"),
            ),
            "aras": ArasAdapter(...),
            "mng": MNGAdapter(...),
        }
    
    async def create_shipment(
        self,
        order_id: str,
        provider: str,
    ) -> Dict[str, Any]:
        """Create shipment with provider."""
        
        # Get order
        order = await self.order_repo.find_by_id(order_id)
        if not order:
            raise OrderNotFoundError(order_id)
        
        if order.status != "PAID":
            raise InvalidOrderStatusError("Order must be PAID to create shipment")
        
        # Get adapter
        adapter = self.adapters.get(provider)
        if not adapter:
            raise UnsupportedProviderError(provider)
        
        # Prepare recipient and package data
        recipient = {
            "name": order.customer.name,
            "phone": order.customer.phone,
            "address": order.shipping_address.street,
            "city": order.shipping_address.city,
            "district": order.shipping_address.district,
            "postal_code": order.shipping_address.postal_code,
        }
        
        package = {
            "weight": order.total_weight,
            "dimensions": order.package_dimensions,
            "declared_value": order.total_amount,
        }
        
        # Create shipment with retry
        try:
            result = await self._execute_with_retry(
                adapter.create_shipment,
                order_id=order_id,
                recipient=recipient,
                package=package,
            )
        except Exception as e:
            self.metrics.increment("shipping_created_total", {"provider": provider, "result": "failed"})
            raise
        
        # Update order
        await self.order_repo.update_shipping(
            order_id=order_id,
            tracking_number=result["tracking_number"],
            provider=provider,
            status="created",
            estimated_delivery=result["estimated_delivery"],
        )
        
        # Update order status
        await self.order_repo.update_status(order_id, "SHIPPED")
        
        # Send notification
        await self.notification_service.send_shipment_created(
            order_id=order_id,
            tracking_number=result["tracking_number"],
            customer_email=order.customer.email,
            customer_phone=order.customer.phone,
        )
        
        self.metrics.increment("shipping_created_total", {"provider": provider, "result": "success"})
        
        return result
    
    async def process_webhook(
        self,
        provider: str,
        payload: Dict[str, Any],
        signature: Optional[str],
    ) -> None:
        """Process webhook from provider."""
        
        # Get adapter
        adapter = self.adapters.get(provider)
        if not adapter:
            raise UnsupportedProviderError(provider)
        
        # Validate signature
        if not adapter.validate_webhook(payload, signature):
            self.metrics.increment("shipping_webhook_signature_failed_total", {"provider": provider})
            raise InvalidWebhookSignatureError()
        
        # Parse webhook
        parsed = adapter.parse_webhook(payload)
        
        # Update order
        order = await self.order_repo.find_by_tracking_number(parsed["tracking_number"])
        if not order:
            logger.warning(f"Order not found for tracking number: {parsed['tracking_number']}")
            return
        
        # Update shipping status
        await self.order_repo.update_shipping_status(
            order_id=order.id,
            status=parsed["status"],
            location=parsed.get("location"),
            timestamp=parsed["timestamp"],
        )
        
        # Update order status if delivered
        if parsed["status"] == "delivered":
            await self.order_repo.update_status(order.id, "DELIVERED")
        
        # Send notification
        await self._send_status_notification(order, parsed["status"])
        
        self.metrics.increment("shipping_webhook_received_total", {"provider": provider, "status": parsed["status"]})
    
    async def _send_status_notification(self, order, status):
        """Send customer notification based on status."""
        if status == "out_for_delivery":
            await self.notification_service.send_out_for_delivery(
                order_id=order.id,
                customer_email=order.customer.email,
                customer_phone=order.customer.phone,
            )
        elif status == "delivered":
            await self.notification_service.send_delivered(
                order_id=order.id,
                customer_email=order.customer.email,
                customer_phone=order.customer.phone,
            )
        elif status == "failed":
            await self.notification_service.send_delivery_failed(
                order_id=order.id,
                customer_email=order.customer.email,
                customer_phone=order.customer.phone,
            )
```

## Data Models

### Order Shipping Field

```python
class ShippingInfo(BaseModel):
    tracking_number: Optional[str] = None
    provider: Optional[str] = None  # yurtici, aras, mng
    status: Optional[str] = None  # created, picked_up, in_transit, out_for_delivery, delivered, failed, returned
    estimated_delivery: Optional[datetime] = None
    created_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    history: List[ShippingEvent] = []

class ShippingEvent(BaseModel):
    timestamp: datetime
    status: str
    location: Optional[str] = None
    notes: Optional[str] = None
```

## Error Handling

### Custom Exceptions

```python
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
```

### Retry Strategy

- Retry on HTTP 429, 500, 502, 503, 504
- Exponential backoff: 1s, 2s, 4s
- Max 3 retries
- Circuit breaker: open after 10 failures, keep open for 60s

## Testing Strategy

### Unit Tests

- Test each adapter's create_shipment, query_tracking, validate_webhook methods
- Test ShippingOrchestrator with mocked adapters
- Test status mapping logic
- Test webhook signature validation

### Integration Tests

- Test with provider sandbox APIs
- Test webhook processing with test payloads
- Test notification triggering
- Test error handling and retry logic

### E2E Tests

- Create shipment → receive webhook → verify order status updated
- Test all status transitions (created → delivered)
- Test delivery failure flow
- Test webhook signature validation failure

## Security Considerations

- Webhook signature verification (HMAC-SHA256)
- IP allowlisting in Nginx
- Rate limiting (100 req/min per IP)
- PII masking in logs
- Sanitize tracking numbers (alphanumeric only)

## Monitoring

### Metrics

- `shipping_created_total{provider, result}`
- `shipping_delivered_total{provider}`
- `shipping_failed_total{provider}`
- `shipping_api_latency_seconds{provider, operation}`
- `shipping_webhook_received_total{provider, status}`
- `shipping_webhook_signature_failed_total{provider}`

### Alerts

- High shipment creation failure rate (>5% for 5 min)
- No webhooks received for 30 min during business hours
- Webhook signature failures (>3 in 5 min from same IP)
- High API latency (P95 > 5s)

## Deployment

### Environment Variables

```bash
# Yurtiçi Kargo
YURTICI_API_KEY=your_api_key
YURTICI_API_SECRET=your_api_secret
YURTICI_BASE_URL=https://api.yurticikargo.com

# Aras Kargo
ARAS_API_KEY=your_api_key
ARAS_API_SECRET=your_api_secret
ARAS_BASE_URL=https://api.araskargo.com.tr

# MNG Kargo
MNG_API_KEY=your_api_key
MNG_API_SECRET=your_api_secret
MNG_BASE_URL=https://api.mngkargo.com.tr

# Test mode
SHIPPING_TEST_MODE=false
```

### Nginx Configuration

```nginx
# Webhook IP allowlist (update with current provider IPs)
location /api/v1/shipping/webhooks/ {
    # Yurtiçi IPs (check provider panel for current IPs)
    allow 185.x.x.x/24;
    
    # Aras IPs
    allow 195.x.x.x/24;
    
    # MNG IPs
    allow 212.x.x.x/24;
    
    deny all;
    
    # Rate limiting
    limit_req zone=webhook_limit burst=10 nodelay;
    
    proxy_pass http://backend;
}
```

## References

- Yurtiçi Kargo API: Contact support
- Aras Kargo API: https://api.araskargo.com.tr/docs
- MNG Kargo API: Contact support
- HMAC-SHA256: https://en.wikipedia.org/wiki/HMAC
