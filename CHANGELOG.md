# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-24

### Added

**User Profile Management**
- Profile retrieval with ETag support (GET /api/v1/users/me)
- Profile updates with optimistic locking (PATCH /api/v1/users/me)
- If-Match header validation for version control
- RFC 9110 compliant ETag/If-Match implementation

**Email Change Flow**
- 2-step email verification process
- Token generation with SHA-256 hashing
- 1-hour token expiry with Redis storage
- Email verification endpoint (POST /api/v1/users/me/email-change)
- Email confirmation endpoint (POST /api/v1/users/me/email-change/confirm)

**Password Management**
- Secure password change with current password verification
- Environment-based Argon2id configuration
- Production: 128MB memory, 4 parallelism
- Development: 64MB memory, 2 parallelism
- Password change endpoint (POST /api/v1/users/me/password)

**Avatar Management**
- MinIO presigned URL generation for direct uploads
- 2MB file size limit with validation
- Avatar upload URL endpoint (POST /api/v1/users/me/avatar/upload-url)
- Avatar confirmation endpoint (POST /api/v1/users/me/avatar/confirm)
- Avatar deletion endpoint (DELETE /api/v1/users/me/avatar)
- CORS configuration for browser uploads

**Account Deletion (KVKV Compliant)**
- Soft delete with 30-day retention period
- Background PII erasure worker
- Token revocation on deletion
- Account deletion endpoint (DELETE /api/v1/users/me)
- Erasure job tracking with unique job IDs

**Rate Limiting**
- User-based rate limiting with Redis
- Password change: 3 requests per 10 minutes
- Avatar upload: 5 requests per 10 minutes
- Email change: 3 requests per hour
- 429 Too Many Requests with Retry-After header

**Idempotency**
- Stripe-style idempotency with 24-hour window
- Idempotency-Key header support
- Response caching in Redis
- Safe retry mechanism for all critical endpoints

**Observability**
- Prometheus metrics for all profile operations
- Counters: profile_updates_total, email_change_requests_total, etc.
- Histograms: profile_request_duration_seconds
- OpenTelemetry distributed tracing
- Trace attributes: user.id, operation, version, error.code
- Trace events: profile.updated, email.confirmed, avatar.uploaded

**Background Jobs**
- PII erasure worker with async scheduler
- Hourly sweep for expired retention periods
- Email masking: deleted_{user_id}@deleted.local
- PII field clearing: first_name, last_name, phone, addresses
- Avatar deletion from MinIO
- Metrics: account_erasure_jobs_total, account_erasure_duration_seconds

**Testing Infrastructure**
- Unit tests: 8 tests (100% passing, 0.58s execution)
- Integration tests: 10 tests (rate limiting, idempotency, concurrency)
- docker-compose.test.yml for isolated test environment
- Test runner scripts for Windows and Linux/Mac
- Comprehensive test documentation

### Changed

**MinIO Client**
- Lazy initialization to prevent import-time failures
- Client and bucket creation deferred until first use
- Improved test compatibility

**Service Layer**
- Dependency injection support for ProfileService
- Dependency injection support for EmailVerificationService
- Better testability with optional repository parameters

### Fixed

- MinIO client initialization errors during testing
- Import-time failures when MinIO unavailable
- Test isolation issues with shared fixtures

### Infrastructure

**New Files**
- `apps/backend/app/routers/profile.py` - Profile management router
- `apps/backend/app/services/profile_service.py` - Profile operations
- `apps/backend/app/services/email_verification_service.py` - Email verification
- `apps/backend/app/services/password_service.py` - Password management
- `apps/backend/app/services/avatar_service.py` - Avatar operations
- `apps/backend/app/services/account_erasure_service.py` - Account deletion
- `apps/backend/app/tasks/erasure_worker.py` - Background PII erasure
- `apps/backend/app/core/metrics_profile.py` - Prometheus metrics
- `apps/backend/app/schemas/profile.py` - Pydantic schemas
- `scripts/minio_bootstrap.sh` - MinIO bucket setup
- `infra/minio/cors.json` - CORS configuration
- `docker-compose.test.yml` - Test infrastructure
- `Makefile` - Test commands
- `SHIP_CHECKLIST.md` - Production deployment guide

**Test Files**
- `apps/backend/tests/unit/test_profile_services.py` - Service layer tests
- `apps/backend/tests/integration/test_rate_limiting.py` - Rate limit tests
- `apps/backend/tests/integration/test_idempotency.py` - Idempotency tests
- `apps/backend/tests/integration/test_concurrency_control.py` - Concurrency tests
- `apps/backend/tests/conftest.py` - Shared test fixtures
- `apps/backend/tests/TESTING.md` - Testing guide
- `apps/backend/tests/test_runner.ps1` - Windows test runner

### Security

- Argon2id password hashing with environment-specific parameters
- Token-based email verification with SHA-256 hashing
- Rate limiting to prevent abuse
- Optimistic locking to prevent race conditions
- KVKV-compliant data erasure

### Performance

- Redis-based caching for idempotency
- Lazy MinIO client initialization
- Efficient database queries with proper indexing
- Background job processing for PII erasure

### Documentation

- Complete API documentation for 9 new endpoints
- Testing guide with examples
- Ship checklist for production deployment
- Troubleshooting guide
- CI/CD integration examples

### Migration Notes

**Required Actions:**
1. Run `bash scripts/minio_bootstrap.sh` to create avatars bucket
2. Ensure MongoDB replica set is configured (replicaSet=rs0)
3. Set production environment variables (see SHIP_CHECKLIST.md)
4. Verify Argon2 parameters for production (128MB memory, 4 parallelism)
5. Configure rate limiting parameters
6. Set up Prometheus scraping for new metrics
7. Configure OpenTelemetry collector endpoint

**Database Changes:**
- New indexes: `deleted_at`, `erasure_requested`
- New fields: `pending_email`, `avatar_url`, `avatar_object_key`, `deleted_at`, `erasure_*`

**Breaking Changes:**
- None (all new features)

## [1.0.0] - 2024-12-01

### Added
- Initial release
- Basic user authentication
- Product catalog
- Shopping cart
- Order management

---

[1.1.0]: https://github.com/vorte/vorte/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/vorte/vorte/releases/tag/v1.0.0
