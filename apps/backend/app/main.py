"""
VORTE E-Commerce API
Main FastAPI application with observability, error handling, and middleware.

Implements:
- RFC 9110: HTTP Conditional Requests (ETag/If-Match)
- RFC 9457: Problem Details for HTTP APIs
- RFC 8288: Web Linking (pagination)
- Stripe-style idempotency (24h window)
- OpenTelemetry distributed tracing
- Prometheus metrics
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import settings
from app.core.telemetry import setup_telemetry
from app.core.middleware import (
    LoggingMiddleware,
    TraceIDMiddleware,
    ETagMiddleware,
    IfMatchMiddleware
)
from app.core.exceptions import (
    AppException,
    PreconditionRequiredError,
    PreconditionFailedError
)
from app.services.db import init_db, close_db
from app.routers import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    # Startup
    print("🚀 Starting VORTE API...")
    
    # Setup OpenTelemetry
    setup_telemetry()
    
    # Initialize database
    await init_db()
    
    # Initialize Redis
    from app.services.redis_service import redis_service
    redis_client = await redis_service.get_client()
    await redis_client.ping()
    print("✓ Connected to Redis")
    
    # Initialize Payment Orchestrator
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.repositories.payment_repository import PaymentRepository
    from app.services.adapters.iyzico_adapter import IyzicoAdapter
    from app.services.adapters.paytr_adapter import PayTRAdapter
    from app.services.idempotency import IdempotencyStore
    from app.services.payment_orchestrator import PaymentOrchestrator
    from app.bootstrap.mongo_indexes import ensure_payment_indexes
    
    mongo_client = AsyncIOMotorClient(settings.MONGO_URI)
    db = mongo_client["vorte"]
    
    # Ensure payment indexes
    await ensure_payment_indexes(db)
    print("✓ Payment indexes initialized")
    
    # Create payment orchestrator
    payment_repo = PaymentRepository(db)
    iyzico_adapter = IyzicoAdapter(
        api_key=settings.IYZICO_API_KEY,
        secret_key=settings.IYZICO_SECRET_KEY,
        base_url=settings.IYZICO_BASE_URL,
    )
    
    # PayTR adapter (optional - only if credentials configured)
    paytr_adapter = None
    if hasattr(settings, 'PAYTR_MERCHANT_ID') and settings.PAYTR_MERCHANT_ID:
        paytr_adapter = PayTRAdapter(
            merchant_id=settings.PAYTR_MERCHANT_ID,
            merchant_key=settings.PAYTR_MERCHANT_KEY,
            merchant_salt=settings.PAYTR_MERCHANT_SALT,
            test_mode=settings.ENVIRONMENT != "production",
        )
        print("✓ PayTR adapter initialized")
    
    idempotency_store = IdempotencyStore(redis_client)
    
    app.state.payment_orchestrator = PaymentOrchestrator(
        mongo=mongo_client,
        repo=payment_repo,
        idem=idempotency_store,
        iyzico=iyzico_adapter,
        paytr=paytr_adapter,
        db_name="vorte",
    )
    print("✓ Payment orchestrator initialized")
    
    # Initialize database indexes
    from app.repositories.product_repository import product_repository
    from app.repositories.cart_repository import cart_repository
    from app.repositories.inventory_repository import inventory_repository
    from app.repositories.reservation_repository import reservation_repository
    from app.repositories.order_repository import order_repository
    from app.repositories.campaign_repository import campaign_repository
    from app.repositories.user_repository import user_repository
    await product_repository.ensure_indexes()
    await cart_repository.init_indexes()
    await inventory_repository.init_indexes()
    await reservation_repository.init_indexes()
    await order_repository.init_indexes()
    await campaign_repository.init_indexes()
    await user_repository.init_indexes()
    print("✓ Database indexes initialized")
    
    # Start background workers
    from app.tasks.erasure_worker import worker
    await worker.start()
    print("✓ Background workers started")
    
    print("✅ VORTE API ready")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down VORTE API...")
    
    # Stop background workers
    from app.tasks.erasure_worker import worker
    await worker.stop()
    print("✓ Background workers stopped")
    
    await close_db()
    await redis_service.close()
    print("✅ Shutdown complete")


app = FastAPI(
    title="VORTE E-Commerce API",
    version="0.1.0",
    description="Core platform API for VORTE e-commerce system",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware (order matters: last added = first executed)
app.add_middleware(LoggingMiddleware)  # Log after everything
app.add_middleware(ETagMiddleware)     # Add ETags to responses
app.add_middleware(IfMatchMiddleware)  # Validate If-Match before processing
app.add_middleware(TraceIDMiddleware)  # Generate trace ID first

# Exception handlers
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """
    Handle application-specific exceptions with RFC 9457 Problem Details format.
    Returns application/problem+json content type.
    """
    problem_details = {
        "type": f"https://api.vorte.com.tr/errors/{exc.code}",
        "title": exc.code,
        "status": exc.status_code,
        "detail": exc.message,
        "instance": str(request.url),
        "traceId": getattr(request.state, "trace_id", None)
    }
    
    # Add additional details if present
    if exc.details:
        problem_details.update(exc.details)
    
    return JSONResponse(
        status_code=exc.status_code,
        content=problem_details,
        media_type="application/problem+json"
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Handle unexpected exceptions with RFC 9457 Problem Details format.
    Logs full stack trace for debugging.
    """
    import traceback
    import logging
    
    trace_id = getattr(request.state, "trace_id", "unknown")
    
    # Log full stack trace with ERROR level
    logging.error(
        f"Unhandled exception [traceId={trace_id}]: {str(exc)}\n"
        f"{''.join(traceback.format_exception(type(exc), exc, exc.__traceback__))}"
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "type": "https://api.vorte.com.tr/errors/INTERNAL_ERROR",
            "title": "INTERNAL_ERROR",
            "status": 500,
            "detail": "An unexpected error occurred. Please contact support with the trace ID.",
            "instance": str(request.url),
            "traceId": trace_id
        },
        media_type="application/problem+json"
    )


