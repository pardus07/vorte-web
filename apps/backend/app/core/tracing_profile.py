"""Distributed tracing utilities for profile operations."""
from typing import Optional
from opentelemetry import trace

from app.core.telemetry import add_trace_attributes, add_trace_event


def trace_profile_operation(
    operation: str,
    user_id: str,
    version: Optional[int] = None,
    result: str = "ok"
):
    """
    Add trace attributes for profile operations.
    
    Args:
        operation: Operation name (get, update, email_change, etc.)
        user_id: User ID
        version: Resource version
        result: Operation result (ok, conflict, error, etc.)
    """
    add_trace_attributes(
        **{
            "user.id": user_id,
            "operation": f"profile.{operation}",
            "result": result
        }
    )
    
    if version is not None:
        add_trace_attributes(**{"version.current": version})


def trace_version_conflict(current_version: int, requested_version: int):
    """Add trace event for version conflict."""
    add_trace_event(
        "version.conflict",
        {
            "version.current": current_version,
            "version.requested": requested_version
        }
    )


def trace_idempotency(idempotency_key: str, cached: bool = False):
    """Add trace attributes for idempotency."""
    add_trace_attributes(
        **{
            "idempotency.key": idempotency_key[:8] + "...",  # Truncate for privacy
            "idempotency.cached": cached
        }
    )


def trace_error(error_code: str, details: Optional[dict] = None):
    """Add trace event for errors."""
    event_attrs = {"error.code": error_code}
    if details:
        event_attrs.update(details)
    
    add_trace_event("error", event_attrs)
