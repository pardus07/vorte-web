"""
VORTE E-Commerce API
Main FastAPI application with observability, error handling, and middleware.
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

from app.core.config import settings
from app.core.middleware import LoggingMiddleware, TraceIDMiddleware
from app.core.exceptions import AppException
from app.services.db import init_db, close_db
from app.routers import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    # Startup
    await init_db()
    
    # Initialize database indexes
    from app.repositories.product_repository import product_repository
    from app.repositories.cart_repository import cart_repository
    await product_repository.ensure_indexes()
    await cart_repository.init_indexes()
    print("✓ Database indexes initialized")
    
    yield
    # Shutdown
    await close_db()


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

# Custom middleware
app.add_middleware(TraceIDMiddleware)
app.add_middleware(LoggingMiddleware)

# Exception handlers
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """Handle application-specific exceptions with RFC 9457 problem+json format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "type": f"https://api.vorte.com.tr/errors/{exc.code}",
            "title": exc.code,
            "status": exc.status_code,
            "detail": exc.message,
            "instance": str(request.url),
            "traceId": request.state.trace_id if hasattr(request.state, "trace_id") else None,
            **({"errors": exc.details} if exc.details else {})
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    return JSONResponse(
        status_code=500,
        content={
            "type": "https://api.vorte.com.tr/errors/INTERNAL_ERROR",
            "title": "INTERNAL_ERROR",
            "status": 500,
            "detail": "An unexpected error occurred",
            "instance": str(request.url),
            "traceId": request.state.trace_id if hasattr(request.state, "trace_id") else None
        }
    )


# Routers
from app.routers import auth, products, cart
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(products.admin_router)
app.include_router(cart.router)

# Prometheus metrics
if settings.PROMETHEUS_METRICS:
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# OpenTelemetry instrumentation
FastAPIInstrumentor.instrument_app(app)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "VORTE API",
        "version": "0.1.0",
        "status": "running"
    }
