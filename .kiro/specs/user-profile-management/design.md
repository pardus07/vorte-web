# Design Document: User Profile Management

## Overview

The User Profile Management feature enables authenticated users to manage their personal information through a RESTful API. The design leverages existing infrastructure components (ETag/If-Match for optimistic locking, Idempotency-Key for safe retries, MinIO for object storage, Argon2id for password hashing) to provide a production-ready, KVKV-compliant profile management system.

### Key Design Principles

1. **Optimistic Concurrency Control**: All update operations require If-Match header with ETag validation
2. **Idempotency**: All state-changing POST operations require Idempotency-Key for safe retries
3. **Security**: Argon2id password hashing with environment-specific parameters
4. **Compliance**: KVKV-compliant account deletion with PII erasure workflow
5. **Scalability**: MinIO presigned URLs for direct client-to-storage uploads
6. **Observability**: Prometheus metrics and distributed tracing for all operations

## Architecture

### High-Level Component Diagram

```
┌─────────────┐
│   Client    │
│  (Web/App)  │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────────────────┐
│           FastAPI Application                    │
│  ┌──────────────────────────────────────────┐  │
│  │  Middleware Layer                         │  │
│  │  - Authentication (JWT)                   │  │
│  │  - ETag (If-Match validation)             │  │
│  │  - Idempotency (Redis cache)              │  │
│  │  - Rate Limiting                          │  │
│  │  - Metrics (Prometheus)                   │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  Router Layer                             │  │
│  │  - /api/v1/users/me (profile)             │  │
│  │  - /api/v1/users/me/email-change          │  │
│  │  - /api/v1/users/me/password              │  │
│  │  - /api/v1/users/me/avatar/*              │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  Service Layer                            │  │
│  │  - ProfileService                        │  │
│  │  - EmailVerificationService               │  │
│  │  - AvatarService                          │  │
│  │  - AccountErasureService                  │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  Repository Layer                         │  │
│  │  - UserRepository (extended)              │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
       │                    │                │
       ▼                    ▼                ▼
┌─────────────┐    ┌─────────────┐   ┌─────────────┐
│   MongoDB   │    │    Redis    │   │    MinIO    │
│   (Users)   │    │  (Cache +   │   │  (Avatars)  │
│             │    │ Idempotency)│   │             │
└─────────────┘    └─────────────┘   └─────────────┘
```

### Request Flow Examples

#### Profile Update Flow
```
1. Client → GET /api/v1/users/me
   Response: 200 + ETag: "v5"

2. Client → PATCH /api/v1/users/me
   Headers: If-Match: "v5"
   Body: {"first_name": "John"}
   
3. Middleware validates If-Match against current version
   - If mismatch → 409 Conflict
   - If missing → 428 Precondition Required

4. ProfileService.update_profile()
   - Validate input
   - Update with version check
   - Increment version to 6

5. Response: 200 + ETag: "v6" + updated profile
```

#### Avatar Upload Flow
```
1. Client → POST /api/v1/users/me/avatar/upload-url
   Headers: Idempotency-Key: "uuid-123"
   Body: {"content_type": "image/jpeg"}

2. Idempotency check (Redis)
   - If cached → return cached response
   - If new → proceed

3. AvatarService.get_upload_url()
   - Generate object key: users/{user_id}/avatar-{uuid}.jpg
   - Create MinIO presigned PUT URL (15 min expiry)
   - Cache response in Redis

4. Response: 200 + {upload_url, object_key, expires_at}

5. Client → PUT {upload_url} (direct to MinIO)
   Body: image binary data

6. Client → POST /api/v1/users/me/avatar/confirm
   Headers: If-Match: "v6", Idempotency-Key: "uuid-456"
   Body: {"object_key": "users/123/avatar-abc.jpg"}

7. AvatarService.confirm()
   - Verify object exists in MinIO
   - Check size ≤ 2MB
   - Update user.avatar_url
   - Increment version

8. Response: 200 + ETag: "v7" + updated profile
```

