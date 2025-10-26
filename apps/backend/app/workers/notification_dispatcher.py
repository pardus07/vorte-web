# apps/backend/app/workers/notification_dispatcher.py
"""
Notification Dispatcher Worker - Transactional Outbox Pattern

Polls notifications_outbox collection and dispatches notifications via
NotificationService. Implements exponential backoff with jitter for retries.

Architecture:
- Poll → Claim → Send → ACK/RETRY/DEAD
- Atomic claim via findOneAndUpdate (prevents duplicate dispatch)
- Exponential backoff: 2^attempt * base_delay + jitter
- Dead letter after max_attempts (manual intervention required)

Deployment:
- Kubernetes CronJob: */1 * * * * (every minute)
- Docker Compose: cron or manual trigger
- Local dev: python -m app.workers.notification_dispatcher

Metrics:
- notification_dispatch_total{status=sent|retry|dead}
- notification_dispatch_duration_seconds
- notification_dispatch_batch_size

Refs:
- Transactional Outbox: https://microservices.io/patterns/data/transactional-outbox.html
- Exponential Backoff: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- Debezium Outbox: https://debezium.io/documentation/reference/transformations/outbox-event-router.html
"""
from __future__ import annotations

import asyncio
import logging
import os
import random
import sys
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError

from app.repositories.notification_outbox_repository import NotificationOutboxRepository
from app.services.notification_service import NotificationService
from app.services.sms_service import SmsService
from app.services.adapters.sendgrid_adapter import SendGridAdapter
from app.services.adapters.ses_adapter import SESAdapter
from app.services.adapters.netgsm_adapter import NetgsmAdapter
from app.services.adapters.verimor_adapter import VerimorAdapter
from app.services.metrics import incr
from app.core.config import settings

logger = logging.getLogger(__name__)


