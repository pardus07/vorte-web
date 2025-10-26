# apps/backend/app/repositories/notification_outbox_repository.py
"""
Notification Outbox Repository.

Manages notification outbox for Transactional Outbox pattern.

Refs:
- https://microservices.io/patterns/data/transactional-outbox.html
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError


logger = logging.getLogger(__name__)


class NotificationOutboxRepository:
    """Repository for notification outbox."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.notifications_outbox
    
    async def enqueue(
        self,
        *,
        event_type: str,
        payment_id: str,
        order_id: str,
        provider: str,
        locale: str,
        channels: List[str],
        payload: Dict[str, Any],
        idempotency_key: str,
        session=None,
    ) -> Optional[str]:
        """
        Enqueue notification in outbox.
        
        Args:
            event_type: Event type (e.g., "PaymentAuthorized")
            payment_id: Payment ID
            order_id: Order ID
            provider: Payment provider
            locale: Language code
            channels: Notification channels (["email", "sms"])
            payload: Template context
            idempotency_key: Idempotency key
            session: MongoDB session for transaction
        
        Returns:
            Notification ID if created, None if duplicate
        """
        now = datetime.now(timezone.utc)
        
        document = {
            "eventType": event_type,
            "paymentId": payment_id,
            "orderId": order_id,
            "provider": provider,
            "locale": locale,
            "channels": channels,
            "payload": payload,
            "status": "ENQUEUED",
            "attempts": 0,
            "nextAttemptAt": now,
            "lastError": None,
            "errors": [],
            "createdAt": now,
            "updatedAt": now,
            "sentAt": None,
            "idempotencyKey": idempotency_key,
        }
        
        try:
            result = await self.collection.insert_one(document, session=session)
            
            logger.info(
                f"Notification enqueued",
                extra={
                    "notification_id": str(result.inserted_id),
                    "event_type": event_type,
                    "payment_id": payment_id,
                    "order_id": order_id,
                    "channels": channels,
                }
            )
            
            return str(result.inserted_id)
        
        except DuplicateKeyError:
            # Idempotency: Already enqueued
            logger.debug(
                f"Notification already enqueued (idempotent)",
                extra={"idempotency_key": idempotency_key}
            )
            return None
    
    async def find_ready_for_dispatch(
        self,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Find notifications ready for dispatch.
        
        Args:
            limit: Maximum number of notifications to return
        
        Returns:
            List of notification documents
        """
        now = datetime.now(timezone.utc)
        
        cursor = self.collection.find(
            {
                "status": "ENQUEUED",
                "nextAttemptAt": {"$lte": now},
            }
        ).sort("createdAt", 1).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    async def poll_pending(
        self,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Alias for find_ready_for_dispatch (used by dispatcher).
        
        Args:
            limit: Maximum number of notifications to return
        
        Returns:
            List of notification documents
        """
        return await self.find_ready_for_dispatch(limit=limit)
    
    async def claim(
        self,
        notification_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Alias for claim_for_dispatch with default timeout (used by dispatcher).
        
        Args:
            notification_id: Notification ID
        
        Returns:
            Notification document if claimed, None if already claimed
        """
        return await self.claim_for_dispatch(
            notification_id=notification_id,
            visibility_timeout_seconds=300,
        )
    
    async def mark_retry(
        self,
        notification_id: str,
        error: str,
        next_attempt_at: datetime,
    ) -> None:
        """
        Alias for mark_failed (used by dispatcher).
        
        Args:
            notification_id: Notification ID
            error: Error message
            next_attempt_at: Next retry time
        """
        await self.mark_failed(
            notification_id=notification_id,
            error=Exception(error),
            next_attempt_at=next_attempt_at,
        )
    
    async def claim_for_dispatch(
        self,
        notification_id: str,
        visibility_timeout_seconds: int = 300,
    ) -> Optional[Dict[str, Any]]:
        """
        Claim notification for dispatch (atomic lock) with visibility timeout.
        
        Visibility timeout ensures crash-safe processing:
        - If worker crashes, notification becomes available after timeout
        - Prevents stuck notifications in SENDING state
        
        Uses findOneAndUpdate for atomic claim.
        
        Args:
            notification_id: Notification ID
            visibility_timeout_seconds: Timeout in seconds (default: 5 minutes)
        
        Returns:
            Notification document if claimed, None if already claimed
        
        Refs:
        - https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
        - https://aws.amazon.com/sqs/faqs/ (Visibility Timeout concept)
        """
        from pymongo import ReturnDocument
        
        now = datetime.now(timezone.utc)
        visibility_deadline = now + timedelta(seconds=visibility_timeout_seconds)
        
        notification = await self.collection.find_one_and_update(
            {
                "_id": notification_id,
                "status": "ENQUEUED",
            },
            {
                "$set": {
                    "status": "SENDING",
                    "visibilityDeadline": visibility_deadline,
                    "updatedAt": now,
                }
            },
            return_document=ReturnDocument.AFTER,
        )
        
        return notification
    
    async def mark_sent(
        self,
        notification_id: str,
    ) -> None:
        """
        Mark notification as sent.
        
        Sets expireAt field for MongoDB TTL cleanup (7 days retention).
        """
        now = datetime.now(timezone.utc)
        expire_at = now + timedelta(days=7)
        
        await self.collection.update_one(
            {"_id": notification_id},
            {
                "$set": {
                    "status": "SENT",
                    "sentAt": now,
                    "expireAt": expire_at,
                    "updatedAt": now,
                }
            }
        )
    
    async def mark_failed(
        self,
        notification_id: str,
        error: Exception,
        next_attempt_at: datetime,
    ) -> None:
        """
        Mark notification as failed and schedule retry.
        
        Args:
            notification_id: Notification ID
            error: Error exception
            next_attempt_at: Next retry time
        """
        now = datetime.now(timezone.utc)
        
        await self.collection.update_one(
            {"_id": notification_id},
            {
                "$set": {
                    "status": "ENQUEUED",
                    "nextAttemptAt": next_attempt_at,
                    "lastError": str(error),
                    "updatedAt": now,
                },
                "$inc": {"attempts": 1},
                "$push": {
                    "errors": {
                        "timestamp": now,
                        "message": str(error),
                        "errorClass": type(error).__name__,
                    }
                }
            }
        )
    
    async def mark_dead(
        self,
        notification_id: str,
        error: Exception,
    ) -> None:
        """
        Mark notification as dead (max retries exceeded).
        
        Args:
            notification_id: Notification ID
            error: Final error exception
        """
        now = datetime.now(timezone.utc)
        
        await self.collection.update_one(
            {"_id": notification_id},
            {
                "$set": {
                    "status": "DEAD",
                    "lastError": str(error),
                    "updatedAt": now,
                },
                "$push": {
                    "errors": {
                        "timestamp": now,
                        "message": str(error),
                        "errorClass": type(error).__name__,
                    }
                }
            }
        )
        
        logger.error(
            f"Notification moved to DEAD",
            extra={
                "notification_id": str(notification_id),
                "error": str(error),
            }
        )


    async def reset_stuck_notifications(self) -> int:
        """
        Reset stuck notifications (visibility timeout expired).
        
        Finds notifications in SENDING state with expired visibilityDeadline
        and resets them to ENQUEUED for retry.
        
        Should be called periodically (e.g., every minute) to recover from
        worker crashes or pod terminations.
        
        Returns:
            Number of notifications reset
        
        Ref: https://aws.amazon.com/sqs/faqs/ (Visibility Timeout)
        """
        now = datetime.now(timezone.utc)
        
        result = await self.collection.update_many(
            {
                "status": "SENDING",
                "visibilityDeadline": {"$lt": now},
            },
            {
                "$set": {
                    "status": "ENQUEUED",
                    "updatedAt": now,
                },
                "$unset": {"visibilityDeadline": ""},
            }
        )
        
        if result.modified_count > 0:
            logger.warning(f"Reset {result.modified_count} stuck notifications (visibility timeout expired)")
        
        return result.modified_count
