# apps/backend/app/services/metrics.py
"""
Prometheus metrics for payment operations.

Implements business metrics for payment flows:
- Payment initialization results
- Webhook processing results
- Provider API latency

Refs:
- https://prometheus.io/docs/practices/naming/
- https://prometheus.io/docs/practices/histograms/
"""
from typing import Dict

try:
    from prometheus_client import Counter, Histogram
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    # Fallback: no-op classes
    class Counter:
        def __init__(self, *args, **kwargs):
            pass
        def labels(self, **kwargs):
            return self
        def inc(self, *args):
            pass
    
    class Histogram:
        def __init__(self, *args, **kwargs):
            pass
        def labels(self, **kwargs):
            return self
        def time(self):
            class NoOpContext:
                def __enter__(self): return self
                def __exit__(self, *args): pass
            return NoOpContext()


# --- Business Metrics ---

# Payment initialization results (labels: provider, result)
PAYMENT_INIT_TOTAL = Counter(
    "payment_init_total",
    "Number of payment initialize attempts",
    labelnames=("provider", "result"),
)

# Webhook processing results (labels: provider, result)
PAYMENT_WEBHOOK_TOTAL = Counter(
    "payment_webhook_total",
    "Number of webhook process results",
    labelnames=("provider", "result"),
)

# Provider API call latency (labels: provider, method)
# Buckets: 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s
# Ref: https://prometheus.io/docs/practices/histograms/
PROVIDER_LATENCY_SECONDS = Histogram(
    "payment_provider_latency_seconds",
    "Latency of provider API calls in seconds",
    labelnames=("provider", "method"),
    buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5, 10),
)

# Reconciliation metrics (labels: provider)
RECONCILIATION_CALLS_TOTAL = Counter(
    "reconciliation_calls_total",
    "Total reconciliation API calls",
    labelnames=("provider",),
)

# Reconciliation call latency (labels: provider)
RECONCILIATION_CALL_LATENCY_SECONDS = Histogram(
    "reconciliation_call_latency_seconds",
    "Latency of reconciliation API calls in seconds",
    labelnames=("provider",),
    buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5, 10),
)

# --- Notification Metrics ---

# Notification dispatch results (labels: provider, event_type, outcome)
NOTIFICATION_DISPATCH_TOTAL = Counter(
    "notification_dispatch_total",
    "Number of notification dispatch attempts",
    labelnames=("provider", "event_type", "outcome"),
)

# Notification dispatch latency (labels: provider, event_type)
# Buckets: 250ms, 500ms, 1s, 2.5s, 5s, 10s, 30s (email/SMS can be slow)
NOTIFICATION_DISPATCH_LATENCY_SECONDS = Histogram(
    "notification_dispatch_latency_seconds",
    "Latency of notification dispatch in seconds",
    labelnames=("provider", "event_type"),
    buckets=(0.25, 0.5, 1.0, 2.5, 5, 10, 30),
)

# Notification batch processing
NOTIFICATION_BATCH_PROCESSED = Counter(
    "notification_dispatch_batch_processed_total",
    "Number of notification batches processed",
)

# Notification outbox backlog (gauge, labels: status)
try:
    from prometheus_client import Gauge
    NOTIFICATION_OUTBOX_BACKLOG = Gauge(
        "notification_outbox_backlog",
        "Number of notifications in outbox by status",
        labelnames=("status",),
    )
except ImportError:
    class Gauge:
        def __init__(self, *args, **kwargs):
            pass
        def labels(self, **kwargs):
            return self
        def set(self, *args):
            pass
    NOTIFICATION_OUTBOX_BACKLOG = Gauge("notification_outbox_backlog", "", labelnames=("status",))