## Components and Interfaces

### 1. ProfileService

**Responsibility**: Manage user profile information updates

**Methods**:
```python
class ProfileService:
    async def get_profile(self, user_id: str) -> dict:
        """Get user profile with version for ETag."""
        
    async def update_profile(
        self,
        user_id: str,
        current_version: int,
        updates: ProfileUpdate
    ) -> dict:
        """Update profile with optimistic locking."""
```

**Dependencies**:
- UserRepository (data access)
- ETag utilities (version validation)

**Error Handling**:
- 409 Conflict: Version mismatch
- 422 Validation Error: Invalid input
- 428 Precondition Required: Missing If-Match

### 2. EmailVerificationService

**Responsibility**: Manage email change verification workflow

**Methods**:
```python
class EmailVerificationService:
    async def request_email_change(
        self,
        user_id: str,
        new_email: str,
        idempotency_key: str
    ) -> dict:
        """Initiate email change with verification."""
        
    async def confirm_email_change(
        self,
        user_id: str,
        token: str
    ) -> dict:
        """Confirm email change with token."""
        
    async def generate_verification_token(
        self,
        user_id: str,
        new_email: str
    ) -> str:
        """Generate time-limited verification token."""
```

**Token Format**:
- JWT with claims: {sub: user_id, email: new_email, type: "email_verification"}
- Expiry: 1 hour
- Stored in Redis with key: `email_verify:{user_id}` (TTL: 1 hour)

**Dependencies**:
- UserRepository
- Redis (token storage)
- Email service (send verification email)
- IdempotencyManager

**Error Handling**:
- 422 EMAIL_ALREADY_EXISTS: Email taken by another user
- 422 INVALID_OR_EXPIRED_TOKEN: Token validation failed
- 422 NO_PENDING_EMAIL_CHANGE: No pending change to confirm

### 3. AvatarService

**Responsibility**: Manage avatar image uploads via MinIO

**Methods**:
```python
class AvatarService:
    async def get_upload_url(
        self,
        user_id: str,
        content_type: str,
        idempotency_key: str
    ) -> dict:
        """Generate presigned URL for avatar upload."""
        
    async def confirm_upload(
        self,
        user_id: str,
        object_key: str,
        current_version: int,
        idempotency_key: str
    ) -> dict:
        """Confirm avatar upload and update profile."""
        
    async def delete_avatar(
        self,
        user_id: str,
        current_version: int
    ) -> dict:
        """Delete avatar from profile and storage."""
```

**MinIO Configuration**:
- Bucket: `avatars`
- Object key pattern: `users/{user_id}/avatar-{uuid}.{ext}`
- Presigned URL expiry: 15 minutes
- Max file size: 2MB (validated on confirm)
- Allowed MIME types: image/jpeg, image/png, image/webp

**Dependencies**:
- MinIO client (presigned URL generation)
- UserRepository
- IdempotencyManager
- ETag utilities

**Error Handling**:
- 422 INVALID_CONTENT_TYPE: Unsupported image format
- 422 OBJECT_NOT_FOUND: Object not found in MinIO
- 422 FILE_TOO_LARGE: File exceeds 2MB limit
- 409 Conflict: Version mismatch

### 4. AccountErasureService

**Responsibility**: Handle KVKV-compliant account deletion

**Methods**:
```python
class AccountErasureService:
    async def delete_account(
        self,
        user_id: str,
        current_version: int,
        idempotency_key: str
    ) -> dict:
        """Soft delete account and enqueue erasure job."""
        
    async def enqueue_erasure_job(
        self,
        user_id: str
    ) -> str:
        """Create PII erasure background job."""
```

