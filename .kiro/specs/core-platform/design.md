# Design Document - Core Platform

## Overview

The Core Platform design implements a layered architecture with clear separation between API, business logic, data access, and external integrations. The system uses MongoDB for primary data storage, Redis for caching and queuing, and follows domain-driven design principles with bounded contexts for Product Catalog, Cart & Checkout, Order Management, and User Management.

**Key Design Principles:**
- Interface-first for external integrations (payment, shipping, ERP)
- Event-driven for cross-context communication
- Optimistic concurrency for inventory management (ETag/If-Match per RFC 9110)
- Idempotent operations for all unsafe endpoints (Idempotency-Key, 24h window per Stripe pattern)
- Structured logging with distributed tracing
- RFC-compliant HTTP semantics (RFC 9110, RFC 9457, RFC 8288)
- Atomic operations with MongoDB transactions for multi-document consistency

## Architecture

### System Context

```
┌─────────────┐
│   Browser   │
│  (React)    │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────┐
│    Nginx    │ ← Rate limiting, SSL, static assets
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         FastAPI Backend             │
│  ┌──────────────────────────────┐   │
│  │  API Layer (Routers)         │   │
│  └────────────┬─────────────────┘   │
│               │                     │
│  ┌────────────▼─────────────────┐   │
│  │  Service Layer               │   │
│  │  (Business Logic)            │   │
│  └────────────┬─────────────────┘   │
│               │                     │
│  ┌────────────▼─────────────────┐   │
│  │  Repository Layer            │   │
│  │  (Data Access)               │   │
│  └────────────┬─────────────────┘   │
└───────────────┼─────────────────────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│   MongoDB   │   │    Redis    │
└─────────────┘   └─────────────┘

External Integrations:
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Payment   │   │   Shipping  │   │     ERP     │
│  Providers  │   │  Providers  │   │   (Dia)     │
└─────────────┘   └─────────────┘   └─────────────┘
```

### Backend Layer Structure