def incr(metric: str, **labels) -> None:
    """
    Increment counter metric with labels.
    
    Bridge function for backward compatibility with existing incr() calls.
    Maps metric names to Prometheus counters.
    
    Examples:
        incr("PAYMENT_INIT_OK", provider="iyzico")
        incr("WEBHOOK_DUP", provider="iyzico")
        incr("recon_updated_total", provider="iyzico", status="AUTHORIZED")
        incr("reconciliation_recovered_total", provider="iyzico", status="AUTHORIZED")
        incr("reconciliation_stuck_total", provider="iyzico")
    """
    if not PROMETHEUS_AVAILABLE:
        return
    
    # Route metric names to Prometheus counters
    route: Dict[str, Counter] = {
        "PAYMENT_INIT_OK": PAYMENT_INIT_TOTAL.labels(provider=labels.get("provider", "unknown"), result="ok"),
        "PAYMENT_INIT_FAIL": PAYMENT_INIT_TOTAL.labels(provider=labels.get("provider", "unknown"), result="fail"),
        "WEBHOOK_OK": PAYMENT_WEBHOOK_TOTAL.labels(provider=labels.get("provider", "unknown"), result="ok"),
        "WEBHOOK_DUP": PAYMENT_WEBHOOK_TOTAL.labels(provider=labels.get("provider", "unknown"), result="dup"),
        "WEBHOOK_TRANSITION_FAIL": PAYMENT_WEBHOOK_TOTAL.labels(
            provider=labels.get("provider", "unknown"), result="transition_fail"
        ),
        "WEBHOOK_PAY_NOT_FOUND": PAYMENT_WEBHOOK_TOTAL.labels(
            provider=labels.get("provider", "unknown"), result="payment_not_found"
        ),
        "WEBHOOK_ERROR": PAYMENT_WEBHOOK_TOTAL.labels(provider=labels.get("provider", "unknown"), result="error"),
        "provider_circuit_open_total": PAYMENT_INIT_TOTAL.labels(
            provider=labels.get("provider", "unknown"), result="circuit_open"
        ),
        # Reconciliation metrics
        "recon_updated_total": PAYMENT_WEBHOOK_TOTAL.labels(
            provider=labels.get("provider", "unknown"), result=f"recon_{labels.get('status', 'unknown')}"
        ),
        "recon_fail_total": PAYMENT_WEBHOOK_TOTAL.labels(
            provider=labels.get("provider", "unknown"), result="recon_fail"
        ),
        "recon_no_change_total": PAYMENT_WEBHOOK_TOTAL.labels(
            provider=labels.get("provider", "unknown"), result="recon_no_change"
        ),
        "recon_transition_fail_total": PAYMENT_WEBHOOK_TOTAL.labels(
            provider=labels.get("provider", "unknown"), result="recon_transition_fail"
        ),
        "recon_skip_total": PAYMENT_WEBHOOK_TOTAL.labels(
            provider=labels.get("provider", "unknown"), result="recon_skip"
        ),
        "recon_manual_required_total": PAYMENT_WEBHOOK_TOTAL.labels(
            provider=labels.get("provider", "unknown"), result="recon_manual"
        ),
        # Reconciliation metrics (as per requirements)
        "reconciliation_recovered_total": PAYMENT_WEBHOOK_TOTAL.labels(
            provider=labels.get("provider", "unknown"), result=f"reconciliation_recovered_{labels.get('status', 'unknown')}"
        ),
        "reconciliation_stuck_total": PAYMENT_WEBHOOK_TOTAL.labels(
            provider=labels.get("provider", "unknown"), result="reconciliation_stuck"
        ),
        # Notification metrics
        "notification_dispatch_total": NOTIFICATION_DISPATCH_TOTAL.labels(
            provider=labels.get("provider", "unknown"),
            event_type=labels.get("event_type", "unknown"),
            outcome=labels.get("status", labels.get("outcome", "unknown")),
        ),
        "notification_dispatch_batch_processed": NOTIFICATION_BATCH_PROCESSED,
        # Payment status query metrics
        "payment_status_query_total": PAYMENT_INIT_TOTAL.labels(
            provider="query",
            result=labels.get("outcome", "unknown"),
        ),
        "cache_validation_total": PAYMENT_INIT_TOTAL.labels(
            provider="cache",
            result=labels.get("result", "unknown"),
        ),
    }
    
    if metric in route:
        value = labels.get("value", 1)
        route[metric].inc(value)
