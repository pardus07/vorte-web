# Implementation Plan: User Profile Management

## Task Overview

This implementation plan breaks down the User Profile Management feature into discrete, actionable coding tasks. Each task builds incrementally on previous work and references specific requirements from the requirements document.

---

## Tasks

- [x] 1. Extend User Repository with Profile Management Fields



  - Add methods to UserRepository for updating pending_email, avatar_url, deleted_at, erasure_requested fields
  - Implement version-safe update helper that increments version and validates current version
  - Add database indexes for deleted_at and erasure_requested fields
  - _Requirements: 1.1, 2.1, 2.3, 3.2, 6.2, 9.3_

- [x] 2. Create Pydantic Schemas for Profile Operations



  - Define ProfileUpdate schema with first_name and last_name validation (1-100 chars)
  - Define EmailChangeRequest and EmailChangeConfirm schemas
  - Define PasswordChange schema with current_password and new_password (min 8 chars)
  - Define AvatarUploadUrlRequest, AvatarUploadUrlResponse, and AvatarConfirmRequest schemas
  - Define AccountDeletionResponse schema with erasure_job_id
  - _Requirements: 2.4, 3.2, 5.4, 6.2, 6.3, 9.3_

- [x] 3. Implement ProfileService for Profile Updates



  - [x] 3.1 Create ProfileService class with get_profile method


    - Fetch user by ID from UserRepository
    - Return profile dict with version for ETag generation
    - _Requirements: 1.1, 1.3_
  
  - [x] 3.2 Implement update_profile method with optimistic locking


    - Validate If-Match header using existing ETag utilities
    - Update first_name and/or last_name fields
    - Use version-safe update from UserRepository
    - Return updated profile with new version
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Implement EmailVerificationService for Email Changes



  - [x] 4.1 Create EmailVerificationService class with request_email_change method


    - Validate new_email format and check if already exists
    - Generate JWT verification token with 1-hour expiry
    - Store token in Redis with key pattern: email_verify:{user_id}
    - Update user.pending_email field
    - Send verification email using existing email service
    - Return 202 Accepted response
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 4.2 Implement confirm_email_change method


    - Validate token from Redis
    - Check user has pending_email
    - Move pending_email to email field
    - Clear pending_email
    - Increment version
    - Delete token from Redis (single-use)
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. Extend Security Module for Password Changes



  - [x] 5.1 Update Argon2 configuration to read from environment variables


    - Add ARGON2_TIME_COST, ARGON2_MEMORY_COST, ARGON2_PARALLELISM to config.py
    - Modify PasswordHasher initialization to use env-based parameters
    - Use production params (128MB/2/4) or dev params (64MB/2/2) based on ENVIRONMENT
    - _Requirements: 5.5, 5.6_
  
  - [x] 5.2 Create PasswordService with change_password method


    - Verify current_password using existing verify_password function
    - Validate new_password meets requirements (min 8 chars)
    - Hash new_password with environment-specific Argon2 params
    - Update user.password_hash with version increment
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7_

- [x] 6. Implement AvatarService for MinIO Integration



  - [x] 6.1 Create MinIO client wrapper with presigned URL generation


    - Initialize MinIO client from config (MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY)
    - Implement generate_presigned_put_url method with 15-minute expiry
    - Implement check_object_exists and get_object_size methods
    - Implement delete_object method (best-effort)
    - _Requirements: 6.2, 6.3, 7.3, 8.2_
  
  - [x] 6.2 Create AvatarService class with get_upload_url method

    - Validate content_type (image/jpeg, image/png, image/webp)
    - Generate unique object key: users/{user_id}/avatar-{uuid}.{ext}
    - Create presigned PUT URL via MinIO client
    - Return upload_url, object_key, expires_at
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 6.3 Implement confirm_upload method with size validation


    - Validate If-Match header for version control
    - Check object exists in MinIO
    - Verify object size ≤ 2MB (AVATAR_MAX_SIZE_BYTES)
    - If oversized, delete object and return 422 FILE_TOO_LARGE
    - Update user.avatar_url with MinIO object URL
    - Increment version
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [x] 6.4 Implement delete_avatar method


    - Validate If-Match header
    - Clear user.avatar_url field
    - Attempt to delete object from MinIO (best-effort, ignore errors)
    - Increment version
    - Return 200 even if no avatar exists
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 7. Implement AccountErasureService for KVKV Compliance



  - [x] 7.1 Create AccountErasureService class with delete_account method


    - Validate If-Match header for version control
    - Set user.deleted_at to current timestamp
    - Set user.erasure_requested to true
    - Increment version
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [x] 7.2 Implement token revocation for deleted accounts


    - Fetch all active JTIs for user (from JWT claims or session store)
    - Add each JTI to Redis denylist with TTL = remaining token lifetime
    - Use existing revoke_token function from security.py
    - Ensure tokens invalidated within 60 seconds
    - _Requirements: 9.5_
  
  - [x] 7.3 Implement enqueue_erasure_job method


    - Generate unique erasure_job_id (UUID)
    - Create job document in MongoDB erasure_jobs collection or Redis queue
    - Job payload: {user_id, created_at, status: "pending"}
    - Return erasure_job_id for 202 response
    - _Requirements: 9.3, 9.6_

