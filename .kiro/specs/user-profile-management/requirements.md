# Requirements Document

## Introduction

The User Profile Management feature enables authenticated users to manage their personal information, including profile details, email address, password, avatar image, and account lifecycle. The system ensures data integrity through optimistic concurrency control (ETag/If-Match), idempotency guarantees for state-changing operations, and KVKV compliance for account deletion with PII erasure.

## Glossary

- **Profile System**: The backend service responsible for managing user profile data
- **Avatar Service**: The component handling avatar image uploads via MinIO presigned URLs
- **Email Verification System**: The subsystem managing email change verification workflows
- **Account Erasure Service**: The component handling KVKV-compliant account deletion and PII erasure
- **Idempotency Manager**: The middleware ensuring duplicate requests produce identical results
- **Concurrency Controller**: The component enforcing optimistic locking via ETag/If-Match headers
- **MinIO Storage**: The object storage service for avatar images
- **Authenticated User**: A user with a valid JWT access token

## Requirements

### Requirement 1: Profile Information Retrieval

**User Story:** As an authenticated user, I want to retrieve my current profile information, so that I can view my account details and use the version token for updates.

#### Acceptance Criteria

1. WHEN an authenticated user sends a GET request to `/api/v1/users/me`, THE Profile System SHALL return HTTP 200 with the user profile data and an ETag header containing the version token.

2. IF the request lacks a valid authentication token, THEN THE Profile System SHALL return HTTP 401 with RFC 9457 problem+json response including a traceId.

3. THE Profile System SHALL include the following fields in the response: user_id, email, first_name, last_name, avatar_url, created_at, updated_at.

### Requirement 2: Profile Information Update

**User Story:** As an authenticated user, I want to update my profile information (first name, last name), so that my account reflects my current personal details.

#### Acceptance Criteria

1. WHEN an authenticated user sends a PATCH request to `/api/v1/users/me` without an If-Match header, THE Profile System SHALL return HTTP 428 Precondition Required with RFC 9457 problem+json response.

2. WHEN an authenticated user sends a PATCH request with an If-Match header that does not match the current ETag, THE Profile System SHALL return HTTP 409 Conflict with RFC 9457 problem+json response including the current ETag.

3. WHEN an authenticated user sends a PATCH request with a valid If-Match header and valid first_name or last_name fields, THE Profile System SHALL update the user record, increment the version, and return HTTP 200 with the updated profile and new ETag header.

4. THE Profile System SHALL validate that first_name and last_name contain between 1 and 100 characters and return HTTP 422 if validation fails.

### Requirement 3: Email Address Change Request

**User Story:** As an authenticated user, I want to change my email address with verification, so that I can maintain control over my account with a valid email.

#### Acceptance Criteria

1. WHEN an authenticated user sends a POST request to `/api/v1/users/me/email-change` without an Idempotency-Key header, THE Profile System SHALL return HTTP 428 Precondition Required with RFC 9457 problem+json response.

2. WHEN an authenticated user sends a POST request with a valid Idempotency-Key and new_email, THE Email Verification System SHALL validate the email format, store it in pending_email field, generate a verification token, send a verification email, and return HTTP 202 Accepted.

3. IF the new_email is already registered to another user, THEN THE Email Verification System SHALL return HTTP 422 with error code EMAIL_ALREADY_EXISTS.

4. WHEN the same Idempotency-Key is used within 24 hours, THE Email Verification System SHALL return the same response without sending duplicate emails.

5. THE Email Verification System SHALL generate verification tokens that expire after 1 hour.

### Requirement 4: Email Address Change Confirmation

**User Story:** As an authenticated user, I want to confirm my email change using the verification token, so that my new email address becomes active.

#### Acceptance Criteria

1. WHEN an authenticated user sends a POST request to `/api/v1/users/me/email-change/confirm` with a valid token, THE Email Verification System SHALL move pending_email to email field, clear pending_email, increment version, and return HTTP 200 with updated profile.

2. IF the token is invalid or expired, THEN THE Email Verification System SHALL return HTTP 422 with error code INVALID_OR_EXPIRED_TOKEN.

3. IF the user has no pending_email, THEN THE Email Verification System SHALL return HTTP 422 with error code NO_PENDING_EMAIL_CHANGE.

### Requirement 5: Password Change

**User Story:** As an authenticated user, I want to change my password securely, so that I can maintain account security.

#### Acceptance Criteria

1. WHEN an authenticated user sends a POST request to `/api/v1/users/me/password` without an Idempotency-Key header, THE Profile System SHALL return HTTP 428 Precondition Required.

2. WHEN an authenticated user sends a POST request with valid Idempotency-Key, current_password, and new_password, THE Profile System SHALL verify the current password using Argon2id, hash the new password with Argon2id parameters from environment configuration, update the user record, and return HTTP 200.

3. IF the current_password does not match the stored hash, THEN THE Profile System SHALL return HTTP 422 with error code INVALID_CURRENT_PASSWORD.

4. THE Profile System SHALL validate that new_password contains at least 8 characters and return HTTP 422 if validation fails.

5. WHERE the environment is production, THE Profile System SHALL use Argon2id parameters: memory_cost=128MB, time_cost=2, parallelism=4.

6. WHERE the environment is development, THE Profile System SHALL use Argon2id parameters: memory_cost=64MB, time_cost=2, parallelism=2.

7. WHEN the same Idempotency-Key is used within 24 hours, THE Profile System SHALL return HTTP 200 without re-hashing the password.

### Requirement 6: Avatar Upload URL Generation

**User Story:** As an authenticated user, I want to receive a presigned URL to upload my avatar image, so that I can upload directly to object storage securely.

#### Acceptance Criteria