**Deletion Workflow**:
1. Set `deleted_at` timestamp
2. Set `erasure_requested = true`
3. Revoke all user tokens (add JTIs to Redis denylist)
4. Enqueue erasure job (Redis queue or MongoDB collection)
5. Return 202 Accepted with `erasure_job_id`

**PII Erasure Job** (Background):
- Mask email: `deleted_user_{user_id}@deleted.local`
- Clear: first_name, last_name, phone, addresses
- Delete: avatar from MinIO
- Retain: user_id, created_at, deleted_at (for audit)

**Dependencies**:
- UserRepository
- Redis (token revocation)
- Background job queue
- MinIO (avatar deletion)

**Error Handling**:
- 409 Conflict: Version mismatch
- 428 Precondition Required: Missing If-Match or Idempotency-Key

## Data Models

### User Document (MongoDB)

**Extended Fields**:
```python
{
    "_id": ObjectId,
    "email": str,
    "password_hash": str,
    "first_name": str,
    "last_name": str,
    "phone": str | None,
    "role": str,
    "email_verified": bool,
    "phone_verified": bool,
    
    # NEW FIELDS
    "pending_email": str | None,           # Email awaiting verification
    "avatar_url": str | None,              # MinIO object URL
    "deleted_at": datetime | None,         # Soft delete timestamp
    "erasure_requested": bool,             # KVKV erasure flag
    
    "addresses": list[dict],
    "default_address_id": str | None,
    "kvkk_consent": dict | None,
    "created_at": datetime,
    "last_login_at": datetime | None,
    "version": int                         # For ETag/optimistic locking
}
```

**Indexes**:
- Existing: `email` (unique), `phone` (unique, sparse)
- New: `deleted_at` (for cleanup queries), `erasure_requested` (for job processing)

### Pydantic Schemas

```python
class ProfileUpdate(BaseModel):
    """Profile update request."""
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)

class EmailChangeRequest(BaseModel):
    """Email change request."""
    new_email: EmailStr

class EmailChangeConfirm(BaseModel):
    """Email change confirmation."""
    token: str

class PasswordChange(BaseModel):
    """Password change request."""
    current_password: str
    new_password: str = Field(..., min_length=8)

class AvatarUploadUrlRequest(BaseModel):
    """Avatar upload URL request."""
    content_type: Literal["image/jpeg", "image/png", "image/webp"]

class AvatarUploadUrlResponse(BaseModel):
    """Avatar upload URL response."""
    upload_url: str
    object_key: str
    expires_at: datetime

class AvatarConfirmRequest(BaseModel):
    """Avatar upload confirmation."""
    object_key: str

class AccountDeletionResponse(BaseModel):
    """Account deletion response."""
    message: str
    erasure_job_id: str
    status: Literal["accepted"]
```

## Error Handling

### RFC 9457 Problem+JSON Format

All errors return RFC 9457 problem+json with traceId:

```json
{
  "type": "https://api.vorte.com.tr/errors/conflict",
  "title": "Resource Conflict",
  "status": 409,
  "detail": "Resource has been modified by another request",
  "instance": "/api/v1/users/me",
  "trace_id": "abc123",
  "details": {
    "current_version": 6,
    "requested_version": 5,
    "current_etag": "\"v6\"",
    "provided_etag": "\"v5\""
  }
}
```

### Error Codes by Operation

| Operation | Error Code | Status | Description |
|-----------|-----------|--------|-------------|
| All updates | PRECONDITION_REQUIRED | 428 | Missing If-Match header |
| All updates | CONFLICT | 409 | ETag version mismatch |
| All POST | PRECONDITION_REQUIRED | 428 | Missing Idempotency-Key |
| Profile update | VALIDATION_ERROR | 422 | Invalid first_name/last_name |
| Email change | EMAIL_ALREADY_EXISTS | 422 | Email taken by another user |
| Email confirm | INVALID_OR_EXPIRED_TOKEN | 422 | Token validation failed |
| Email confirm | NO_PENDING_EMAIL_CHANGE | 422 | No pending change |
| Password change | INVALID_CURRENT_PASSWORD | 422 | Current password incorrect |
| Password change | VALIDATION_ERROR | 422 | New password too weak |
| Avatar upload | INVALID_CONTENT_TYPE | 422 | Unsupported image format |
| Avatar confirm | OBJECT_NOT_FOUND | 422 | Object not in MinIO |
| Avatar confirm | FILE_TOO_LARGE | 422 | File exceeds 2MB |
| All operations | RATE_LIMIT_EXCEEDED | 429 | Rate limit hit |