- [x] 8. Create API Router for Profile Endpoints





  - [x] 8.1 Implement GET /api/v1/users/me endpoint

    - Require JWT authentication
    - Call ProfileService.get_profile()
    - Set ETag header using generate_etag(version)
    - Return 200 with profile data
    - _Requirements: 1.1, 1.2, 1.3_
  

  - [x] 8.2 Implement PATCH /api/v1/users/me endpoint

    - Require JWT authentication
    - Require If-Match header (validate with validate_if_match)
    - Parse ProfileUpdate from request body
    - Call ProfileService.update_profile()
    - Set ETag header with new version
    - Return 200 with updated profile
    - Handle 428 Precondition Required and 409 Conflict errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  

  - [x] 8.3 Implement POST /api/v1/users/me/email-change endpoint

    - Require JWT authentication
    - Require Idempotency-Key header
    - Parse EmailChangeRequest from request body
    - Call EmailVerificationService.request_email_change()
    - Return 202 Accepted
    - Handle 422 EMAIL_ALREADY_EXISTS error
    - _Requirements: 3.1, 3.2, 3.3, 3.4_


  

  - [x] 8.4 Implement POST /api/v1/users/me/email-change/confirm endpoint

    - Require JWT authentication
    - Parse EmailChangeConfirm from request body
    - Call EmailVerificationService.confirm_email_change()
    - Set ETag header with new version
    - Return 200 with updated profile
    - Handle 422 INVALID_OR_EXPIRED_TOKEN and NO_PENDING_EMAIL_CHANGE errors
    - _Requirements: 4.1, 4.2, 4.3_

  



  - [x] 8.5 Implement POST /api/v1/users/me/password endpoint

    - Require JWT authentication
    - Require Idempotency-Key header
    - Parse PasswordChange from request body
    - Call PasswordService.change_password()
    - Return 200 with success message
    - Handle 422 INVALID_CURRENT_PASSWORD and VALIDATION_ERROR errors
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7_


  



  - [x] 8.6 Implement POST /api/v1/users/me/avatar/upload-url endpoint

    - Require JWT authentication
    - Require Idempotency-Key header
    - Parse AvatarUploadUrlRequest from request body
    - Call AvatarService.get_upload_url()
    - Return 200 with AvatarUploadUrlResponse
    - Handle 422 INVALID_CONTENT_TYPE error

    - _Requirements: 6.1, 6.2, 6.3, 6.5_




  

  - [x] 8.7 Implement POST /api/v1/users/me/avatar/confirm endpoint

    - Require JWT authentication
    - Require If-Match and Idempotency-Key headers
    - Parse AvatarConfirmRequest from request body
    - Call AvatarService.confirm_upload()
    - Set ETag header with new version
    - Return 200 with updated profile

    - Handle 422 OBJECT_NOT_FOUND, FILE_TOO_LARGE, and 409 Conflict errors




    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  

  - [x] 8.8 Implement DELETE /api/v1/users/me/avatar endpoint

    - Require JWT authentication
    - Require If-Match header
    - Call AvatarService.delete_avatar()
    - Set ETag header with new version
    - Return 200 with updated profile



    - Handle 409 Conflict error



    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  

  - [x] 8.9 Implement DELETE /api/v1/users/me endpoint

    - Require JWT authentication
    - Require If-Match and Idempotency-Key headers
    - Call AccountErasureService.delete_account()
    - Return 202 Accepted with AccountDeletionResponse
    - Handle 409 Conflict error
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6_

- [x] 9. Implement Rate Limiting for Sensitive Operations



  - Create rate limiter decorator using Redis sliding window
  - Apply rate limits: password change (3/10min), avatar upload (5/10min), email change (3/hour)
  - Return 429 Too Many Requests with Retry-After header when exceeded
  - Add rate_limit_exceeded_total metric with operation label
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 10. Add Prometheus Metrics for Profile Operations


  - Implement metrics: profile_updates_total, email_change_requests_total, email_change_confirmations_total
  - Implement metrics: password_change_total, avatar_upload_url_total, avatar_confirm_total, avatar_delete_total
  - Implement metrics: account_erasure_total, etag_conflicts_total, etag_precondition_failed_total
  - Add result labels: success, conflict, precondition_failed, validation_error, etc.
  - Emit metrics in service methods and error handlers
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 11. Add Distributed Tracing Attributes



  - Add trace attributes: user.id, user.email (masked), operation, version.current, version.requested
  - Add trace attributes: idempotency.key (hashed), error.code
  - Add trace events: profile.updated, email.verification_sent, email.confirmed, password.changed
  - Add trace events: avatar.uploaded, account.deleted, tokens.revoked
  - _Requirements: 11.7_

