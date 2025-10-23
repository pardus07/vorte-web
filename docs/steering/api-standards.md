# API Standards

## Base URL

- Development: `http://localhost:8000/api/v1`
- Production: `https://api.vorte.com.tr/api/v1`

## Response Format

### Success Response

```json
{
  "code": "SUCCESS",
  "message": "Operation completed successfully",
  "data": { ... },
  "traceId": "abc123..."
}
```

### Error Response

```json
{
  "code": "PAYMENT_DECLINED",
  "message": "Payment was declined by the provider",
  "details": {
    "reason": "insufficient_funds",
    "provider": "iyzico"
  },
  "traceId": "abc123..."
}
```

## HTTP Status Codes

- `200 OK`: Successful GET, PUT, PATCH
- `201 Created`: Successful POST
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid auth
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Business rule violation
- `422 Unprocessable Entity`: Semantic validation error
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Application Error Codes

Use semantic error codes for business logic errors:

- `VALIDATION_ERROR`: Input validation failed
- `PAYMENT_DECLINED`: Payment provider declined
- `INSUFFICIENT_STOCK`: Not enough inventory
- `CART_EXPIRED`: Cart session expired
- `COUPON_INVALID`: Coupon code invalid or expired
- `ORDER_NOT_FOUND`: Order doesn't exist
- `UNAUTHORIZED_ACCESS`: User lacks permission

## Pagination

```
GET /api/v1/products?page=1&limit=20&sort=-created_at
```

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

## Authentication

- **Header**: `Authorization: Bearer <jwt_token>`
- **Refresh**: `POST /api/v1/auth/refresh` with refresh token
- **Token Expiry**: Access token (15 min), Refresh token (7 days)

## Versioning

- URL-based versioning: `/api/v1`, `/api/v2`
- Breaking changes require new version
- Maintain backward compatibility for at least 6 months

## Request/Response Headers

### Required Request Headers
- `Content-Type: application/json`
- `Accept: application/json`
- `X-Request-ID`: Client-generated request ID (optional, for tracing)

### Response Headers
- `X-Trace-ID`: Server trace ID for debugging
- `X-RateLimit-Limit`: Rate limit ceiling
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

## Filtering & Search

```
GET /api/v1/products?category=shoes&color=red&price_min=100&price_max=500&q=nike
```

- Use query parameters for filters
- `q` for full-text search
- Range filters: `_min`, `_max` suffixes

## Sorting

```
GET /api/v1/products?sort=-price,created_at
```

- Prefix with `-` for descending order
- Multiple sort fields separated by comma

## Field Selection (Sparse Fieldsets)

```
GET /api/v1/products?fields=id,name,price
```

Returns only specified fields to reduce payload size.