1. WHEN an authenticated user sends a POST request to `/api/v1/users/me/avatar/upload-url` without an Idempotency-Key header, THE Avatar Service SHALL return HTTP 428 Precondition Required.

2. WHEN an authenticated user sends a POST request with a valid Idempotency-Key and content_type (image/jpeg, image/png, or image/webp), THE Avatar Service SHALL generate a unique object key, create a MinIO presigned PUT URL valid for 15 minutes, and return HTTP 200 with upload_url, object_key, and expires_at fields.

3. IF the content_type is not image/jpeg, image/png, or image/webp, THEN THE Avatar Service SHALL return HTTP 422 with error code INVALID_CONTENT_TYPE.

4. THE Avatar Service SHALL generate object keys in the format: `users/{user_id}/avatar-{uuid}.{extension}`.

5. WHEN the same Idempotency-Key is used within 24 hours, THE Avatar Service SHALL return the same presigned URL response.

### Requirement 7: Avatar Upload Confirmation

**User Story:** As an authenticated user, I want to confirm my avatar upload after uploading to the presigned URL, so that my profile displays the new avatar.

#### Acceptance Criteria

1. WHEN an authenticated user sends a POST request to `/api/v1/users/me/avatar/confirm` without an If-Match header, THE Avatar Service SHALL return HTTP 428 Precondition Required.

2. WHEN an authenticated user sends a POST request without an Idempotency-Key header, THE Avatar Service SHALL return HTTP 428 Precondition Required.

3. WHEN an authenticated user sends a POST request with valid If-Match, Idempotency-Key, and object_key, THE Avatar Service SHALL verify the object exists in MinIO, verify the object size is less than or equal to 2MB, update the user avatar_url field, increment version, and return HTTP 200 with updated profile and new ETag.

4. IF the object does not exist in MinIO, THEN THE Avatar Service SHALL return HTTP 422 with error code OBJECT_NOT_FOUND.

5. IF the object size exceeds 2MB, THEN THE Avatar Service SHALL delete the object from MinIO and return HTTP 422 with error code FILE_TOO_LARGE.

6. IF the If-Match header does not match the current ETag, THEN THE Avatar Service SHALL return HTTP 409 Conflict.

### Requirement 8: Avatar Deletion

**User Story:** As an authenticated user, I want to delete my avatar image, so that my profile no longer displays an avatar.

#### Acceptance Criteria

1. WHEN an authenticated user sends a DELETE request to `/api/v1/users/me/avatar` without an If-Match header, THE Avatar Service SHALL return HTTP 428 Precondition Required.

2. WHEN an authenticated user sends a DELETE request with a valid If-Match header, THE Avatar Service SHALL clear the avatar_url field, attempt to delete the object from MinIO (best-effort), increment version, and return HTTP 200 with updated profile and new ETag.

3. IF the If-Match header does not match the current ETag, THEN THE Avatar Service SHALL return HTTP 409 Conflict.

4. IF the user has no avatar_url, THEN THE Avatar Service SHALL return HTTP 200 without making changes.

### Requirement 9: Account Deletion

**User Story:** As an authenticated user, I want to delete my account in compliance with KVKV regulations, so that my personal data is erased according to legal requirements.

#### Acceptance Criteria

1. WHEN an authenticated user sends a DELETE request to `/api/v1/users/me` without an If-Match header, THE Account Erasure Service SHALL return HTTP 428 Precondition Required.

2. WHEN an authenticated user sends a DELETE request without an Idempotency-Key header, THE Account Erasure Service SHALL return HTTP 428 Precondition Required.

3. WHEN an authenticated user sends a DELETE request with valid If-Match and Idempotency-Key headers, THE Account Erasure Service SHALL set deleted_at to current timestamp, set erasure_requested to true, revoke all user tokens, enqueue a PII erasure job, and return HTTP 202 Accepted with erasure_job_id.

4. IF the If-Match header does not match the current ETag, THEN THE Account Erasure Service SHALL return HTTP 409 Conflict.

5. THE Account Erasure Service SHALL invalidate all active sessions for the user within 60 seconds of account deletion.

6. WHEN the same Idempotency-Key is used within 24 hours, THE Account Erasure Service SHALL return HTTP 202 with the same erasure_job_id without creating duplicate jobs.

### Requirement 10: Rate Limiting

**User Story:** As a system administrator, I want rate limits on sensitive operations, so that the system is protected from abuse.

#### Acceptance Criteria

1. THE Profile System SHALL limit password change requests to 3 requests per 10 minutes per user and return HTTP 429 when exceeded.

2. THE Avatar Service SHALL limit avatar upload URL requests to 5 requests per 10 minutes per user and return HTTP 429 when exceeded.

3. THE Email Verification System SHALL limit email change requests to 3 requests per hour per user and return HTTP 429 when exceeded.

### Requirement 11: Observability

**User Story:** As a system operator, I want metrics and traces for profile operations, so that I can monitor system health and debug issues.

#### Acceptance Criteria

1. THE Profile System SHALL emit Prometheus metrics for profile_updates_total with labels: result (success, conflict, precondition_failed, validation_error).

2. THE Email Verification System SHALL emit metrics for email_change_requests_total and email_change_confirmations_total with result labels.

3. THE Profile System SHALL emit metrics for password_change_total with result labels.

4. THE Avatar Service SHALL emit metrics for avatar_upload_total, avatar_confirm_total, and avatar_delete_total with result labels.

5. THE Account Erasure Service SHALL emit metrics for account_erasure_total with result labels.

6. THE Concurrency Controller SHALL emit metrics for etag_conflicts_total with labels: endpoint.

7. THE Profile System SHALL include traceId in all RFC 9457 problem+json error responses for distributed tracing.