class NotificationDispatcher:
    """
    Notification dispatcher with exponential backoff and dead letter handling.
    
    Configuration (12-Factor: env-tunable):
    - NOTIFICATION_BATCH_SIZE: Number of notifications to process per run (default: 100)
    - NOTIFICATION_MAX_ATTEMPTS: Maximum retry attempts before dead letter (default: 5)
    - NOTIFICATION_BASE_DELAY_SECONDS: Base delay for exponential backoff (default: 60)
    - NOTIFICATION_MAX_DELAY_SECONDS: Maximum delay cap (default: 3600 = 1 hour)
    - NOTIFICATION_VISIBILITY_TIMEOUT_SECONDS: Visibility timeout for crash recovery (default: 300)
    
    Refs:
    - 12-Factor App: https://12factor.net/config
    """

    # Env-tunable configuration with sensible defaults
    BATCH_SIZE = int(os.getenv("NOTIFICATION_BATCH_SIZE", "100"))
    MAX_ATTEMPTS = int(os.getenv("NOTIFICATION_MAX_ATTEMPTS", "5"))
    BASE_DELAY_SECONDS = int(os.getenv("NOTIFICATION_BASE_DELAY_SECONDS", "60"))
    MAX_DELAY_SECONDS = int(os.getenv("NOTIFICATION_MAX_DELAY_SECONDS", "3600"))
    VISIBILITY_TIMEOUT_SECONDS = int(os.getenv("NOTIFICATION_VISIBILITY_TIMEOUT_SECONDS", "300"))

    def __init__(
        self,
        mongo: AsyncIOMotorClient,
        notification_service: NotificationService,
        db_name: str = "vorte",
    ) -> None:
        self.mongo = mongo
        self.notification_service = notification_service
        self.outbox_repo = NotificationOutboxRepository(mongo, db_name)

    async def run_once(self) -> Dict[str, int]:
        """
        Run one dispatch cycle: poll → claim → send → ack/retry/dead.
        
        Returns:
            Stats dict with counts: {sent: int, retried: int, dead: int, errors: int}
        """
        stats = {"sent": 0, "retried": 0, "dead": 0, "errors": 0}
        start_time = datetime.utcnow()

        try:
            # 1) Poll pending notifications (status=PENDING, nextAttemptAt <= now)
            pending = await self.outbox_repo.poll_pending(limit=self.BATCH_SIZE)
            
            if not pending:
                logger.info("No pending notifications")
                return stats

            logger.info(f"Processing {len(pending)} pending notifications")

            # 2) Process each notification
            for notif in pending:
                try:
                    await self._process_notification(notif, stats)
                except Exception as e:
                    logger.error(f"Failed to process notification {notif['_id']}: {e}", exc_info=True)
                    stats["errors"] += 1

            # 3) Record metrics
            duration = (datetime.utcnow() - start_time).total_seconds()
            # TODO: Add histogram metric when available
            # histogram("notification_dispatch_duration_seconds", duration)
            incr("notification_dispatch_batch_processed", value=len(pending))

            logger.info(f"Dispatch cycle complete: {stats}")
            return stats

        except Exception as e:
            logger.error(f"Dispatch cycle failed: {e}", exc_info=True)
            raise

    async def _process_notification(self, notif: Dict[str, Any], stats: Dict[str, int]) -> None:
        """
        Process single notification: claim → send → ack/retry/dead.
        """
        notif_id = notif["_id"]
        event_type = notif["eventType"]
        payload = notif["payload"]
        attempt = notif["attempts"]

        # 1) Claim notification (atomic update: PENDING → PROCESSING)
        claimed = await self.outbox_repo.claim(notif_id)
        if not claimed:
            # Another worker claimed it
            logger.debug(f"Notification {notif_id} already claimed")
            return

        try:
            # 2) Send notification
            await self._send_notification(event_type, payload)

            # 3) Mark as SENT
            await self.outbox_repo.mark_sent(notif_id)
            stats["sent"] += 1
            incr("notification_dispatch_total", status="sent", event_type=event_type)
            logger.info(f"Notification {notif_id} sent successfully")

        except Exception as e:
            # 4) Handle failure: retry or dead letter
            logger.warning(f"Notification {notif_id} failed (attempt {attempt + 1}): {e}")

            if attempt + 1 >= self.MAX_ATTEMPTS:
                # Dead letter: manual intervention required
                await self.outbox_repo.mark_dead(notif_id, error=str(e))
                stats["dead"] += 1
                incr("notification_dispatch_total", status="dead", event_type=event_type)
                logger.error(f"Notification {notif_id} moved to DEAD after {attempt + 1} attempts")
            else:
                # Retry with exponential backoff + jitter
                next_attempt_at = self._calculate_next_attempt(attempt + 1)
                await self.outbox_repo.mark_retry(notif_id, error=str(e), next_attempt_at=next_attempt_at)
                stats["retried"] += 1
                incr("notification_dispatch_total", status="retry", event_type=event_type)
                logger.info(f"Notification {notif_id} scheduled for retry at {next_attempt_at}")

    async def _send_notification(self, event_type: str, payload: Dict[str, Any]) -> None:
        """
        Send notification via NotificationService.
        
        Maps event_type to notification template and channel.
        """
        from app.services.notification_service import EmailMessage
        from app.services.sms_service import SmsMessage
        
        # Extract common fields
        order_id = payload.get("orderId")
        amount = payload.get("amount", 0)
        currency = payload.get("currency", "TRY")

        # Map event_type to template
        template_map = {
            "payment_success": "order_confirmation",
            "payment_failed": "payment_failed",
            "refund_issued": "refund_issued",
        }
        template = template_map.get(event_type)
        if not template:
            raise ValueError(f"Unknown event_type: {event_type}")

        # Build notification context
        amount_major = amount / 100  # Convert minor units to major
        
        # TODO: Get recipient from order/user service
        # For now, use placeholder (will be replaced in Task 17.2)
        recipient_email = "customer@example.com"
        recipient_phone = "+905551234567"

        # Build email message
        subject_map = {
            "payment_success": f"Order Confirmation - {order_id}",
            "payment_failed": f"Payment Failed - {order_id}",
            "refund_issued": f"Refund Issued - {order_id}",
        }
        
        email_msg = EmailMessage(
            to=recipient_email,
            subject=subject_map.get(event_type, "Notification"),
            html=f"<p>Order {order_id}: {amount_major} {currency}</p>",
            text=f"Order {order_id}: {amount_major} {currency}",
            category=event_type,
            custom_args={"order_id": order_id, "payment_id": payload.get("paymentId")},
            template=template,
        )

        # Send email
        await self.notification_service.send_email(email_msg)

        # Send SMS for critical events
        if event_type in ["payment_success", "refund_issued"] and self.notification_service.sms_service:
            sms_msg = SmsMessage(
                to=recipient_phone,
                body=f"Order {order_id}: {amount_major} {currency} - {event_type}",
                category=event_type,
            )
            await self.notification_service.sms_service.send_sms(sms_msg)

    def _calculate_next_attempt(self, attempt: int) -> datetime:
        """
        Calculate next attempt time with exponential backoff + jitter.
        
        Formula: delay = min(base * 2^attempt + jitter, max_delay)
        Jitter: random(0, base_delay) to prevent thundering herd
        
        Ref: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
        """
        # Exponential backoff: 2^attempt * base_delay
        delay = min(
            self.BASE_DELAY_SECONDS * (2 ** (attempt - 1)),
            self.MAX_DELAY_SECONDS,
        )

        # Add jitter: random(0, base_delay)
        jitter = random.uniform(0, self.BASE_DELAY_SECONDS)
        total_delay = delay + jitter

        return datetime.utcnow() + timedelta(seconds=total_delay)


