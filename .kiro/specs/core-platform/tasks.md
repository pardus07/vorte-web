# Implementation Plan - Core Platform

This implementation plan breaks down the Core Platform design into discrete, actionable coding tasks. Each task builds incrementally on previous tasks and references specific requirements from the requirements document.

## Task List

- [x] 1. Set up infrastructure and development environment

  - Create Docker Compose configuration with api, web, mongo, redis, minio, nginx services
  - Configure Nginx with rate limiting (60 req/min on auth endpoints), HSTS, CSP headers
  - Set up health check endpoints for all services
  - Create `.env.example` files for backend, frontend, and infra
  - _Requirements: Req 11 (Security), Req 13 (Performance)_

- [x] 2. Implement backend core infrastructure

  - [ ] 2.1 Create FastAPI application skeleton
    - Set up main.py with FastAPI app, CORS middleware, and OpenAPI configuration
    - Implement structured logging middleware with traceId generation
    - Create problem+json error handler middleware (RFC 9457 format)
    - Configure OpenTelemetry SDK for distributed tracing
    - _Requirements: Req 14 (Observability)_


  - [ ] 2.2 Implement database connections and utilities
    - Create MongoDB connection manager with connection pooling
    - Implement MongoDB transaction helper functions
    - Create Redis connection manager for caching and rate limiting
    - Implement database health check endpoints


    - _Requirements: Req 15 (Transaction Integrity)_

  - [ ] 2.3 Implement authentication and authorization
    - Create JWT token generation and validation utilities (15-min access, 7-day refresh)
    - Implement password hashing with bcrypt (cost factor 12)
    - Create authentication middleware with Bearer token validation
    - Implement role-based access control (RBAC) decorator
    - Create rate limiting decorator using Redis (60 req/min per IP)


    - _Requirements: Req 4 (Authentication), Req 11 (Security)_

  - [ ] 2.4 Create core schemas and models
    - Define Pydantic schemas for Product, ProductVariant, ProductImage
    - Define schemas for Cart, CartItem
    - Define schemas for Order, OrderItem, OrderStatus, PaymentInfo
    - Define schemas for User, Address, KVKKConsent, B2BAccount
    - Define schemas for Campaign, CampaignRule, CampaignAction
    - Define common response schemas (SuccessResponse, ErrorResponse with traceId)
    - _Requirements: Req 1, 3, 5, 6, 7, 11_

- [ ] 3. Implement product catalog module
  - [ ] 3.1 Create product repository layer
    - Implement ProductRepository with CRUD operations
    - Create MongoDB indexes (sku unique, slug unique, category_ids, tags, text search, price, status+created_at)
    - Implement product search with filters (category, price range, tags)
    - Implement pagination helper
    - _Requirements: Req 1 (Product Management), Req 2 (Filtering), Req 13 (Performance)_

  - [ ] 3.2 Create product service layer
    - Implement product creation with variant support
    - Implement product update with optimistic locking (version field)
    - Implement product search and filtering logic
    - Implement product status management (DRAFT, ACTIVE, ARCHIVED)
    - Add Redis caching for product details (5-minute TTL, cache-aside pattern)
    - _Requirements: Req 1, Req 2_

  - [ ] 3.3 Create product API endpoints
    - Implement GET /api/v1/products with pagination, filtering, sorting
    - Implement GET /api/v1/products/:id
    - Implement GET /api/v1/categories
    - Implement GET /api/v1/search with full-text search
    - Add HTTP Link headers for pagination (rel=next/prev/first/last per RFC 5988)
    - _Requirements: Req 1, Req 2_

  - [ ] 3.4 Write product module tests
    - Unit tests for ProductRepository CRUD operations
    - Unit tests for product search and filtering logic
    - Integration tests for product API endpoints with test database
    - E2E test: Browse catalog, apply filters, view product details
    - _Requirements: Req 1, Req 2_

