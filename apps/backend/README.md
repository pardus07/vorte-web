# VORTE E-Commerce Backend API

Production-ready e-commerce backend built with FastAPI, MongoDB, and Redis.

## Features

### Core Functionality
- ✅ Product catalog with variants and full-text search
- ✅ Shopping cart with guest support
- ✅ Campaign and discount system
- ✅ Payment integration with 3DS support
- ✅ Order management with state machine
- ✅ Inventory management with atomic operations
- ✅ Stock reservation system with TTL

### Technical Features
- ✅ **RFC Compliance**: RFC 9110 (ETag/If-Match), RFC 9457 (Problem Details), RFC 8288 (Link headers)
- ✅ **Idempotency**: Stripe-style pattern with 24-hour window
- ✅ **Optimistic Locking**: Version-based concurrency control
- ✅ **Observability**: Structured logging with traceId, PII masking
- ✅ **Security**: Argon2id password hashing, JWT tokens, rate limiting
- ✅ **Performance**: Redis caching, cursor-based pagination, MongoDB indexes

## Quick Start

### Prerequisites
- Python 3.12+
- MongoDB 7+
- Redis 7+
- Docker & Docker Compose (recommended)

### Development Setup

1. **Clone and navigate to backend**
```bash
cd apps/backend
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Start services with Docker Compose**
```bash
cd ../../infra/docker
docker-compose up -d mongo redis
```

6. **Run the application**
```bash
cd ../../apps/backend
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc
- **OpenAPI JSON**: http://localhost:8000/api/openapi.json

## API Endpoints

### Products
- `GET /api/v1/products` - List products with pagination
- `GET /api/v1/products/{id}` - Get product details
- `GET /api/v1/search` - Search products
- `GET /api/v1/categories` - List categories

### Cart
- `GET /api/v1/cart` - Get current cart
- `POST /api/v1/cart/items` - Add item to cart
- `PATCH /api/v1/cart/items/{id}` - Update item quantity
- `DELETE /api/v1/cart/items/{id}` - Remove item
- `POST /api/v1/cart/apply-coupon` - Apply coupon code
- `DELETE /api/v1/cart/coupons/{code}` - Remove coupon

### Checkout & Orders
- `POST /api/v1/checkout/initiate` - Initiate checkout
- `POST /api/v1/checkout/confirm` - Confirm checkout
- `GET /api/v1/orders` - List user orders
- `GET /api/v1/orders/{id}` - Get order details
- `POST /api/v1/orders/{id}/cancel` - Cancel order

### Payments
- `POST /api/v1/payments/initiate` - Initiate payment
- `POST /api/v1/payments/confirm` - Confirm payment
- `POST /api/v1/payments/webhook` - Payment webhook
- `GET /api/v1/payments/status/{id}` - Get payment status

### Authentication
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout

### Admin
- `POST /api/v1/admin/products` - Create product
- `PATCH /api/v1/admin/products/{id}` - Update product
- `POST /api/v1/admin/inventory/adjust` - Adjust inventory

## Testing

### Run all tests
```bash
pytest
```

### Run specific test file
```bash
pytest tests/integration/test_cart.py -v
```

### Run with coverage
```bash
pytest --cov=app --cov-report=html
```

## Architecture

```
apps/backend/
├── app/
│   ├── core/           # Core utilities (middleware, exceptions, config)
│   ├── integrations/   # External integrations (payments, shipping)
│   ├── repositories/   # Data access layer
│   ├── routers/        # API endpoints
│   ├── schemas/        # Pydantic models
│   ├── services/       # Business logic
│   ├── workers/        # Background jobs
│   └── main.py         # Application entry point
├── tests/
│   ├── integration/    # Integration tests
│   └── unit/           # Unit tests
└── requirements.txt
```

## Key Design Patterns

### Idempotency
All unsafe operations (POST, PATCH, DELETE) support idempotency via `Idempotency-Key` header:
```bash
curl -X POST /api/v1/cart/items \
  -H "Idempotency-Key: unique-key-123" \
  -H "Content-Type: application/json" \
  -d '{"product_id": "...", "qty": 2}'
```

### Optimistic Locking
Updates require `If-Match` header with ETag:
```bash
# Get resource with ETag
curl /api/v1/cart
# Returns: ETag: "v1"

# Update with If-Match
curl -X PATCH /api/v1/cart/items/123 \
  -H "If-Match: \"v1\"" \
  -d '{"qty": 3}'
```

### Error Handling
All errors follow RFC 9457 Problem Details format:
```json
{
  "type": "https://api.vorte.com.tr/errors/INSUFFICIENT_STOCK",
  "title": "INSUFFICIENT_STOCK",
  "status": 409,
  "detail": "Not enough stock available",
  "instance": "/api/v1/cart/items",
  "traceId": "abc123..."
}
```

## Configuration

Key environment variables:

```env
# Database
MONGO_URI=mongodb://localhost:27017/vorte
REDIS_URL=redis://localhost:6379/0

# Security
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Application
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
PROMETHEUS_METRICS=true

# Cart
CART_TTL_GUEST_DAYS=7
CART_CACHE_TTL_SECONDS=900

# Payment
PAYMENT_TIMEOUT=30
PAYMENT_MAX_RETRIES=3
```

## Production Deployment

### Using Docker Compose
```bash
cd infra/docker
docker-compose up -d
```

### Environment Setup
1. Set all required environment variables
2. Configure MongoDB replica set for transactions
3. Set up Redis cluster for high availability
4. Configure Nginx with SSL/TLS certificates
5. Set up monitoring (Prometheus + Grafana)

## Monitoring & Observability

### Health Check
```bash
curl http://localhost:8000/api/health
```

### Metrics (Prometheus)
```bash
curl http://localhost:8000/metrics
```

### Logs
All logs include:
- `timestamp`: ISO 8601 format
- `level`: INFO, WARNING, ERROR
- `traceId`: Unique request identifier
- `userId`: User ID (if authenticated)
- `endpoint`: API endpoint
- `method`: HTTP method
- `status`: HTTP status code
- `duration_ms`: Request duration

## Security

### Authentication
- JWT tokens with 15-minute expiry
- Refresh tokens with 7-day expiry
- Argon2id password hashing (OWASP recommended)

### Rate Limiting
- 60 requests per minute per IP on auth endpoints
- Returns HTTP 429 when limit exceeded

### KVKK Compliance
- PII masking in logs
- Explicit consent collection
- Data export and deletion endpoints
- 10-year data retention for orders

## Contributing

1. Follow PEP 8 style guide
2. Write tests for new features
3. Update documentation
4. Ensure all tests pass before committing

## License

Proprietary - VORTE E-Commerce Platform
