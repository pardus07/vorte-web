# apps/backend/app/workers/notification_stuck_reset.py
"""
Notification Stuck Reset Worker - Visibility Timeout Pattern

Resets notifications stuck in SENDING state (visibility timeout expired).
This handles worker crashes and pod terminations gracefully.

Deployment:
- Kubernetes CronJob: */1 * * * * (every minute)
- Docker Compose: cron or systemd timer
- Local dev: python -m app.workers.notification_stuck_reset

Architecture:
- Finds notifications in SENDING state with expired visibilityDeadline
- Resets them to ENQUEUED for retry
- Logs reset count for monitoring

Refs:
- SQS Visibility Timeout: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- Transactional Outbox: https://microservices.io/patterns/data/transactional-outbox.html
"""
from __future__ import annotations

import asyncio
import logging
import sys

from motor.motor_asyncio import AsyncIOMotorClient

from app.repositories.notification_outbox_repository import NotificationOutboxRepository
from app.core.config import settings

logger = logging.getLogger(__name__)


async def main() -> None:
    """
    CLI entry point for stuck notification reset.
    
    Usage:
        python -m app.workers.notification_stuck_reset
    
    Exit Codes:
        0: Success (notifications reset or none stuck)
        1: Error (MongoDB connection or other failure)
    """
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    logger.info("Starting stuck notification reset worker...")

    # Initialize MongoDB
    mongo = AsyncIOMotorClient(settings.MONGODB_URL)
    
    try:
        # Initialize repository
        repo = NotificationOutboxRepository(mongo[settings.MONGODB_DB_NAME])
        
        # Reset stuck notifications
        reset_count = await repo.reset_stuck_notifications()
        
        if reset_count > 0:
            logger.warning(
                f"Reset {reset_count} stuck notifications (visibility timeout expired)",
                extra={"reset_count": reset_count}
            )
        else:
            logger.info("No stuck notifications found")
        
        # Success
        sys.exit(0)
    
    except Exception as e:
        logger.error(f"Stuck notification reset failed: {e}", exc_info=True)
        sys.exit(1)
    
    finally:
        logger.info("Closing MongoDB connection...")
        mongo.close()


if __name__ == "__main__":
    asyncio.run(main())