- [ ] 4. Implement inventory management
  - [ ] 4.1 Create inventory repository and service
    - Implement stock quantity tracking at variant level
    - Implement atomic stock decrement with MongoDB transactions
    - Implement optimistic locking for concurrent stock updates (version field)
    - Implement low stock threshold alerts
    - Create stock adjustment logging with reason and admin user ID
    - _Requirements: Req 12 (Inventory), Req 15 (Transaction Integrity)_

  - [ ] 4.2 Create inventory API endpoints
    - Implement POST /api/v1/admin/inventory/adjust (requires ADMIN role)
    - Implement GET /api/v1/admin/inventory/low-stock
    - Implement stock availability check endpoint
    - _Requirements: Req 12_

  - [ ] 4.3 Write inventory tests
    - Unit tests for atomic stock decrement
    - Integration test for concurrent stock updates (verify only one succeeds)
    - Test low stock alert triggering
    - _Requirements: Req 12, Req 15_

- [ ] 5. Implement cart management
  - [ ] 5.1 Create cart repository and service
    - Implement CartRepository with CRUD operations
    - Create MongoDB TTL index on expires_at field (7 days for guest, 30 days for authenticated)
    - Implement add to cart with stock validation
    - Implement cart item quantity update
    - Implement cart item removal
    - Implement cart total calculation (subtotal, discounts, tax, shipping, total)
    - Store cart in Redis for authenticated users (session cache)
    - _Requirements: Req 3 (Cart Management)_

  - [ ] 5.2 Create cart API endpoints
    - Implement GET /api/v1/cart (supports guest via session_id)
    - Implement POST /api/v1/cart/items
    - Implement PATCH /api/v1/cart/items/:id
    - Implement DELETE /api/v1/cart/items/:id
    - Validate stock availability before adding to cart
    - _Requirements: Req 3_

  - [ ] 5.3 Write cart tests
    - Unit tests for cart total calculation
    - Integration tests for cart CRUD operations
    - Test guest cart persistence (session_id)
    - Test cart expiration (TTL index)
    - E2E test: Add product to cart, update quantity, remove item
    - _Requirements: Req 3_

- [ ] 6. Implement campaign and discount system
  - [ ] 6.1 Create campaign repository and service
    - Implement CampaignRepository with CRUD operations
    - Implement campaign rule evaluation engine (min_amount, product_in_cart, category, etc.)
    - Implement campaign action application (percentage_discount, fixed_discount, free_shipping, gift_product)
    - Implement coupon code validation (expiry, usage limits)
    - Implement campaign priority ordering
    - _Requirements: Req 7 (Campaign Management)_

  - [ ] 6.2 Integrate campaigns with cart
    - Implement POST /api/v1/cart/apply-coupon
    - Implement DELETE /api/v1/cart/coupons/:code
    - Apply automatic cart rules when cart is updated
    - Calculate and display discount breakdown
    - _Requirements: Req 7_

  - [ ] 6.3 Write campaign tests
    - Unit tests for campaign rule evaluation
    - Unit tests for discount calculation
    - Test coupon validation (expired, usage limit exceeded)
    - Test multiple campaign priority ordering
    - E2E test: Apply coupon code, verify discount applied
    - _Requirements: Req 7_