- [x] 12. Configure MinIO Bucket and CORS


  - Create avatars bucket in MinIO (mc mb minio/avatars)
  - Set bucket policy to private (mc anonymous set none minio/avatars)
  - Configure CORS to allow PUT from web origin with Content-Type and Content-Length headers
  - Add AVATAR_BUCKET, AVATAR_MAX_SIZE_BYTES, AVATAR_PRESIGNED_URL_EXPIRY_SECONDS to config
  - _Requirements: 6.2, 6.3, 7.5_



- [x] 13. Create Background Job for PII Erasure



  - Create erasure job processor that queries users with erasure_requested=true and deleted_at < 30 days ago
  - Mask email to deleted_user_{user_id}@deleted.local
  - Clear first_name, last_name, phone, addresses, pending_email fields
  - Delete avatar from MinIO if avatar_url exists
  - Set erasure_requested=false after completion
  - Log erasure completion with user_id and timestamp
  - _Requirements: 9.3_

- [x] 14. Write Integration Tests for Profile Endpoints









  - Test GET /api/v1/users/me returns profile with ETag
  - Test PATCH /api/v1/users/me without If-Match returns 428
  - Test PATCH /api/v1/users/me with old ETag returns 409
  - Test PATCH /api/v1/users/me with current ETag updates profile and returns new ETag
  - Test POST /api/v1/users/me/email-change sends verification email and returns 202
  - Test POST /api/v1/users/me/email-change with existing email returns 422
  - Test POST /api/v1/users/me/email-change/confirm with valid token updates email
  - Test POST /api/v1/users/me/email-change/confirm with expired token returns 422
  - Test POST /api/v1/users/me/password with wrong current password returns 422
  - Test POST /api/v1/users/me/password with correct current password updates hash
  - Test POST /api/v1/users/me/avatar/upload-url returns presigned URL
  - Test POST /api/v1/users/me/avatar/confirm with valid object updates avatar_url
  - Test POST /api/v1/users/me/avatar/confirm with oversized file returns 422
  - Test DELETE /api/v1/users/me/avatar clears avatar_url
  - Test DELETE /api/v1/users/me sets deleted_at and revokes tokens
  - _Requirements: All_

- [x] 15. Write Unit Tests for Service Layer


  - Test ProfileService.update_profile with version mismatch raises ConflictError
  - Test EmailVerificationService.request_email_change with existing email raises ValidationError
  - Test EmailVerificationService.confirm_email_change with invalid token raises ValidationError
  - Test PasswordService.change_password with wrong current password raises ValidationError
  - Test AvatarService.get_upload_url with invalid content type raises ValidationError
  - Test AvatarService.confirm_upload with missing object raises ValidationError
  - Test AvatarService.confirm_upload with oversized file raises ValidationError
  - Test AccountErasureService.delete_account enqueues erasure job
  - _Requirements: All_

- [x] 16. Test Rate Limiting Behavior


  - Send 4 password change requests within 10 minutes, verify 4th returns 429
  - Send 6 avatar upload URL requests within 10 minutes, verify 6th returns 429
  - Send 4 email change requests within 1 hour, verify 4th returns 429
  - Verify Retry-After header is present in 429 responses
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 17. Test Idempotency Behavior


  - Send same email change request twice with same Idempotency-Key, verify same response
  - Send same password change request twice with same Idempotency-Key, verify password only changed once
  - Send same avatar upload URL request twice with same Idempotency-Key, verify same presigned URL
  - Send same account deletion request twice with same Idempotency-Key, verify same erasure_job_id
  - _Requirements: 3.4, 5.7, 6.5, 9.6_

- [x] 18. Test Concurrency Control


  - Simulate two clients updating profile simultaneously with same ETag, verify one gets 409
  - Simulate two clients confirming avatar upload simultaneously, verify one gets 409
  - Simulate two clients deleting avatar simultaneously, verify one gets 409
  - _Requirements: 2.2, 7.6, 8.3_

---

## Notes

- All tasks reference specific requirements from requirements.md for traceability
- Each task builds incrementally on previous tasks
- Services should use existing infrastructure: ETag utilities, IdempotencyManager, Redis, MinIO
- All errors should return RFC 9457 problem+json format with traceId
- All operations should emit Prometheus metrics and distributed tracing events