**apps/backend/**
```
api/
  routers/          # HTTP endpoints
    products.py
    carts.py
    checkout.py
    orders.py
    users.py
    campaigns.py
    admin/
      products.py
      orders.py
      inventory.py
service/            # Business logic
  product_service.py
  cart_service.py
  checkout_service.py
  order_service.py
  campaign_service.py
  inventory_service.py
repository/         # Data access
  product_repository.py
  cart_repository.py
  order_repository.py
  user_repository.py
  campaign_repository.py
schemas/            # Pydantic models
  product.py
  cart.py
  order.py
  payment.py
  user.py
core/               # Cross-cutting
  config.py
  security.py       # JWT, password hashing
  middleware.py     # Logging, tracing, error handling
  exceptions.py
  database.py       # MongoDB connection
  cache.py          # Redis connection
integrations/       # External adapters
  payments/
    base.py         # PaymentProvider interface
    paytr.py
    iyzico.py
    mock.py         # For testing
  shipping/
    base.py         # ShippingProvider interface
    mock.py
  erp/
    base.py         # ERPAdapter interface
    dia_erp.py
    mock.py
events/             # Domain events
  event_bus.py
  handlers/
    order_events.py
    inventory_events.py
tasks/              # Background jobs
  abandoned_cart.py
  stock_alerts.py
  email_notifications.py
```

### Frontend Module Structure

**apps/frontend/src/**
```
pages/
  HomePage.tsx
  CategoryPage.tsx
  ProductPage.tsx
  CartPage.tsx
  CheckoutPage.tsx
  OrderConfirmationPage.tsx
  AccountPage.tsx
  OrderHistoryPage.tsx
features/
  catalog/
    ProductList.tsx
    ProductCard.tsx
    ProductFilters.tsx
  product/
    ProductDetail.tsx
    VariantSelector.tsx
    AddToCartButton.tsx
  cart/
    CartSummary.tsx
    CartItem.tsx
  checkout/
    CheckoutForm.tsx
    PaymentMethodSelector.tsx
    AddressForm.tsx
  orders/
    OrderList.tsx
    OrderDetail.tsx
    OrderStatus.tsx
components/
  ui/               # shadcn/ui components
  layout/
    Header.tsx
    Footer.tsx
    Navigation.tsx
lib/
  api/
    client.ts       # Axios instance with interceptors
    products.ts
    cart.ts
    checkout.ts
    orders.ts
  hooks/
    useCart.ts
    useAuth.ts
  utils/
    format.ts
    validation.ts
```

## Domain Model

### Core Entities

#### Product Aggregate

```python
class Product:
    id: ObjectId
    sku: str                    # Unique product code
    name: str
    slug: str                   # URL-friendly name
    description: str
    category_ids: List[ObjectId]
    brand: str
    tags: List[str]
    base_price: Decimal
    images: List[ProductImage]
    variants: List[ProductVariant]
    seo: SEOMetadata
    status: ProductStatus       # DRAFT, ACTIVE, ARCHIVED
    created_at: datetime
    updated_at: datetime
    version: int                # For optimistic locking

class ProductVariant:
    id: str                     # Unique within product
    sku: str                    # Unique variant code (links to Inventory)
    attributes: Dict[str, str]  # {size: "M", color: "Red"}
    price_adjustment: Decimal   # Offset from base_price
    weight: Decimal             # For shipping calculation
    status: VariantStatus       # AVAILABLE, OUT_OF_STOCK, DISCONTINUED
    # Note: Stock is managed separately in Inventory collection

class ProductImage:
    url: str
    alt_text: str
    sort_order: int
    is_primary: bool
```

**Requirements Traceability:** Req 1 (Product Management), Req 12 (Inventory)

#### Cart Aggregate

```python
class Cart:
    id: ObjectId
    user_id: Optional[ObjectId]  # None for guest carts
    session_id: str              # For guest identification
    items: List[CartItem]
    subtotal: Decimal
    discount_total: Decimal
    shipping_cost: Decimal
    tax: Decimal
    total: Decimal
    applied_coupons: List[str]
    expires_at: datetime         # 7 days for guest, 30 days for authenticated
    created_at: datetime
    updated_at: datetime

class CartItem:
    product_id: ObjectId
    variant_id: str
    quantity: int
    unit_price: Decimal          # Price at time of adding
    subtotal: Decimal
    discount: Decimal
    reservation_id: Optional[str]  # Links to Inventory reservation
    product_snapshot: ProductSnapshot  # Denormalized for display
```

**Requirements Traceability:** Req 3 (Cart Management), Req 7 (Campaigns)

#### Order Aggregate

```python
class Order:
    id: ObjectId
    order_number: str            # Human-readable (e.g., "ORD-2024-00001")
    user_id: Optional[ObjectId]
    customer_info: CustomerInfo  # Denormalized
    items: List[OrderItem]
    subtotal: Decimal
    discount_total: Decimal
    shipping_cost: Decimal
    tax: Decimal
    total: Decimal
    payment: PaymentInfo
    shipping_address: Address
    billing_address: Address
    status: OrderStatus
    status_history: List[StatusChange]
    tracking_number: Optional[str]
    notes: str
    created_at: datetime
    updated_at: datetime
    version: int

class OrderStatus(Enum):
    CREATED = "created"
    PAID = "paid"
    PICKING = "picking"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"

class StatusChange:
    from_status: OrderStatus
    to_status: OrderStatus
    changed_by: str              # User ID or "system"
    reason: Optional[str]
    timestamp: datetime

class PaymentInfo:
    provider: str                # "paytr", "iyzico", etc.
    method: PaymentMethod        # CREDIT_CARD, BANK_TRANSFER, etc.
    transaction_id: str
    idempotency_key: str
    status: PaymentStatus
    amount: Decimal
    currency: str
    paid_at: Optional[datetime]
```

**Requirements Traceability:** Req 5 (Checkout), Req 6 (Order Management), Req 15 (Transaction Integrity)

#### Inventory Aggregate

```python
class Inventory:
    id: ObjectId
    sku: str                     # Unique, links to ProductVariant
    product_id: ObjectId
    variant_id: str
    on_hand: int                 # Physical stock
    reserved: int                # Temporarily held for orders
    available: int               # Computed: on_hand - reserved
    low_stock_threshold: int
    reservations: List[Reservation]
    version: int                 # For optimistic locking
    updated_at: datetime

class Reservation:
    id: str                      # UUID
    sku: str
    quantity: int
    order_id: Optional[ObjectId]
    cart_id: Optional[ObjectId]
    status: ReservationStatus    # PENDING, COMMITTED, RELEASED, EXPIRED
    expires_at: datetime         # TTL index for auto-cleanup
    created_at: datetime

class ReservationStatus(Enum):
    PENDING = "pending"          # Initial reservation
    COMMITTED = "committed"      # Order confirmed
    RELEASED = "released"        # Cancelled/expired
    EXPIRED = "expired"          # TTL cleanup
```

**Atomic Stock Operations:**
```python
# Reserve stock (conditional update)
db.inventory.update_one(
    {
        "sku": sku,
        "$expr": {"$gte": [{"$subtract": ["$on_hand", "$reserved"]}, quantity]}
    },
    {
        "$inc": {"reserved": quantity},
        "$push": {"reservations": reservation_doc}
    }
)

# Commit reservation (finalize order)
db.inventory.update_one(
    {"sku": sku},
    {
        "$inc": {"on_hand": -quantity, "reserved": -quantity},
        "$pull": {"reservations": {"id": reservation_id}}
    }
)

# Release reservation (cancel/expire)
db.inventory.update_one(
    {"sku": sku},
    {
        "$inc": {"reserved": -quantity},
        "$pull": {"reservations": {"id": reservation_id}}
    }
)
```

**Change Streams Worker:**
- Listens for TTL deletions on reservations collection
- Automatically releases expired reservations
- Restores reserved stock to available

**Requirements Traceability:** Req 12 (Inventory Management), Req 15 (Atomicity, Transaction Integrity)

#### User Aggregate

```python
class User:
    id: ObjectId
    email: str
    phone: Optional[str]
    password_hash: str
    first_name: str
    last_name: str
    addresses: List[Address]
    default_address_id: Optional[str]
    role: UserRole               # CUSTOMER, ADMIN, B2B_BUYER
    b2b_account: Optional[B2BAccount]
    preferences: UserPreferences
    kvkk_consent: KVKKConsent
    email_verified: bool
    phone_verified: bool
    created_at: datetime
    last_login_at: datetime
    version: int

class KVKKConsent:
    marketing_consent: bool
    data_processing_consent: bool
    consent_date: datetime
    consent_ip: str
    consent_text_version: str

class B2BAccount:
    company_name: str
    tax_number: str
    credit_limit: Decimal
    current_balance: Decimal
    payment_terms: int           # Days
    discount_rate: Decimal
    price_list_id: ObjectId
```

**Requirements Traceability:** Req 4 (Authentication), Req 11 (KVKK Compliance)

#### Campaign Aggregate

```python
class Campaign:
    id: ObjectId
    name: str
    type: CampaignType           # COUPON, CART_RULE, PRODUCT_DISCOUNT
    rules: List[CampaignRule]
    actions: List[CampaignAction]
    priority: int
    start_date: datetime
    end_date: datetime
    usage_limit: Optional[int]
    usage_count: int
    status: CampaignStatus
    created_at: datetime

class CampaignRule:
    type: RuleType               # MIN_AMOUNT, PRODUCT_IN_CART, CATEGORY, etc.
    operator: str                # ">=", "==", "in", etc.
    value: Any

class CampaignAction:
    type: ActionType             # PERCENTAGE_DISCOUNT, FIXED_DISCOUNT, FREE_SHIPPING, GIFT_PRODUCT
    value: Any
```

**Requirements Traceability:** Req 7 (Campaign Management)

## State Machines

### Order Status State Machine

```
┌─────────┐
│ CREATED │
└────┬────┘
     │ payment_confirmed
     ▼
┌─────────┐
│  PAID   │◄──────────────┐
└────┬────┘               │
     │ start_picking      │ restore_payment
     ▼                    │
┌─────────┐               │
│ PICKING │               │
└────┬────┘               │
     │ mark_shipped       │
     ▼                    │
┌─────────┐               │
│ SHIPPED │               │
└────┬────┘               │
     │ confirm_delivery   │
     ▼                    │
┌───────────┐             │
│ DELIVERED │             │
└─────┬─────┘             │
      │                   │
      ├─ initiate_return ─┤
      │                   │
      ▼                   │
┌─────────┐               │
│RETURNED │               │
└─────────┘               │
                          │
Any status ──cancel_order─┤
                          │
                          ▼
                    ┌───────────┐
                    │ CANCELLED │
                    └───────────┘
```

**State Transition Rules:**
- `CREATED → PAID`: Only when payment provider confirms successful payment
- `PAID → PICKING`: Manual trigger by warehouse staff or automated
- `PICKING → SHIPPED`: When shipping label generated and tracking number assigned
- `SHIPPED → DELIVERED`: When carrier confirms delivery or manual confirmation
- `DELIVERED → RETURNED`: When return request approved and item received
- `Any → CANCELLED`: Before SHIPPED status only; triggers stock restoration and refund

**Requirements Traceability:** Req 6 (Order Status), Req 12 (Inventory restoration)

### Payment Status State Machine

```
┌────────────┐
│ INITIATED  │
└──────┬─────┘
       │ redirect_to_3ds
       ▼
┌──────────────┐
│REQUIRES_AUTH │ (3D Secure)
└──────┬───────┘
       │ 3ds_success
       ▼
┌────────────┐
│ AUTHORIZED │
└──────┬─────┘
       │ capture
       ▼
┌──────────┐
│ CAPTURED │
└──────────┘

Any status ──timeout/decline──► ┌────────┐
                                 │ FAILED │
                                 └────────┘
```

**Retry Policy:**
- Maximum 3 attempts within 5 minutes
- Exponential backoff: 1s, 2s, 4s
- After 3 failures, require new payment method
- Log all attempts with `PAYMENT_3DS_FAILED` code

**Requirements Traceability:** Req 5 (Payment Processing), Req 11 (Security)

## API Design

### REST API Conventions

**Base URL:** `/api/v1`

**Authentication:** Bearer JWT in `Authorization` header

**Response Format:**
```json
{
  "code": "SUCCESS",
  "message": "Operation completed",
  "data": { ... },
  "traceId": "abc123..."
}
```

### Key Endpoints

#### Product Catalog

```
GET    /api/v1/products
GET    /api/v1/products/:id
GET    /api/v1/categories
GET    /api/v1/search?q=...&filters=...
```

**Query Parameters:**
- `cursor`: Cursor for pagination (keyset pagination using ObjectId)
- `limit`: Items per page (default: 20, max: 100)
- `category`: Filter by category ID
- `price_min`, `price_max`: Price range
- `sort`: Sort field (e.g., `-price`, `created_at`)
- `q`: Full-text search query

**Response (GET /products):**
```json
{
  "code": "SUCCESS",
  "data": {
    "items": [
      {
        "id": "...",
        "name": "Product Name",
        "slug": "product-name",
        "base_price": 99.99,
        "images": [...],
        "variants": [...]
      }
    ],
    "pagination": {
      "next_cursor": "507f1f77bcf86cd799439011",
      "prev_cursor": null,
      "has_more": true,
      "limit": 20
    }
  }
}
```

**Response Headers (RFC 8288 Link):**
```
Link: </api/v1/products?cursor=507f1f77bcf86cd799439011&limit=20>; rel="next"
ETag: "v1"
```

**Requirements Traceability:** Req 1, Req 2

#### Cart Management

```
GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/:id
DELETE /api/v1/cart/items/:id
POST   /api/v1/cart/apply-coupon
DELETE /api/v1/cart/coupons/:code
```

**Request (POST /cart/items):**
```json
{
  "product_id": "...",
  "variant_id": "...",
  "quantity": 2
}
```

**Response:**
```json
{
  "code": "SUCCESS",
  "data": {
    "cart": {
      "items": [...],
      "subtotal": 199.98,
      "discount_total": 20.00,
      "total": 179.98
    }
  }
}
```

**Requirements Traceability:** Req 3, Req 7

#### Checkout & Payment

```
POST   /api/v1/checkout/initiate
POST   /api/v1/checkout/confirm
POST   /api/v1/payments/webhook
```

**Request (POST /checkout/initiate):**
```json
{
  "shipping_address": {...},
  "billing_address": {...},
  "payment_method": "credit_card",
  "idempotency_key": "unique-key"
}
```

**Response:**
```json
{
  "code": "SUCCESS",
  "data": {
    "checkout_id": "...",
    "payment_url": "https://provider.com/3ds/...",
    "expires_at": "2024-01-01T12:00:00Z"
  }
}
```

**Requirements Traceability:** Req 5, Req 15 (Idempotency)

#### Order Management

```
GET    /api/v1/orders
GET    /api/v1/orders/:id
POST   /api/v1/orders/:id/cancel
POST   /api/v1/orders/:id/return
```

**Requirements Traceability:** Req 6

#### Admin Endpoints

```
POST   /api/v1/admin/products
PATCH  /api/v1/admin/products/:id
POST   /api/v1/admin/products/:id/variants
PATCH  /api/v1/admin/orders/:id/status
POST   /api/v1/admin/inventory/adjust
GET    /api/v1/admin/reports/sales
```

**Requirements Traceability:** Req 1, Req 10, Req 12

## Data Models & Indexing

### MongoDB Collections

**products**
```javascript
{
  _id: ObjectId,
  sku: String (unique),
  name: String,
  slug: String (unique),
  variants: [
    {
      id: String,
      sku: String (unique),  // Links to inventory collection
      attributes: Object,
      price_adjustment: Number,
      weight: Number
    }
  ],
  version: Number  // For optimistic locking
}

// Indexes
db.products.createIndex({ sku: 1 }, { unique: true })
db.products.createIndex({ slug: 1 }, { unique: true })
db.products.createIndex({ "category_ids": 1 })
db.products.createIndex({ "tags": 1 })
db.products.createIndex({ "name": "text", "description": "text" })
db.products.createIndex({ "base_price": 1 })
db.products.createIndex({ "status": 1, "created_at": -1 })
```

**inventory**
```javascript
{
  _id: ObjectId,
  sku: String (unique),
  product_id: ObjectId,
  variant_id: String,
  on_hand: Number,
  reserved: Number,
  available: Number,  // Computed: on_hand - reserved
  low_stock_threshold: Number,
  reservations: [
    {
      id: String,
      quantity: Number,
      order_id: ObjectId,
      cart_id: ObjectId,
      status: String,
      expires_at: Date
    }
  ],
  version: Number,
  updated_at: Date
}

// Indexes
db.inventory.createIndex({ sku: 1 }, { unique: true })
db.inventory.createIndex({ product_id: 1, variant_id: 1 })
db.inventory.createIndex({ "reservations.expires_at": 1 }, { expireAfterSeconds: 0 })  // TTL
db.inventory.createIndex({ available: 1 })
db.inventory.createIndex({ on_hand: 1 })
```

**carts**
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (nullable),
  session_id: String,
  items: Array,
  expires_at: Date
}

// Indexes
db.carts.createIndex({ user_id: 1 })
db.carts.createIndex({ session_id: 1 })
db.carts.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })  // TTL index
```

**orders**
```javascript
{
  _id: ObjectId,
  order_number: String (unique),
  user_id: ObjectId (nullable),
  status: String,
  payment: {
    idempotency_key: String (unique),
    transaction_id: String
  },
  created_at: Date,
  version: Number
}

// Indexes
db.orders.createIndex({ order_number: 1 }, { unique: true })
db.orders.createIndex({ user_id: 1, created_at: -1 })
db.orders.createIndex({ status: 1 })
db.orders.createIndex({ "payment.idempotency_key": 1 }, { unique: true, sparse: true })
db.orders.createIndex({ created_at: -1 })
```

**users**
```javascript
{
  _id: ObjectId,
  email: String (unique),
  phone: String (unique, sparse),
  password_hash: String,
  role: String,
  version: Number
}

// Indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ phone: 1 }, { unique: true, sparse: true })
```

**Requirements Traceability:** Req 13 (Performance), Req 15 (Optimistic Locking)

### Redis Data Structures

**Session Storage:**
```
Key: session:{session_id}
Type: Hash
TTL: 7 days
Fields: user_id, cart_id, last_activity
```

**Rate Limiting:**
```
Key: ratelimit:auth:{ip}
Type: String (counter)
TTL: 60 seconds
```

**Cache:**
```
Key: product:{product_id}
Type: String (JSON)
TTL: 5 minutes
```

**Background Job Queue:**
```
Queue: celery:tasks
Type: List
```

## Integration Layer

### Payment Provider Interface

```python
class PaymentProvider(ABC):
    @abstractmethod
    async def initiate_payment(
        self,
        amount: Decimal,
        currency: str,
        order_id: str,
        customer_info: CustomerInfo,
        idempotency_key: str
    ) -> PaymentInitResponse:
        """Initiate payment and return 3DS URL if required"""
        pass

    @abstractmethod
    async def confirm_payment(
        self,
        transaction_id: str
    ) -> PaymentConfirmResponse:
        """Confirm payment status after 3DS"""
        pass

    @abstractmethod
    async def refund_payment(
        self,
        transaction_id: str,
        amount: Decimal,
        reason: str
    ) -> RefundResponse:
        """Process refund"""
        pass

    @abstractmethod
    async def verify_webhook(
        self,
        payload: dict,
        signature: str
    ) -> bool:
        """Verify webhook authenticity"""
        pass
```

**Implementations:**
- `PayTRProvider`
- `IyzicoProvider`
- `MockPaymentProvider` (for testing)

**Retry & Timeout Configuration:**
```python
PAYMENT_CONFIG = {
    "timeout": 30,  # seconds
    "max_retries": 3,
    "retry_backoff": [1, 2, 4],  # seconds
    "idempotency_window": 3600  # 1 hour
}
```

**Requirements Traceability:** Req 5, Req 11 (Security), Req 15 (Idempotency)

### Shipping Provider Interface

```python
class ShippingProvider(ABC):
    @abstractmethod
    async def calculate_shipping_cost(
        self,
        origin: Address,
        destination: Address,
        weight: Decimal,
        dimensions: Dimensions
    ) -> ShippingCostResponse:
        """Calculate shipping cost"""
        pass

    @abstractmethod
    async def create_shipment(
        self,
        order: Order
    ) -> ShipmentResponse:
        """Create shipment and get tracking number"""
        pass

    @abstractmethod
    async def get_tracking_info(
        self,
        tracking_number: str
    ) -> TrackingInfo:
        """Get current shipment status"""
        pass
```

### ERP Adapter Interface

```python
class ERPAdapter(ABC):
    @abstractmethod
    async def sync_product(
        self,
        product: Product
    ) -> bool:
        """Sync product to ERP"""
        pass

    @abstractmethod
    async def sync_order(
        self,
        order: Order
    ) -> bool:
        """Sync order to ERP"""
        pass

    @abstractmethod
    async def generate_invoice(
        self,
        order: Order
    ) -> InvoiceResponse:
        """Generate e-invoice"""
        pass
```

## Error Handling

### Error Response Schema (RFC 9457 Problem Details)

**Success Response:**
```json
{
  "code": "SUCCESS",
  "message": "Operation completed successfully",
  "data": {...},
  "traceId": "abc123..."
}
```

**Error Response (RFC 9457):**
```json
{
  "type": "https://api.vorte.com/problems/payment-declined",
  "title": "Payment Declined",
  "status": 402,
  "detail": "Payment was declined by the provider due to insufficient funds",
  "instance": "/api/v1/payments/initiate",
  "traceId": "abc123...",
  "provider": "iyzico",
  "transaction_id": "..."
}
```

**Content-Type:** `application/problem+json` for errors

**HTTP Status Codes:**
- `428 Precondition Required`: Missing Idempotency-Key or If-Match header
- `409 Conflict`: ETag mismatch (concurrent modification)
- `402 Payment Required`: Payment declined
- `422 Unprocessable Entity`: Validation errors

### Application Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `PAYMENT_DECLINED`: Payment provider declined
- `PAYMENT_TIMEOUT`: Payment provider timeout
- `PAYMENT_3DS_FAILED`: 3D Secure authentication failed
- `INSUFFICIENT_STOCK`: Not enough inventory
- `CART_EXPIRED`: Cart session expired
- `COUPON_INVALID`: Coupon code invalid or expired
- `ORDER_NOT_FOUND`: Order doesn't exist
- `UNAUTHORIZED_ACCESS`: User lacks permission
- `CONCURRENT_MODIFICATION`: Optimistic lock failure

**Requirements Traceability:** Req 11, Req 15

## Testing Strategy

### Unit Tests (pytest)

- Service layer business logic
- Repository CRUD operations
- Campaign rule evaluation
- Price calculation
- Validation logic

**Coverage Target:** 80%

### Integration Tests (pytest)

- API endpoint tests with test database
- MongoDB transaction tests
- Payment provider contract tests (with mocks)
- Shipping provider contract tests (with mocks)

### E2E Tests (Playwright)

**Critical User Flows:**
1. Browse catalog → Filter → View product → Add to cart → Checkout → Payment → Order confirmation
2. Guest checkout flow
3. Apply coupon code
4. B2B user with special pricing
5. Out of stock handling
6. Order cancellation
7. Return/refund flow

**Requirements Traceability:** All requirements

### Performance Tests

- Load test: 100 concurrent users browsing catalog
- Stress test: Checkout under high load
- Verify p95 latency targets (Req 13)

## Security Considerations

### Authentication & Authorization

- JWT with 15-minute expiry
- Refresh token with 7-day expiry
- Role-based access control (RBAC)
- Rate limiting: 60 req/min per IP on auth endpoints

### Data Protection

- Password hashing: Argon2id (OWASP recommended)
  - memory_cost: 128MB (131072 KiB)
  - time_cost: 2 iterations
  - parallelism: 4 threads
  - Per OWASP Password Storage Cheat Sheet
- PII masking in logs (email, phone, address, payment data)
- No plain-text card data storage
- Payment provider tokenization for saved cards

### KVKK Compliance

- Explicit consent collection on registration
- Consent timestamp and IP logging
- Data export and deletion endpoints
- 10-year data retention for orders (tax law)

**Requirements Traceability:** Req 11

## Observability

### Structured Logging

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "INFO",
  "traceId": "abc123...",
  "userId": "user_id",
  "endpoint": "/api/v1/checkout",
  "method": "POST",
  "status": 200,
  "duration_ms": 245,
  "message": "Checkout completed"
}
```

### Metrics (Prometheus)

- `http_requests_total{method, endpoint, status}`
- `http_request_duration_seconds{method, endpoint}`
- `payment_attempts_total{provider, status}`
- `order_status_transitions_total{from_status, to_status}`
- `inventory_stock_level{product_id, variant_id}`

### Distributed Tracing

- Generate unique `traceId` for each request
- Propagate through all service calls
- Include in logs and error responses
- Use for debugging and performance analysis

**Requirements Traceability:** Req 14

## Deployment Architecture

### Development Environment

```yaml
services:
  web:
    image: node:20
    ports: ["5173:5173"]
    volumes: ["./apps/frontend:/app"]
    command: pnpm dev

  api:
    image: python:3.12
    ports: ["8000:8000"]
    volumes: ["./apps/backend:/app"]
    command: uvicorn main:app --reload

  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: ["mongo_data:/data/db"]

  redis:
    image: redis:7
    ports: ["6379:6379"]

  minio:
    image: minio/minio
    ports: ["9000:9000", "9001:9001"]
    command: server /data --console-address ":9001"

  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes: ["./infra/nginx/nginx.conf:/etc/nginx/nginx.conf"]
```

### Production Considerations

- Horizontal scaling: Multiple API instances behind load balancer
- Database: MongoDB replica set for high availability
- Cache: Redis cluster for distributed caching
- CDN: CloudFlare or similar for static assets
- Monitoring: Prometheus + Grafana
- Log aggregation: ELK stack or similar
- Secrets management: HashiCorp Vault or cloud provider secret store

## Performance Optimization

### Database Query Optimization

- Use compound indexes for common filter combinations
- Implement pagination for large result sets
- Use projection to limit returned fields
- Cache frequently accessed data in Redis

### API Response Optimization

- Implement HTTP caching headers
- Use ETags for conditional requests
- Compress responses with gzip/brotli
- Implement field selection (sparse fieldsets)

### Frontend Optimization

- Code splitting by route
- Lazy load images below fold
- Implement virtual scrolling for long lists
- Use React.memo for expensive components
- Optimize bundle size with tree shaking

**Requirements Traceability:** Req 13 (Performance SLOs)

## Migration & Rollout Strategy

### Phase 1: Core Infrastructure
- Set up monorepo structure
- Configure Docker Compose
- Implement authentication
- Basic product catalog

### Phase 2: Shopping Flow
- Cart management
- Checkout process
- Payment integration (mock first)
- Order creation

### Phase 3: Admin & Management
- Admin product management
- Order management
- Inventory tracking
- Campaign management

### Phase 4: Integrations
- Real payment providers
- Shipping providers
- ERP integration
- E-invoice generation

### Phase 5: Optimization & Scale
- Performance tuning
- Caching strategy
- Monitoring & alerting
- Load testing

## Open Questions & Future Considerations

1. **Multi-currency support**: How to handle exchange rates and pricing?
2. **Internationalization**: Translation management strategy?
3. **Mobile app**: Native or WebView approach?
4. **Marketplace integration**: Hepsiburada, n11 sync strategy?
5. **Advanced search**: Elasticsearch for better search performance?
6. **Recommendation engine**: ML-based product recommendations?
7. **Loyalty program**: Points, rewards, tier system?
8. **Subscription products**: Recurring billing support?

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-01  
**Status:** Ready for Review