- [ ] 7. Implement payment integration layer
  - [ ] 7.1 Create payment provider interface
    - Define PaymentProvider abstract base class with methods: initiate_payment, confirm_payment, refund_payment, verify_webhook
    - Implement MockPaymentProvider for testing (simulates 3DS flow)
    - Create payment configuration with timeout (30s), max_retries (3), retry_backoff ([1,2,4]s)
    - _Requirements: Req 5 (Payment Processing)_

  - [ ] 7.2 Implement payment service with idempotency
    - Create PaymentService with idempotency key handling (store in Redis with 1-hour TTL)
    - Implement payment initiation with 3D Secure redirect URL generation
    - Implement payment confirmation after 3DS authentication
    - Implement payment status state machine (INITIATED → REQUIRES_AUTH → AUTHORIZED → CAPTURED / FAILED)
    - Implement retry logic with exponential backoff (max 3 attempts in 5 minutes)
    - Log all payment attempts with PAYMENT_3DS_FAILED code on failure
    - _Requirements: Req 5, Req 11 (Security), Req 15 (Idempotency)_

  - [ ] 7.3 Create payment API endpoints
    - Implement POST /api/v1/payments/initiate (requires idempotency_key header)
    - Implement POST /api/v1/payments/confirm
    - Implement POST /api/v1/payments/webhook (verify signature)
    - Handle payment timeout (30s) with appropriate error response
    - _Requirements: Req 5_

  - [ ] 7.4 Write payment integration tests
    - Contract tests for PaymentProvider interface with MockPaymentProvider
    - Test idempotency: duplicate requests return same response
    - Test retry logic with exponential backoff
    - Test payment timeout handling
    - Test 3DS failure scenarios
    - _Requirements: Req 5, Req 15_