## Security Considerations

### 1. Password Hashing

**Argon2id Parameters** (from existing `security.py`):
```python
# Production (via env)
ARGON2_TIME_COST=2
ARGON2_MEMORY_COST=131072  # 128MB
ARGON2_PARALLELISM=4

# Development (via env)
ARGON2_TIME_COST=2
ARGON2_MEMORY_COST=65536   # 64MB
ARGON2_PARALLELISM=2
```

**Implementation**:
- Extend existing `PasswordHasher` to read from env
- Use `ph.verify()` for current password validation
- Use `ph.hash()` for new password

### 2. Token Security

**Email Verification Token**:
- JWT signed with `JWT_SECRET`
- Claims: {sub, email, type: "email_verification", exp}
- Expiry: 1 hour
- Single-use: Delete from Redis after confirmation

**Token Revocation** (Account Deletion):
- Add all user JTIs to Redis denylist
- TTL = remaining token lifetime
- Middleware checks denylist on each request

### 3. MinIO Security

**Presigned URL**:
- PUT-only (no GET/DELETE)
- 15-minute expiry
- Object key includes user_id (prevents cross-user uploads)

**CORS Configuration**:
```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>https://vorte.com.tr</AllowedOrigin>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedHeader>Content-Type</AllowedHeader>
    <AllowedHeader>Content-Length</AllowedHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

**Bucket Policy**:
- Private bucket (no public read)
- Application has full access via credentials
- Clients use presigned URLs only

### 4. Rate Limiting

**Limits** (per user):
- Password change: 3 requests / 10 minutes
- Avatar upload URL: 5 requests / 10 minutes
- Email change request: 3 requests / 1 hour

**Implementation**:
- Redis-based sliding window
- Key pattern: `ratelimit:{operation}:{user_id}`
- Return 429 with Retry-After header

### 5. PII Protection

**Logging**:
- Use existing `UserRepository.mask_email()` and `mask_phone()`
- Never log passwords (plain or hashed)
- Mask tokens in logs

**KVKV Compliance**:
- Soft delete with `deleted_at`
- PII erasure within 30 days (configurable)
- Audit trail: retain user_id, created_at, deleted_at

## Testing Strategy

### Unit Tests

**ProfileService**:
- ✓ Update profile with valid data
- ✓ Update profile with version mismatch → ConflictError
- ✓ Update profile with invalid data → ValidationError

**EmailVerificationService**:
- ✓ Request email change with new email
- ✓ Request email change with existing email → ValidationError
- ✓ Confirm with valid token
- ✓ Confirm with expired token → ValidationError
- ✓ Confirm with no pending change → ValidationError

**AvatarService**:
- ✓ Generate upload URL with valid content type
- ✓ Generate upload URL with invalid content type → ValidationError
- ✓ Confirm upload with valid object
- ✓ Confirm upload with missing object → ValidationError
- ✓ Confirm upload with oversized file → ValidationError
- ✓ Delete avatar

**AccountErasureService**:
- ✓ Delete account and enqueue job
- ✓ Verify tokens revoked
- ✓ Idempotent deletion

### Integration Tests

**Profile Update Flow**:
1. GET /api/v1/users/me → 200 + ETag
2. PATCH without If-Match → 428
3. PATCH with old ETag → 409
4. PATCH with current ETag → 200 + new ETag

**Email Change Flow**:
1. POST /api/v1/users/me/email-change → 202
2. Verify email sent
3. POST /api/v1/users/me/email-change/confirm with token → 200
4. Verify email updated

**Avatar Upload Flow**:
1. POST /api/v1/users/me/avatar/upload-url → 200 + presigned URL
2. PUT to presigned URL (mock MinIO)
3. POST /api/v1/users/me/avatar/confirm → 200
4. Verify avatar_url set

**Password Change Flow**:
1. POST /api/v1/users/me/password with wrong current → 422
2. POST /api/v1/users/me/password with correct current → 200
3. Login with new password → success

**Account Deletion Flow**:
1. DELETE /api/v1/users/me → 202 + erasure_job_id
2. Verify deleted_at set
3. Verify tokens revoked (401 on next request)

### E2E Tests

**Rate Limiting**:
- Send 4 password change requests → 4th returns 429

**Idempotency**:
- Send same email change request twice → same response, no duplicate emails

**Concurrency**:
- Two clients update profile simultaneously → one gets 409

## Observability

### Prometheus Metrics

```python
# Profile operations
profile_updates_total{result="success|conflict|precondition_failed|validation_error"}
profile_get_total{result="success|not_found"}