async def main() -> None:
    """
    CLI entry point for notification dispatcher.
    
    Usage:
        python -m app.workers.notification_dispatcher
    
    Graceful Shutdown:
        Handles SIGTERM/SIGINT for Kubernetes preStop hooks
    """
    import signal
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    # Graceful shutdown flag
    shutdown_requested = False
    
    def signal_handler(signum, frame):
        nonlocal shutdown_requested
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        shutdown_requested = True
    
    # Register signal handlers
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    # Initialize MongoDB
    mongo = AsyncIOMotorClient(settings.MONGODB_URL)
    
    # Initialize email adapters
    sendgrid_adapter = SendGridAdapter(api_key=settings.SENDGRID_API_KEY)
    ses_adapter = SESAdapter()
    
    # Initialize SMS adapters
    netgsm_adapter = NetgsmAdapter(
        username=settings.NETGSM_USERNAME,
        password=settings.NETGSM_PASSWORD,
        sender=settings.NETGSM_SENDER,
    )
    verimor_adapter = VerimorAdapter(
        username=settings.VERIMOR_USERNAME,
        password=settings.VERIMOR_PASSWORD,
        sender=settings.VERIMOR_SENDER,
    )
    
    # Initialize SMS service
    sms_service = SmsService(
        netgsm=netgsm_adapter,
        verimor=verimor_adapter,
        primary=settings.SMS_PROVIDER,
    )
    
    # Initialize notification service
    notification_service = NotificationService(
        sendgrid=sendgrid_adapter,
        ses=ses_adapter,
        sms_service=sms_service,
        primary=settings.EMAIL_PROVIDER,
    )

    # Initialize dispatcher
    dispatcher = NotificationDispatcher(
        mongo=mongo,
        notification_service=notification_service,
    )

    # Run dispatch cycle
    try:
        if shutdown_requested:
            logger.info("Shutdown requested before dispatch, exiting cleanly")
            sys.exit(0)
            
        stats = await dispatcher.run_once()
        logger.info(f"Dispatch complete: {stats}")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Dispatch failed: {e}", exc_info=True)
        sys.exit(1)
    finally:
        logger.info("Closing MongoDB connection...")
        mongo.close()


if __name__ == "__main__":
    asyncio.run(main())