- [ ] 8. Implement checkout and order creation
  - [ ] 8.1 Create order repository and service
    - Implement OrderRepository with CRUD operations
    - Create MongoDB indexes (order_number unique, user_id+created_at, status, payment.idempotency_key unique)
    - Implement order number generation (e.g., "ORD-2024-00001")
    - Implement order creation with MongoDB transaction (validate cart, decrement stock, create order, update cart status)
    - Implement order status state machine with validation (CREATED → PAID → PICKING → SHIPPED → DELIVERED → RETURNED/CANCELLED)
    - Store status change history with timestamp, user, and reason
    - _Requirements: Req 5 (Checkout), Req 6 (Order Management), Req 15 (Transaction Integrity)_

  - [ ] 8.2 Create checkout API endpoints
    - Implement POST /api/v1/checkout/initiate (validate cart, calculate shipping, initiate payment)
    - Implement POST /api/v1/checkout/confirm (confirm payment, create order with status PAID)
    - Validate cart items for stock availability and price accuracy (within 500ms per Req 5.1)
    - Send order confirmation email within 30 seconds of order creation
    - Handle payment failure: preserve cart state, display error with failure reason
    - _Requirements: Req 5, Req 6_

  - [ ] 8.3 Implement order management endpoints
    - Implement GET /api/v1/orders (user's order history)
    - Implement GET /api/v1/orders/:id
    - Implement POST /api/v1/orders/:id/cancel (only before SHIPPED status, restore stock, initiate refund)
    - Implement POST /api/v1/orders/:id/return (after DELIVERED status)
    - _Requirements: Req 6_

  - [ ] 8.4 Write checkout and order tests
    - Integration test for order creation with MongoDB transaction (verify atomic stock decrement)
    - Test order status state machine transitions
    - Test order cancellation (verify stock restoration)
    - Test concurrent order creation for last item in stock (verify only one succeeds)
    - E2E test: Complete checkout flow from cart to order confirmation
    - _Requirements: Req 5, Req 6, Req 12, Req 15_

- [ ] 9. Implement user management and authentication
  - [ ] 9.1 Create user repository and service
    - Implement UserRepository with CRUD operations
    - Create MongoDB indexes (email unique, phone unique sparse)
    - Implement user registration with email/phone verification
    - Implement password reset flow with time-limited token
    - Implement KVKK consent collection (store consent_date, consent_ip, consent_text_version)
    - Implement user address management
    - _Requirements: Req 4 (Authentication), Req 11 (KVKK Compliance)_

  - [ ] 9.2 Create authentication API endpoints
    - Implement POST /api/v1/auth/register (email or phone)
    - Implement POST /api/v1/auth/login (return access + refresh tokens)
    - Implement POST /api/v1/auth/refresh (exchange refresh token for new access token)
    - Implement POST /api/v1/auth/logout (invalidate refresh token)
    - Implement POST /api/v1/auth/password-reset-request
    - Implement POST /api/v1/auth/password-reset-confirm
    - Apply rate limiting (60 req/min per IP)
    - _Requirements: Req 4, Req 11_

  - [ ] 9.3 Create user profile endpoints
    - Implement GET /api/v1/users/me
    - Implement PATCH /api/v1/users/me
    - Implement GET /api/v1/users/me/addresses
    - Implement POST /api/v1/users/me/addresses
    - Implement PATCH /api/v1/users/me/addresses/:id
    - Implement DELETE /api/v1/users/me/addresses/:id
    - _Requirements: Req 4_

  - [ ] 9.4 Write user and auth tests
    - Unit tests for password hashing and validation
    - Unit tests for JWT token generation and validation
    - Integration tests for registration and login flow
    - Test rate limiting on auth endpoints
    - Test KVKK consent collection
    - E2E test: Register, login, update profile, logout
    - _Requirements: Req 4, Req 11_

- [ ] 10. Implement guest checkout
  - [ ] 10.1 Extend checkout for guest users
    - Modify checkout flow to allow unauthenticated users
    - Collect email for order confirmation
    - Generate guest order tracking link (token-based, no login required)
    - Send order details and tracking link via email
    - _Requirements: Req 8 (Guest Checkout)_

  - [ ] 10.2 Implement guest order tracking
    - Implement GET /api/v1/orders/track/:token (public endpoint)
    - Link guest orders to user account when user registers with same email
    - _Requirements: Req 8_

  - [ ] 10.3 Write guest checkout tests
    - E2E test: Complete checkout as guest, receive email, track order via link
    - Test guest order linking when user registers
    - _Requirements: Req 8_

- [ ] 11. Implement product comparison and wishlist
  - [ ] 11.1 Create wishlist service
    - Implement wishlist storage (MongoDB for authenticated, localStorage for guest)
    - Implement add/remove product from wishlist
    - Implement wishlist price drop notification (background job)
    - _Requirements: Req 9 (Wishlist)_

  - [ ] 11.2 Create comparison service
    - Implement product comparison (max 4 products)
    - Return side-by-side attribute comparison
    - _Requirements: Req 9 (Comparison)_

  - [ ] 11.3 Create wishlist and comparison endpoints
    - Implement GET /api/v1/wishlist
    - Implement POST /api/v1/wishlist/items
    - Implement DELETE /api/v1/wishlist/items/:id
    - Implement POST /api/v1/compare (accepts product IDs, returns comparison)
    - _Requirements: Req 9_

  - [ ] 11.4 Write wishlist and comparison tests
    - Test wishlist CRUD operations
    - Test comparison with more than 4 products (should limit to 4)
    - Test price drop notification
    - _Requirements: Req 9_

- [ ] 12. Implement admin order management
  - [ ] 12.1 Create admin order endpoints
    - Implement GET /api/v1/admin/orders (with filters: status, date range, payment method)
    - Implement PATCH /api/v1/admin/orders/:id/status (validate state transitions, send customer notification)
    - Implement POST /api/v1/admin/orders/:id/shipping-label (integrate with shipping provider)
    - Implement POST /api/v1/admin/orders/:id/refund (initiate refund via payment provider)
    - Implement POST /api/v1/admin/orders (manual order creation)
    - _Requirements: Req 10 (Admin Order Management)_

  - [ ] 12.2 Write admin order tests
    - Test order status update with state machine validation
    - Test refund processing
    - Test manual order creation
    - _Requirements: Req 10_

- [ ] 13. Implement admin product management
  - [ ] 13.1 Create admin product endpoints
    - Implement POST /api/v1/admin/products
    - Implement PATCH /api/v1/admin/products/:id
    - Implement DELETE /api/v1/admin/products/:id (soft delete, set status to ARCHIVED)
    - Implement POST /api/v1/admin/products/:id/variants
    - Implement PATCH /api/v1/admin/products/:id/variants/:variant_id
    - _Requirements: Req 1 (Product Management)_

  - [ ] 13.2 Write admin product tests
    - Test product creation with variants
    - Test product update with optimistic locking
    - Test variant management
    - _Requirements: Req 1_

- [ ] 14. Implement observability and monitoring
  - [ ] 14.1 Set up Prometheus metrics
    - Implement metrics endpoint at /metrics
    - Add metrics: http_requests_total, http_request_duration_seconds, payment_attempts_total, order_status_transitions_total, inventory_stock_level
    - Follow Prometheus naming conventions (use _seconds, _bytes suffixes; avoid high cardinality)
    - _Requirements: Req 14 (Observability)_

  - [ ] 14.2 Enhance structured logging
    - Ensure all logs include: timestamp, level, traceId, userId, endpoint, method, status, duration_ms
    - Implement PII masking in logs (email, phone, address, payment data)
    - Log all errors with ERROR level and full stack trace
    - _Requirements: Req 11 (Security), Req 14_

  - [ ] 14.3 Implement distributed tracing
    - Integrate OpenTelemetry with W3C trace context propagation
    - Propagate traceId through all service calls and external integrations
    - Include traceId in all API responses and error messages
    - _Requirements: Req 14_

- [ ] 15. Implement frontend application
  - [ ] 15.1 Set up frontend infrastructure
    - Initialize Vite + React + TypeScript project
    - Configure Tailwind CSS and shadcn/ui
    - Set up TanStack Query for server state management
    - Set up React Router for routing
    - Set up i18next for internationalization (TR, EN)
    - Create API client with Axios (include traceId in requests, handle auth tokens)
    - _Requirements: Req 13 (Performance)_

  - [ ] 15.2 Implement authentication UI
    - Create LoginPage with email/password form
    - Create RegisterPage with KVKK consent checkboxes
    - Create PasswordResetPage
    - Implement JWT token storage and refresh logic
    - Create ProtectedRoute component for authenticated routes
    - _Requirements: Req 4, Req 11_

  - [ ] 15.3 Implement product catalog UI
    - Create HomePage with featured products
    - Create CategoryPage with product grid and filters (category, price range, attributes)
    - Create ProductPage with variant selector, add to cart button, product images
    - Implement product search with debounced input
    - Implement pagination with infinite scroll or page numbers
    - _Requirements: Req 1, Req 2_

  - [ ] 15.4 Implement cart and checkout UI
    - Create CartPage with cart items, quantity controls, coupon input
    - Create CheckoutPage with address form, payment method selector
    - Implement 3D Secure redirect flow
    - Create OrderConfirmationPage with order details
    - Show loading states during API calls (skeleton screens)
    - _Requirements: Req 3, Req 5, Req 7_

  - [ ] 15.5 Implement user account UI
    - Create AccountPage with profile info, address management
    - Create OrderHistoryPage with order list and status
    - Create OrderDetailPage with order items, tracking info
    - _Requirements: Req 4, Req 6_

  - [ ] 15.6 Implement wishlist and comparison UI
    - Create WishlistPage with saved products
    - Create ProductComparisonPage with side-by-side comparison (max 4 products)
    - Add wishlist and comparison buttons to product cards
    - _Requirements: Req 9_

  - [ ] 15.7 Implement accessibility and SEO
    - Ensure WCAG 2.1 Level AA compliance (semantic HTML, ARIA attributes, keyboard navigation, focus indicators)
    - Add meta tags (title, description, Open Graph) to all pages
    - Implement JSON-LD structured data for Product, BreadcrumbList
    - Generate sitemap.xml
    - _Requirements: Req 11 (Accessibility)_

  - [ ] 15.8 Write frontend component tests
    - Unit tests for key components (ProductCard, CartItem, CheckoutForm) with Vitest
    - Test form validation with React Hook Form + Zod
    - Test API client error handling
    - _Requirements: All frontend requirements_

- [ ] 16. Implement end-to-end tests
  - [ ] 16.1 Set up Playwright
    - Initialize Playwright project
    - Configure test environments (dev, staging)
    - Create test fixtures and helpers
    - _Requirements: All requirements_

  - [ ] 16.2 Write critical user flow E2E tests
    - Test: Browse catalog → Filter by category → View product → Select variant → Add to cart → Checkout → Payment (mock) → Order confirmation
    - Test: Guest checkout flow
    - Test: Apply coupon code
    - Test: Out of stock handling (product not available, show "Notify When Available")
    - Test: Order cancellation
    - Test: User registration and login
    - _Requirements: Req 1-9_

  - [ ] 16.3 Write B2B E2E tests
    - Test: B2B user login → View products with special pricing → Add to cart → Checkout with credit account
    - _Requirements: Req 4 (B2B Account)_

  - [ ] 16.4 Write performance tests
    - Load test: 100 concurrent users browsing catalog
    - Stress test: Checkout under high load
    - Verify p95 latency targets: homepage < 2s, search < 1.5s, checkout < 3s
    - _Requirements: Req 13 (Performance SLOs)_

- [ ] 17. Implement CI/CD pipeline
  - [ ] 17.1 Create GitHub Actions workflows
    - Create lint workflow (ESLint, Prettier, Ruff)
    - Create test workflow (pytest, Vitest, Playwright)
    - Create build workflow (Docker images for api and web)
    - Create security scan workflow (Bandit, npm audit, Semgrep)
    - _Requirements: Req 11 (Security)_

  - [ ] 17.2 Configure deployment
    - Create production Docker Compose configuration
    - Set up environment variable management
    - Configure MongoDB replica set for production
    - Configure Redis cluster for production
    - Set up Nginx with SSL/TLS certificates
    - _Requirements: Req 13 (Reliability)_

- [ ] 18. Documentation and deployment
  - [ ] 18.1 Write deployment documentation
    - Document environment setup (Node, Python, Docker)
    - Document development workflow (running locally, running tests)
    - Document deployment process (building images, deploying to production)
    - Document API endpoints (OpenAPI/Swagger)
    - _Requirements: All requirements_

  - [ ] 18.2 Create runbook for operations
    - Document common operational tasks (restarting services, checking logs, monitoring metrics)
    - Document incident response procedures
    - Document backup and restore procedures
    - _Requirements: Req 13 (Reliability), Req 14 (Observability)_

## Acceptance Criteria

The Core Platform implementation is complete when:

- [ ] `docker compose up` starts all services (api, web, mongo, redis, minio, nginx) successfully
- [ ] Health check endpoints return 200 OK for all services
- [ ] All E2E tests pass (catalog browsing, cart, checkout, payment, order creation)
- [ ] Admin can create products with variants and manage inventory
- [ ] Users can complete full purchase flow (browse → cart → checkout → payment → order)
- [ ] Guest users can complete checkout without registration
- [ ] Payment integration works with mock provider (3DS flow)
- [ ] Order status transitions follow state machine rules
- [ ] Stock is decremented atomically during order creation
- [ ] Concurrent orders for last item in stock are handled correctly (only one succeeds)
- [ ] All API endpoints return proper error responses with traceId
- [ ] Logs include structured JSON with traceId for all requests
- [ ] Prometheus metrics endpoint exposes key metrics
- [ ] Rate limiting works on authentication endpoints (60 req/min per IP)
- [ ] KVKK consent is collected and stored during registration
- [ ] PII is masked in application logs
- [ ] Frontend is accessible (WCAG 2.1 AA) and responsive
- [ ] Performance SLOs are met: homepage p95 < 2s, search p95 < 1.5s, checkout p95 < 3s
- [ ] CI pipeline runs lint, tests, and security scans successfully

---

**Total Tasks:** 18 main tasks, 60+ subtasks  
**Estimated Effort:** 8-12 weeks (1-2 developers)  
**Priority:** Phase 1 (Core) - All tasks are required for MVP