# Email operations
email_change_requests_total{result="success|email_exists|validation_error"}
email_change_confirmations_total{result="success|invalid_token|no_pending"}

# Password operations
password_change_total{result="success|invalid_current|validation_error"}

# Avatar operations
avatar_upload_url_total{result="success|invalid_type"}
avatar_confirm_total{result="success|not_found|too_large|conflict"}
avatar_delete_total{result="success"}

# Account operations
account_erasure_total{result="success|conflict"}

# Concurrency control
etag_conflicts_total{endpoint="/api/v1/users/me|/api/v1/users/me/avatar"}
etag_precondition_failed_total{endpoint}

# Rate limiting
rate_limit_exceeded_total{operation="password_change|avatar_upload|email_change"}
```

### Distributed Tracing

**Trace Attributes**:
- `user.id`: User ID
- `user.email`: Masked email
- `operation`: profile_update, email_change, etc.
- `version.current`: Current resource version
- `version.requested`: Requested version (if conflict)
- `idempotency.key`: Idempotency key (hashed)
- `error.code`: Error code (if failed)

**Trace Events**:
- `profile.updated`: Profile fields changed
- `email.verification_sent`: Verification email sent
- `email.confirmed`: Email change confirmed
- `password.changed`: Password updated
- `avatar.uploaded`: Avatar confirmed
- `account.deleted`: Account marked for deletion
- `tokens.revoked`: User tokens revoked

### Logging

**Structured Logs**:
```json
{
  "timestamp": "2024-10-24T10:30:00Z",
  "level": "INFO",
  "trace_id": "abc123",
  "user_id": "507f1f77bcf86cd799439011",
  "email": "jo***@ex***.com",
  "operation": "profile_update",
  "result": "success",
  "version": 6,
  "fields_updated": ["first_name"]
}
```

**Log Levels**:
- INFO: Successful operations
- WARN: Rate limit exceeded, validation errors
- ERROR: Unexpected errors (MinIO failures, DB errors)

## Deployment Considerations

### Environment Variables

**New Variables**:
```bash
# Argon2 (production)
ARGON2_TIME_COST=2
ARGON2_MEMORY_COST=131072
ARGON2_PARALLELISM=4

# MinIO
AVATAR_BUCKET=avatars
AVATAR_MAX_SIZE_BYTES=2097152
AVATAR_PRESIGNED_URL_EXPIRY_SECONDS=900

# Email
EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS=1

# Rate Limiting
RATE_LIMIT_PASSWORD_CHANGE_PER_10MIN=3
RATE_LIMIT_AVATAR_UPLOAD_PER_10MIN=5
RATE_LIMIT_EMAIL_CHANGE_PER_HOUR=3

