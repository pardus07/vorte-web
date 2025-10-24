"""
Prometheus metrics following naming conventions.

Naming conventions:
- Use lowercase with underscores
- Use _total suffix for counters
- Use _seconds suffix for time measurements
- Use _bytes suffix for size measurements
- Avoid high cardinality labels
"""
from prometheus_client import Counter, Histogram, Gauge, Info

# Application info
vorte_info = Info(
    'vorte_application',
    'Application information'
)

# Business metrics - Inventory & Reservations
vorte_inventory_reservation_attempts_total = Counter(
    'vorte_inventory_reservation_attempts_total',
    'Total number of inventory reservation attempts',
    ['sku', 'outcome']  # outcome: success, insufficient_stock, conflict
)

vorte_inventory_reservation_committed_total = Counter(
    'vorte_inventory_reservation_committed_total',
    'Total number of committed reservations',
    ['sku']
)

vorte_inventory_reservation_released_total = Counter(
    'vorte_inventory_reservation_released_total',
    'Total number of released reservations',
    ['sku', 'reason']  # reason: cancelled, expired, timeout
)

vorte_inventory_conflicts_total = Counter(
    'vorte_inventory_conflicts_total',
    'Total number of inventory conflicts',
    ['reason']  # reason: version_mismatch, insufficient_stock, concurrent_update
)

vorte_inventory_available = Gauge(
    'vorte_inventory_available',
    'Current available inventory',
    ['sku']
)

vorte_inventory_reservation_latency_seconds = Histogram(
    'vorte_inventory_reservation_latency_seconds',
    'Latency of reservation operations in seconds',
    ['operation']  # operation: reserve, commit, release
)

# HTTP metrics
vorte_http_requests_total = Counter(
    'vorte_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

vorte_http_request_duration_seconds = Histogram(
    'vorte_http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint', 'status']
)

vorte_http_409_total = Counter(
    'vorte_http_409_total',
    'Total HTTP 409 Conflict responses',
    ['endpoint', 'reason']  # reason: version_mismatch, stock_conflict
)

vorte_http_428_total = Counter(
    'vorte_http_428_total',
    'Total HTTP 428 Precondition Required responses',
    ['endpoint', 'missing_header']  # missing_header: if_match, idempotency_key
)

# Transaction metrics
vorte_transaction_duration_seconds = Histogram(
    'vorte_transaction_duration_seconds',
    'MongoDB transaction duration in seconds',
    ['operation']  # operation: order_creation, stock_reservation
)

vorte_transaction_total = Counter(
    'vorte_transaction_total',
    'Total MongoDB transactions',
    ['operation', 'outcome']  # outcome: success, failure, timeout
)

# Cache metrics
vorte_cache_hit_ratio = Gauge(
    'vorte_cache_hit_ratio',
    'Cache hit ratio',
    ['cache_type']  # cache_type: redis, product, idempotency
)

vorte_cache_operations_total = Counter(
    'vorte_cache_operations_total',
    'Total cache operations',
    ['cache_type', 'operation', 'outcome']  # operation: get, set, delete
)

# Payment metrics
vorte_payment_attempts_total = Counter(
    'vorte_payment_attempts_total',
    'Total payment attempts',
    ['provider', 'outcome']  # outcome: success, failed, timeout, 3ds_failed
)

vorte_payment_duration_seconds = Histogram(
    'vorte_payment_duration_seconds',
    'Payment operation duration in seconds',
    ['provider', 'operation']  # operation: initiate, confirm, refund
)

# Order metrics
vorte_order_created_total = Counter(
    'vorte_order_created_total',
    'Total orders created',
    ['order_type']  # order_type: guest, authenticated, manual
)

vorte_order_status_transitions_total = Counter(
    'vorte_order_status_transitions_total',
    'Total order status transitions',
    ['from_status', 'to_status']
)

# TTL & Change Streams metrics
vorte_ttl_deletions_total = Counter(
    'vorte_ttl_deletions_total',
    'Total TTL deletions detected',
    ['collection']  # collection: reservations, carts
)

vorte_change_stream_events_total = Counter(
    'vorte_change_stream_events_total',
    'Total Change Stream events processed',
    ['collection', 'operation_type']  # operation_type: insert, update, delete
)

vorte_reservation_recovery_total = Counter(
    'vorte_reservation_recovery_total',
    'Total reservation recoveries from TTL expiry',
    ['outcome']  # outcome: success, failure
)

# Idempotency metrics
vorte_idempotency_replays_total = Counter(
    'vorte_idempotency_replays_total',
    'Total idempotent request replays',
    ['endpoint', 'operation']
)

vorte_idempotency_cache_age_seconds = Histogram(
    'vorte_idempotency_cache_age_seconds',
    'Age of replayed idempotent responses in seconds',
    ['endpoint']
)


def init_metrics():
    """Initialize application metrics with static info."""
    vorte_info.info({
        'version': '1.0.0',
        'environment': 'development'
    })
