from __future__ import annotations

from datetime import datetime, timedelta, UTC
from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.backend.app.models.payment import Payment, PaymentEvent, PaymentStatus, PaymentProvider


class PaymentRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self._db = db
        self._payments = db["payments"]
        self._events = db["payment_events"]

    # --- CRUD / Query ---
    async def create_payment(self, p: Payment, session=None) -> Payment:
        doc = p.model_dump(by_alias=True)
        await self._payments.insert_one(doc, session=session)
        return p

    async def get_by_id(self, payment_id: ObjectId) -> Optional[Payment]:
        doc = await self._payments.find_one({"_id": payment_id})
        return Payment(**doc) if doc else None

    async def get_by_order(self, order_id: str) -> Optional[Payment]:
        """Get payment by order ID (returns latest if multiple)."""
        doc = await self._payments.find_one(
            {"orderId": order_id},
            sort=[("createdAt", -1)]  # Latest first
        )
        return Payment(**doc) if doc else None
    
    async def find_latest_by_order_id(self, order_id: str) -> Optional[Payment]:
        """Alias for get_by_order (explicit naming for clarity)."""
        return await self.get_by_order(order_id)

    async def get_by_idempotency_key(self, key: str) -> Optional[Payment]:
        doc = await self._payments.find_one({"idempotencyKey": key})
        return Payment(**doc) if doc else None

    async def add_event(self, ev: PaymentEvent, session=None) -> PaymentEvent:
        """
        Add payment event with automatic deduplication via unique index.
        Returns event if created, raises DuplicateKeyError if duplicate.
        
        Args:
            session: MongoDB session for transaction support
        """
        await self._events.insert_one(ev.model_dump(by_alias=True), session=session)
        return ev

    async def set_status_and_refs(
        self,
        payment_id: ObjectId,
        status: PaymentStatus,
        provider_refs: dict | None = None,
        three_ds: dict | None = None,
        raw: dict | None = None,
    ) -> bool:
        """
        Update payment status and optional fields atomically.
        Returns True if payment was updated.
        """
        update = {"$set": {"status": status, "updatedAt": datetime.now(UTC)}}
        if provider_refs:
            update["$set"]["providerRefs"] = {**provider_refs}
        if three_ds:
            update["$set"]["threeDS"] = {**three_ds}
        if raw:
            update["$set"]["raw"] = raw
        res = await self._payments.update_one({"_id": payment_id}, update)
        return res.modified_count == 1

    async def find_stuck_payments(
        self,
        older_than_minutes: int = 15,
        providers: tuple[PaymentProvider, ...] = (PaymentProvider.iyzico, PaymentProvider.paytr),
    ) -> list[Payment]:
        """
        Find payments stuck in PENDING_3DS or INITIATED status.
        Used by reconciliation worker.
        """
        threshold = datetime.now(UTC) - timedelta(minutes=older_than_minutes)
        cursor = self._payments.find(
            {
                "status": {"$in": [PaymentStatus.PENDING_3DS, PaymentStatus.INITIATED]},
                "provider": {"$in": list(providers)},
                "updatedAt": {"$lte": threshold},
            }
        ).limit(200)
        out: list[Payment] = []
        async for doc in cursor:
            out.append(Payment(**doc))
        return out