# KVKV
PII_ERASURE_RETENTION_DAYS=30
```

### MinIO Setup

**Bucket Creation**:
```bash
mc mb minio/avatars
mc anonymous set none minio/avatars
```

**CORS Configuration**:
```bash
mc admin config set minio cors \
  allowed_origins="https://vorte.com.tr" \
  allowed_methods="PUT" \
  allowed_headers="Content-Type,Content-Length"
```

### Database Migration

**Add Indexes**:
```python
await db.users.create_index("deleted_at")
await db.users.create_index("erasure_requested")
```

**Add Fields** (no migration needed, fields are optional):
- `pending_email`: null by default
- `avatar_url`: null by default
- `deleted_at`: null by default
- `erasure_requested`: false by default

### Background Jobs

**PII Erasure Job**:
- Cron: Daily at 03:00 UTC
- Query: `{erasure_requested: true, deleted_at: {$lt: now - 30 days}}`
- Action: Mask PII, delete avatar, set `erasure_requested: false`

**Cleanup Job**:
- Cron: Weekly
- Query: `{deleted_at: {$lt: now - 90 days}}`
- Action: Hard delete user documents (after PII erasure)

## API Reference

### Endpoints Summary

| Method | Endpoint | Auth | If-Match | Idempotency-Key | Description |
|--------|----------|------|----------|-----------------|-------------|
| GET | /api/v1/users/me | ✓ | - | - | Get profile |
| PATCH | /api/v1/users/me | ✓ | ✓ | - | Update profile |
| POST | /api/v1/users/me/email-change | ✓ | - | ✓ | Request email change |
| POST | /api/v1/users/me/email-change/confirm | ✓ | - | - | Confirm email change |
| POST | /api/v1/users/me/password | ✓ | - | ✓ | Change password |
| POST | /api/v1/users/me/avatar/upload-url | ✓ | - | ✓ | Get avatar upload URL |
| POST | /api/v1/users/me/avatar/confirm | ✓ | ✓ | ✓ | Confirm avatar upload |
| DELETE | /api/v1/users/me/avatar | ✓ | ✓ | - | Delete avatar |
| DELETE | /api/v1/users/me | ✓ | ✓ | ✓ | Delete account |

### OpenAPI Specification (Excerpt)

```yaml
paths:
  /api/v1/users/me:
    get:
      summary: Get user profile
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Profile retrieved
          headers:
            ETag:
              schema:
                type: string
              description: Resource version (e.g., "v5")
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserProfile'
        '401':
          $ref: '#/components/responses/Unauthorized'
    
    patch:
      summary: Update user profile
      security:
        - bearerAuth: []
      parameters:
        - name: If-Match
          in: header
          required: true
          schema:
            type: string
          description: Current ETag (e.g., "v5")
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProfileUpdate'
      responses:
        '200':
          description: Profile updated
          headers:
            ETag:
              schema:
                type: string
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserProfile'
        '409':
          $ref: '#/components/responses/Conflict'
        '428':
          $ref: '#/components/responses/PreconditionRequired'
    
    delete:
      summary: Delete user account (KVKV compliant)
      security:
        - bearerAuth: []
      parameters:
        - name: If-Match
          in: header
          required: true
          schema:
            type: string
        - name: Idempotency-Key
          in: header
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '202':
          description: Account deletion accepted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AccountDeletionResponse'
        '409':
          $ref: '#/components/responses/Conflict'
        '428':
          $ref: '#/components/responses/PreconditionRequired'

  /api/v1/users/me/avatar/upload-url:
    post:
      summary: Get presigned URL for avatar upload
      security:
        - bearerAuth: []
      parameters:
        - name: Idempotency-Key
          in: header
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AvatarUploadUrlRequest'
      responses:
        '200':
          description: Presigned URL generated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AvatarUploadUrlResponse'
        '422':
          $ref: '#/components/responses/ValidationError'
        '428':
          $ref: '#/components/responses/PreconditionRequired'
