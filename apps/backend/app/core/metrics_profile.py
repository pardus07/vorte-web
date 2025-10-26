"""Prometheus metrics for user profile management operations."""
from prometheus_client import Counter, Histogram


# Duration histogram for profile endpoints (low cardinality)
profile_request_duration_seconds = Histogram(
    "profile_request_duration_seconds",
    "Duration of user-profile endpoints",
    ["endpoint"],  # get, update, email_request, email_confirm, pwd, avatar_url, avatar_confirm, avatar_delete, erasure
    buckets=(0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 5.0)
)

# Profile update metrics
profile_updates_total = Counter(
    "profile_updates_total",
    "Profile update attempts",
    ["result"]  # ok | conflict | validation_error | error
)

# Email change metrics
email_change_requests_total = Counter(
    "email_change_requests_total",
    "Email change requests",
    ["result"]  # ok | exists | rate_limited | error
)

email_change_confirms_total = Counter(
    "email_change_confirms_total",
    "Email change confirms",
    ["result"]  # ok | invalid | expired | error
)

# Password change metrics
password_change_attempts_total = Counter(
    "password_change_attempts_total",
    "Password change attempts",
    ["result"]  # ok | invalid_current | same_password | rate_limited | error
)

# Avatar metrics
avatar_upload_url_requests_total = Counter(
    "avatar_upload_url_requests_total",
    "Avatar upload-url requests",
    ["result"]  # ok | invalid_type | rate_limited | error
)

avatar_confirms_total = Counter(
    "avatar_confirms_total",
    "Avatar confirm attempts",
    ["result"]  # ok | object_not_found | file_too_large | conflict | error
)

avatar_deletes_total = Counter(
    "avatar_deletes_total",
    "Avatar delete attempts",
    ["result"]  # ok | conflict | error
)

# Account erasure metrics
account_erasure_requested_total = Counter(
    "account_erasure_requested_total",
    "Account erasure requests",
    ["result"]  # ok | already_deleted | error
)

account_erasure_completed_total = Counter(
    "account_erasure_completed_total",
    "Account erasure completed",
    ["result"]  # ok
)

# Background job metrics
account_erasure_jobs_total = Counter(
    "account_erasure_jobs_total",
    "Number of PII erasure jobs processed",
    ["result"]  # ok | skipped | error
)

account_erasure_duration_seconds = Histogram(
    "account_erasure_duration_seconds",
    "Duration of erasure sweep"
)