# Routers
from app.routers import auth, products, cart, inventory, payments, checkout, orders, users, wishlist, admin_orders, profile
from app.api.v1.payments import iyzico as iyzico_payments
from app.api.v1.payments import paytr as paytr_payments
from app.api.v1.webhooks import iyzico as iyzico_webhooks
from app.api.v1.webhooks import paytr as paytr_webhooks

app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(products.admin_router)
app.include_router(cart.router)
app.include_router(inventory.router)
app.include_router(inventory.admin_router)
app.include_router(payments.router)
app.include_router(checkout.router)
app.include_router(orders.router)
app.include_router(users.router)
app.include_router(wishlist.router)
app.include_router(admin_orders.router)
app.include_router(profile.router)

# Payment provider endpoints
app.include_router(iyzico_payments.router)
app.include_router(iyzico_webhooks.router)
app.include_router(paytr_payments.router)
app.include_router(paytr_webhooks.router)

# OpenTelemetry tracing
from app.core.tracing import init_tracing
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

# Initialize tracing
init_tracing(service_name="vorte-api", environment=settings.ENVIRONMENT)

# Auto-instrument FastAPI
FastAPIInstrumentor.instrument_app(app)

# Prometheus metrics
if settings.PROMETHEUS_METRICS:
    from app.core.metrics import init_metrics
    
    instrumentator = Instrumentator(
        should_group_status_codes=False,
        should_ignore_untemplated=True,
        should_respect_env_var=True,
        should_instrument_requests_inprogress=True,
        excluded_handlers=["/metrics", "/health"],
        env_var_name="ENABLE_METRICS",
        inprogress_name="http_requests_inprogress",
        inprogress_labels=True
    )
    instrumentator.instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
    
    # Initialize custom metrics
    init_metrics()


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "VORTE API",
        "version": "0.1.0",
        "status": "running"
    }
