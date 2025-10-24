"""Health check endpoints for monitoring and load balancers."""
from fastapi import APIRouter, status, Response
from app.services.db import get_db
from app.services.redis_service import redis_service

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check endpoint.
    Returns 200 OK if service is healthy.
    """
    return {
        "status": "healthy",
        "service": "vorte-api",
        "version": "0.1.0"
    }


@router.get("/health/ready")
async def readiness_check(response: Response):
    """
    Readiness check endpoint.
    Returns 200 OK if service is ready to accept traffic (DB and Redis connected).
    Returns 503 Service Unavailable if any dependency is down.
    """
    checks = {
        "status": "ready",
        "checks": {}
    }
    
    all_healthy = True
    
    # Check MongoDB
    try:
        db = get_db()
        await db.command("ping")
        checks["checks"]["mongodb"] = {"status": "up"}
    except Exception as e:
        checks["checks"]["mongodb"] = {"status": "down", "error": str(e)}
        all_healthy = False
    
    # Check Redis
    try:
        redis_client = await redis_service.get_client()
        await redis_client.ping()
        checks["checks"]["redis"] = {"status": "up"}
    except Exception as e:
        checks["checks"]["redis"] = {"status": "down", "error": str(e)}
        all_healthy = False
    
    if not all_healthy:
        checks["status"] = "not_ready"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    
    return checks


@router.get("/health/live", status_code=status.HTTP_200_OK)
async def liveness_check():
    """
    Liveness check endpoint.
    Returns 200 OK if service is alive (for Kubernetes liveness probes).
    """
    return {
        "status": "alive"
    }
