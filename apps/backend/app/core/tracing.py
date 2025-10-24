"""
OpenTelemetry distributed tracing with W3C Trace Context.

Implements:
- W3C Trace Context propagation (traceparent, tracestate headers)
- Semantic conventions for HTTP, MongoDB, Redis
- Span attributes for business context
"""
from typing import Optional, Dict, Any
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.pymongo import PymongoInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.trace import Status, StatusCode
from opentelemetry.semconv.trace import SpanAttributes


# Global tracer
tracer: Optional[trace.Tracer] = None


def init_tracing(service_name: str = "vorte-api", environment: str = "development"):
    """
    Initialize OpenTelemetry tracing.
    
    Args:
        service_name: Service name for traces
        environment: Environment (development, staging, production)
    """
    global tracer
    
    # Create resource with service information
    resource = Resource.create({
        "service.name": service_name,
        "service.version": "1.0.0",
        "deployment.environment": environment
    })
    
    # Create tracer provider
    provider = TracerProvider(resource=resource)
    
    # Add span processor (console exporter for development)
    # In production, use OTLP exporter to send to collector
    processor = BatchSpanProcessor(ConsoleSpanExporter())
    provider.add_span_processor(processor)
    
    # Set global tracer provider
    trace.set_tracer_provider(provider)
    
    # Get tracer
    tracer = trace.get_tracer(__name__)
    
    # Auto-instrument libraries
    PymongoInstrumentor().instrument()
    RedisInstrumentor().instrument()
    
    return tracer


def get_tracer() -> trace.Tracer:
    """Get the global tracer instance."""
    global tracer
    if tracer is None:
        tracer = init_tracing()
    return tracer


def add_span_attributes(span: trace.Span, attributes: Dict[str, Any]):
    """
    Add business context attributes to span.
    
    Args:
        span: Current span
        attributes: Attributes to add (orderId, cartId, sku, userId, etc.)
    """
    for key, value in attributes.items():
        if value is not None:
            span.set_attribute(key, str(value))


def record_exception(span: trace.Span, exception: Exception):
    """
    Record exception in span.
    
    Args:
        span: Current span
        exception: Exception to record
    """
    span.record_exception(exception)
    span.set_status(Status(StatusCode.ERROR, str(exception)))


def create_span(
    name: str,
    attributes: Optional[Dict[str, Any]] = None,
    kind: trace.SpanKind = trace.SpanKind.INTERNAL
) -> trace.Span:
    """
    Create a new span with attributes.
    
    Args:
        name: Span name
        attributes: Optional attributes
        kind: Span kind (INTERNAL, SERVER, CLIENT, etc.)
        
    Returns:
        New span
    """
    tracer = get_tracer()
    span = tracer.start_span(name, kind=kind)
    
    if attributes:
        add_span_attributes(span, attributes)
    
    return span


# Semantic attribute helpers
def add_http_attributes(
    span: trace.Span,
    method: str,
    route: str,
    status_code: int,
    trace_id: Optional[str] = None
):
    """
    Add HTTP semantic attributes to span.
    
    Args:
        span: Current span
        method: HTTP method
        route: HTTP route
        status_code: HTTP status code
        trace_id: Optional trace ID
    """
    span.set_attribute(SpanAttributes.HTTP_METHOD, method)
    span.set_attribute(SpanAttributes.HTTP_ROUTE, route)
    span.set_attribute(SpanAttributes.HTTP_STATUS_CODE, status_code)
    
    if trace_id:
        span.set_attribute("trace.id", trace_id)


def add_db_attributes(
    span: trace.Span,
    operation: str,
    collection: str,
    query: Optional[Dict[str, Any]] = None
):
    """
    Add MongoDB semantic attributes to span.
    
    Args:
        span: Current span
        operation: Database operation (find, insert, update, delete)
        collection: Collection name
        query: Optional query filter
    """
    span.set_attribute(SpanAttributes.DB_SYSTEM, "mongodb")
    span.set_attribute(SpanAttributes.DB_OPERATION, operation)
    span.set_attribute(SpanAttributes.DB_MONGODB_COLLECTION, collection)
    
    if query:
        # Don't log full query (may contain PII), just structure
        span.set_attribute("db.query.keys", ",".join(query.keys()))


def add_business_attributes(
    span: trace.Span,
    order_id: Optional[str] = None,
    cart_id: Optional[str] = None,
    reservation_id: Optional[str] = None,
    sku: Optional[str] = None,
    user_id: Optional[str] = None,
    idempotency_key: Optional[str] = None
):
    """
    Add business context attributes to span.
    
    Args:
        span: Current span
        order_id: Order ID
        cart_id: Cart ID
        reservation_id: Reservation ID
        sku: Product SKU
        user_id: User ID
        idempotency_key: Idempotency key
    """
    if order_id:
        span.set_attribute("business.order_id", order_id)
    if cart_id:
        span.set_attribute("business.cart_id", cart_id)
    if reservation_id:
        span.set_attribute("business.reservation_id", reservation_id)
    if sku:
        span.set_attribute("business.sku", sku)
    if user_id:
        span.set_attribute("business.user_id", user_id)
    if idempotency_key:
        span.set_attribute("business.idempotency_key", idempotency_key)


def add_conflict_event(
    span: trace.Span,
    reason: str,
    expected_version: Optional[int] = None,
    actual_version: Optional[int] = None
):
    """
    Add event for 409 Conflict responses.
    
    Args:
        span: Current span
        reason: Conflict reason
        expected_version: Expected version (for optimistic locking)
        actual_version: Actual version
    """
    attributes = {
        "conflict.reason": reason
    }
    
    if expected_version is not None:
        attributes["conflict.expected_version"] = expected_version
    if actual_version is not None:
        attributes["conflict.actual_version"] = actual_version
    
    span.add_event("http.409.conflict", attributes=attributes)


def add_precondition_event(
    span: trace.Span,
    missing_header: str
):
    """
    Add event for 428 Precondition Required responses.
    
    Args:
        span: Current span
        missing_header: Missing header name
    """
    span.add_event(
        "http.428.precondition_required",
        attributes={"missing_header": missing_header}
    )
