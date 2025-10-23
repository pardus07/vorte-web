"""Health check endpoints for monitoring and load balancers."""
from fastapi import APIRouter, status
from app.services.db import get_db

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


@router.get("/health/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    """
    Readiness check endpoint.
    Returns 200 OK if service is ready to accept traffic (DB connected).
    """
    try:
        db = get_db()
        # Simple ping to verify DB connection
        await db.command("ping")
        return {
            "status": "ready",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "not_ready",
            "database": "disconnected",
            "error": str(e)
        }


@router.get("/health/live", status_code=status.HTTP_200_OK)
async def liveness_check():
    """
    Liveness check endpoint.
    Returns 200 OK if service is alive (for Kubernetes liveness probes).
    """
    return {
        "status": "alive"
    }