```

## Design Decisions and Rationale

### 1. Why Presigned URLs for Avatar Upload?

**Decision**: Use MinIO presigned PUT URLs instead of uploading through API

**Rationale**:
- Reduces API server load (no file proxying)
- Scales better (direct client-to-storage)
- Faster uploads (no intermediate hop)
- Existing MinIO infrastructure

**Trade-offs**:
- Two-step process (get URL, then upload)
- Requires CORS configuration
- Client must handle presigned URL expiry

### 2. Why Two-Step Email Change?

**Decision**: Require email verification before changing email

**Rationale**:
- Prevents account takeover (attacker can't change email without access to new inbox)
- Confirms new email is valid and accessible
- Industry standard (Gmail, GitHub, etc.)

**Trade-offs**:
- More complex flow
- Requires email service
- User must check email

### 3. Why Soft Delete for Accounts?

**Decision**: Set `deleted_at` instead of immediate hard delete

**Rationale**:
- KVKV compliance (30-day retention for legal requests)
- Allows account recovery window
- Audit trail for compliance
- Prevents accidental deletions

**Trade-offs**:
- Requires background job for PII erasure
- Deleted users still in database (filtered by `deleted_at`)

### 4. Why Idempotency for All POST Operations?

**Decision**: Require Idempotency-Key for all state-changing POST requests

**Rationale**:
- Safe retries on network failures
- Prevents duplicate operations (e.g., multiple password changes)
- Industry best practice (Stripe, AWS)
- Existing infrastructure (IdempotencyManager)

**Trade-offs**:
- Clients must generate UUIDs
- Redis storage for 24 hours
- Slightly more complex client code

### 5. Why ETag for All Updates?

**Decision**: Require If-Match header for all PATCH/DELETE operations

**Rationale**:
- Prevents lost updates (concurrent modifications)
- Explicit conflict detection
- RESTful best practice (RFC 9110)
- Existing infrastructure (ETag utilities)

**Trade-offs**:
- Clients must track ETags
- Two requests for update (GET for ETag, then PATCH)
- 409 errors require client retry logic

## Future Enhancements

### Phase 2 Features

1. **Profile Picture Cropping**
   - Client-side crop before upload
   - Multiple sizes (thumbnail, medium, large)
   - WebP conversion for smaller files

2. **Email Verification for Existing Email**
   - Require re-verification on suspicious activity
   - Periodic verification reminders

3. **Two-Factor Authentication**
   - TOTP (Google Authenticator)
   - SMS backup codes
   - Recovery codes

4. **Account Recovery**
   - Undelete within 30 days
   - Email confirmation required

5. **Profile Visibility Settings**
   - Public/private profile
   - Control what others can see

### Technical Improvements

1. **Avatar Processing Pipeline**
   - Async image processing (resize, optimize)
   - Virus scanning
   - EXIF data stripping

2. **Advanced Rate Limiting**
   - Per-endpoint limits
   - Burst allowance
   - Adaptive limits based on user behavior

3. **Audit Log**
   - Detailed change history
   - IP address tracking
   - User-agent logging

4. **Webhooks**
   - Notify external systems on profile changes
   - Account deletion webhooks for integrations

## Conclusion

This design leverages existing infrastructure (ETag, Idempotency, MinIO, Argon2id) to provide a production-ready, secure, and KVKV-compliant user profile management system. The architecture follows RESTful best practices, includes comprehensive error handling, and provides observability through metrics and tracing.

The two-step email change and avatar upload flows ensure security and scalability, while the soft delete mechanism with PII erasure ensures KVKV compliance. All operations are idempotent and use optimistic locking to prevent data loss.

The design is ready for implementation with clear component boundaries, well-defined interfaces, and comprehensive test coverage.
