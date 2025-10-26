"""Background worker for PII erasure after retention period."""
import asyncio
from datetime import datetime, timezone
from typing import Optional

from app.services.account_erasure_service import account_erasure_service
from app.repositories.user_repository import user_repository
from app.core.config import settings
from app.core.metrics_profile import (
    account_erasure_jobs_total,
    account_erasure_duration_seconds
)


CHECK_INTERVAL_SEC = int(getattr(settings, 'ERASURE_JOB_INTERVAL_SECONDS', 3600))  # default: hourly


class ErasureWorker:
    """Background worker for processing PII erasure jobs."""
    
    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._stop = asyncio.Event()
    
    async def start(self):
        """Start the background worker."""
        if self._task is None:
            self._task = asyncio.create_task(self._run())
    
    async def stop(self):
        """Stop the background worker."""
        self._stop.set()
        if self._task:
            await self._task
    
    async def _run(self):
        """Main worker loop."""
        while not self._stop.is_set():
            started = datetime.now(tz=timezone.utc)
            try:
                await self._tick()
            except Exception:
                # intentionally swallow to keep loop alive
                pass
            finally:
                elapsed = (datetime.now(tz=timezone.utc) - started).total_seconds()
                account_erasure_duration_seconds.observe(elapsed)
            
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=CHECK_INTERVAL_SEC)
            except asyncio.TimeoutError:
                pass
    
    async def _tick(self):
        """Process one batch of erasure jobs."""
        # Find users with retention period expired and erasure not completed
        now = datetime.now(tz=timezone.utc)
        
        # Query users where:
        # - deleted_at is not None
        # - erasure_completed_at is None or doesn't exist
        # - retention_until <= now (or calculate from deleted_at + retention_days)
        cursor = user_repository.collection.find({
            "deleted_at": {"$ne": None},
            "$or": [
                {"erasure_completed_at": None},
                {"erasure_completed_at": {"$exists": False}}
            ],
            "$expr": {
                "$lte": [
                    {
                        "$ifNull": [
                            "$erasure_retention_until",
                            {
                                "$add": [
                                    "$deleted_at",
                                    1000 * 60 * 60 * 24 * settings.PII_ERASURE_RETENTION_DAYS
                                ]
                            }
                        ]
                    },
                    now
                ]
            }
        }, projection={"_id": 1})
        
        ids = [str(doc["_id"]) async for doc in cursor]
        
        for user_id in ids:
            result = await account_erasure_service.process_erasure_job(user_id)
            status = "ok" if result else "skipped"
            account_erasure_jobs_total.labels(result=status).inc()


# Singleton instance
worker = ErasureWorker()
