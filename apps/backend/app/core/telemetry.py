"""
OpenTelemetry configuration for distributed tracing.
Implements W3C trace context propagation.
"""
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

from app.core.config import settings


def setup_telemetry():
    """
    Configure OpenTelemetry with OTLP exporter.
    Instruments FastAPI automatically.
    MongoDB and Redis instrumentation available via optional packages:
    - opentelemetry-instrumentation-pymongo
    - opentelemetry-instrumentation-redis
    """
    # Create resource with service name
    resource = Resource(attributes={
        SERVICE_NAME: settings.OTEL_SERVICE_NAME
    })
    
    # Create tracer provider
    provider = TracerProvider(resource=resource)
    
    # Add OTLP exporter
    otlp_exporter = OTLPSpanExporter(
        endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT,
        insecure=True  # Use TLS in production
    )
    
    # Add batch span processor
    processor = BatchSpanProcessor(otlp_exporter)
    provider.add_span_processor(processor)
    
    # Set global tracer provider
    trace.set_tracer_provider(provider)
    
    # Instrument MongoDB if available
    try:
        from opentelemetry.instrumentation.pymongo import PymongoInstrumentor
        PymongoInstrumentor().instrument()
        print("✓ MongoDB instrumentation enabled")
    except ImportError:
        print("⚠ MongoDB instrumentation not available (install opentelemetry-instrumentation-pymongo)")
    
    # Instrument Redis if available
    try:
        from opentelemetry.instrumentation.redis import RedisInstrumentor
        RedisInstrumentor().instrument()
        print("✓ Redis instrumentation enabled")
    except ImportError:
        print("⚠ Redis instrumentation not available (install opentelemetry-instrumentation-redis)")
    
    print(f"✓ OpenTelemetry configured: {settings.OTEL_SERVICE_NAME}")


def get_tracer(name: str = __name__):
    """Get tracer instance for manual instrumentation."""
    return trace.get_tracer(name)


def add_trace_attributes(**attributes):
    """
    Add custom attributes to current span.
    
    Example:
        add_trace_attributes(
            orderId="ORD-123",
            userId="user_456",
            sku="PROD-789"
        )
    """
    span = trace.get_current_span()
    if span:
        for key, value in attributes.items():
            span.set_attribute(key, str(value))


def add_trace_event(name: str, attributes: dict = None):
    """
    Add event to current span.
    
    Example:
        add_trace_event(
            "reservation_created",
            {"reservationId": "res_123", "quantity": 2}
        )
    """
    span = trace.get_current_span()
    if span:
        span.add_event(name, attributes=attributes or {})
