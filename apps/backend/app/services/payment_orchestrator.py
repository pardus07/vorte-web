# apps/backend/app/services/payment_orchestrator.py
from __future__ import annotations

from typing import Any, Dict, Optional
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from motor.motor_asyncio import AsyncIOMotorClient

from app.models.payment import Payment, PaymentStatus, PaymentProvider, ProviderRefs, ThreeDSInfo, PaymentEvent
from app.repositories.payment_repository import PaymentRepository
from app.repositories.notification_outbox_repository import NotificationOutboxRepository
from app.services.adapters.iyzico_adapter import IyzicoAdapter
from app.services.adapters.paytr_adapter import PayTRAdapter
from app.services.idempotency import IdempotencyStore, CachedResponse, _hash_params
from app.services.metrics import incr


class PaymentOrchestrator:
    """
    Payment flow orchestrator with idempotency, state machine, and webhook handling.
    
    State Machine: INITIATED → PENDING_3DS → AUTHORIZED (instant-capture)
    
    Features:
    - Idempotency (24h): Full HTTP response caching with param validation
    - Webhook dedup: payment_events (provider, externalEventId) unique index
    - Transactions: Multi-document atomic operations with MongoDB sessions
    """

    def __init__(
        self,
        mongo: AsyncIOMotorClient,
        repo: PaymentRepository,
        idem: IdempotencyStore,
        iyzico: IyzicoAdapter,
        paytr: Optional[PayTRAdapter] = None,
        db_name: str = "vorte",
        outbox_repo: Optional[NotificationOutboxRepository] = None,
    ) -> None:
        self.mongo = mongo
        self.repo = repo
        self.idem = idem
        self.iyzico = iyzico
        self.paytr = paytr
        self.db = mongo[db_name]
        self.outbox_repo = outbox_repo or NotificationOutboxRepository(mongo, db_name)

    # ---------- Public API ----------

    async def start_3ds_initialize(
        self,
        *,
        idempotency_key: str,
        order_id: str,
        amount_minor: int,
        currency: str,
        iyz_payload: Dict[str, Any],  # iyzico initialize request body (buyer, basket, etc.)
    ) -> Dict[str, Any]:
        """
        Initialize 3DS payment flow with iyzico.
        
        Steps:
        1) Idempotency reservation (24h window)
        2) Create Payment document (INITIATED)
        3) Call iyzico 3DS initialize → threeDSHtmlContent (Base64), paymentId
        4) Update Payment: PENDING_3DS + providerRefs & threeDS
        5) Cache full HTTP response
        
        Returns:
            Response body with threeDSHtmlContent for frontend rendering
        """
        # Calculate params fingerprint for idempotency validation
        fp = _hash_params(
            {"orderId": order_id, "amount": amount_minor, "currency": currency, "iyz": iyz_payload}
        )

        # Check if already processed
        cached = await self.idem.get(idempotency_key)
        if cached:
            # Verify params match (Stripe-style: same key + same params)
            if not await self.idem.verify_params(idempotency_key, fp):
                raise ValueError("Idempotency-Key cannot be reused with different parameters")
            return cached.body

        # Reserve idempotency key (first request wins)
        if not await self.idem.reserve(idempotency_key, fp):
            # Someone else got it -> return their cached response
            cached = await self.idem.get(idempotency_key)
            if cached:
                return cached.body
            raise RuntimeError("Failed to reserve idempotency key")

        try:
            # Process payment in transaction
            async with await self.mongo.start_session() as session:
                async with session.start_transaction():
                    # 1) Create INITIATED payment
                    p = Payment(
                        orderId=order_id,
                        provider=PaymentProvider.iyzico,
                        status=PaymentStatus.INITIATED,
                        amount=amount_minor,
                        currency=currency,
                        providerRefs=ProviderRefs(),
                        threeDS=None,
                        idempotencyKey=idempotency_key,
                    )
                    await self.repo.create_payment(p, session=session)

                    # 2) Call iyzico 3DS initialize
                    data = await self.iyzico.initialize_3ds(iyz_payload)

                    # 3) Prepare 3DS info and provider refs
                    three_ds = ThreeDSInfo(version=data.get("threeDSVersion"), status="CHALLENGE")
                    provider_refs = {"iyz_paymentId": data.get("paymentId")}

                    # 4) Transition to PENDING_3DS (conditional update)
                    updated = await self._transition_status(
                        payment_id=p.id,
                        frm=PaymentStatus.INITIATED,
                        to=PaymentStatus.PENDING_3DS,
                        provider_refs=provider_refs,
                        three_ds=three_ds,
                        raw=data,
                        session=session,
                    )
                    if not updated:
                        raise RuntimeError("State transition failed (INITIATED→PENDING_3DS)")

                    # 5) Record initialize event
                    await self._record_event(
                        payment_id=p.id,
                        provider=PaymentProvider.iyzico,
                        external_id=data.get("paymentId", "init"),
                        ev_type="3ds_initialize",
                        raw=data,
                        session=session,
                    )

            # 6) Build response and cache it
            response_body = {
                "orderId": order_id,
                "paymentDbId": str(p.id),
                "provider": "iyzico",
                "status": "PENDING_3DS",
                "iyzico": {
                    "paymentId": data.get("paymentId"),
                    "threeDSHtmlContent": data.get("threeDSHtmlContent"),  # FE: Base64 decode + render
                },
            }

            await self.idem.put(
                idempotency_key,
                CachedResponse(status=200, headers={"Cache-Control": "no-store"}, body=response_body),
                fp,
            )

            incr("PAYMENT_INIT_OK", provider="iyzico")
            return response_body
        except Exception:
            incr("PAYMENT_INIT_FAIL", provider="iyzico")
            raise

    async def handle_iyzico_webhook(self, payload: Dict[str, Any]) -> None:
        """
        Handle iyzico webhook with deduplication and status update.
        
        At-least-once delivery: Always return 2xx, use unique index for dedup.
        Ref: https://hookdeck.com/webhooks/guides/webhook-retries-best-practices
        """
        # Extract external event ID
        external_id = str(
            payload.get("conversationId")
            or payload.get("paymentId")
            or payload.get("eventId")
            or "unknown"
        )

        try:
            # 1) Dedup via unique index: (provider, externalEventId)
            ev = PaymentEvent(
                paymentId=ObjectId(payload.get("localPaymentDbId")),  # Our internal reference
                provider=PaymentProvider.iyzico,
                externalEventId=external_id,
                eventType="webhook",
                status=payload.get("status", "unknown"),
                raw=payload,
            )
            await self.repo.add_event(ev)
        except DuplicateKeyError:
            # Already processed -> idempotent acceptance
            incr("WEBHOOK_DUP", provider="iyzico")
            return
        except Exception as e:
            # Log and re-raise for 5xx response (provider will retry)
            incr("WEBHOOK_ERROR", provider="iyzico")
            raise

        # 2) Business logic: Update payment status if successful
        iyz_status = payload.get("status") or payload.get("iyziEventType")
        iyz_payment_id = payload.get("paymentId")

        # Find payment by iyzico paymentId
        pay_doc = await self.repo._payments.find_one({"providerRefs.iyz_paymentId": iyz_payment_id})
        if not pay_doc:
            # Event stored; reconciliation worker can handle
            incr("WEBHOOK_PAY_NOT_FOUND", provider="iyzico")
            return

        # Transition to AUTHORIZED if successful
        if iyz_status == "success":
            async with await self.mongo.start_session() as session:
                async with session.start_transaction():
                    ok = await self._transition_status(
                        payment_id=pay_doc["_id"],
                        frm=PaymentStatus.PENDING_3DS,
                        to=PaymentStatus.AUTHORIZED,  # instant capture
                        provider_refs=None,
                        three_ds=None,
                        raw={"webhook": payload, "providerStatus": iyz_status},
                        session=session,
                    )
                    if ok:
                        # Enqueue notification in same transaction
                        await self._enqueue_notification(
                            payment_id=pay_doc["_id"],
                            event_type="payment_success",
                            session=session,
                        )
                        incr("WEBHOOK_OK", provider="iyzico")
                    else:
                        incr("WEBHOOK_TRANSITION_FAIL", provider="iyzico")
        
        # Transition to FAILED if payment failed
        elif iyz_status in ["failure", "failed", "error"]:
            async with await self.mongo.start_session() as session:
                async with session.start_transaction():
                    ok = await self._transition_status(
                        payment_id=pay_doc["_id"],
                        frm=PaymentStatus.PENDING_3DS,
                        to=PaymentStatus.FAILED,
                        provider_refs=None,
                        three_ds=None,
                        raw={"webhook": payload, "providerStatus": iyz_status, "errorMessage": payload.get("errorMessage")},
                        session=session,
                    )
                    if ok:
                        # Enqueue failure notification in same transaction
                        await self._enqueue_notification(
                            payment_id=pay_doc["_id"],
                            event_type="payment_failed",
                            session=session,
                        )
                        incr("WEBHOOK_OK", provider="iyzico", status="failed")
                    else:
                        incr("WEBHOOK_TRANSITION_FAIL", provider="iyzico")

    async def start_paytr_initialize(
        self,
        *,
        idempotency_key: str,
        order_id: str,
        amount_minor: int,
        currency: str,
        user_basket: list[Dict[str, Any]],
        user_ip: str,
        email: str,
        merchant_ok_url: str,
        merchant_fail_url: str,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Initialize PayTR payment flow.
        
        Steps:
        1) Idempotency reservation (24h window)
        2) Create Payment document (INITIATED)
        3) Generate PayTR form parameters
        4) Update Payment: PENDING_3DS + providerRefs (merchant_oid)
        5) Cache full HTTP response
        
        Returns:
            Response body with formParams for frontend POST
        """
        if not self.paytr:
            raise RuntimeError("PayTR adapter not configured")

        # Calculate params fingerprint
        fp = _hash_params(
            {
                "orderId": order_id,
                "amount": amount_minor,
                "currency": currency,
                "basket": user_basket,
                "email": email,
            }
        )

        # Check if already processed
        cached = await self.idem.get(idempotency_key)
        if cached:
            if not await self.idem.verify_params(idempotency_key, fp):
                raise ValueError("Idempotency-Key cannot be reused with different parameters")
            return cached.body

        # Reserve idempotency key
        if not await self.idem.reserve(idempotency_key, fp):
            cached = await self.idem.get(idempotency_key)
            if cached:
                return cached.body
            raise RuntimeError("Failed to reserve idempotency key")

        try:
            # Process payment in transaction
            async with await self.mongo.start_session() as session:
                async with session.start_transaction():
                    # 1) Create INITIATED payment
                    p = Payment(
                        orderId=order_id,
                        provider=PaymentProvider.paytr,
                        status=PaymentStatus.INITIATED,
                        amount=amount_minor,
                        currency=currency,
                        providerRefs=ProviderRefs(),
                        threeDS=None,
                        idempotencyKey=idempotency_key,
                    )
                    await self.repo.create_payment(p, session=session)

                    # 2) Generate PayTR form parameters
                    # Use payment DB ID as merchant_oid for uniqueness
                    form_params = self.paytr.initialize_payment(
                        merchant_oid=str(p.id),
                        email=email,
                        payment_amount=amount_minor,
                        user_basket=user_basket,
                        user_ip=user_ip,
                        merchant_ok_url=merchant_ok_url,
                        merchant_fail_url=merchant_fail_url,
                        currency=currency,
                        **kwargs,
                    )

                    # 3) Transition to PENDING_3DS (PayTR uses hosted page)
                    provider_refs_dict = {"paytr_merchant_oid": str(p.id)}
                    updated = await self._transition_status(
                        payment_id=p.id,
                        frm=PaymentStatus.INITIATED,
                        to=PaymentStatus.PENDING_3DS,
                        provider_refs=provider_refs_dict,
                        three_ds=None,
                        raw={"formParams": form_params},
                        session=session,
                    )
                    if not updated:
                        raise RuntimeError("State transition failed (INITIATED→PENDING_3DS)")

                    # 4) Record initialize event
                    await self._record_event(
                        payment_id=p.id,
                        provider=PaymentProvider.paytr,
                        external_id=str(p.id),
                        ev_type="paytr_initialize",
                        raw=form_params,
                        session=session,
                    )

            # 5) Build response and cache it
            response_body = {
                "orderId": order_id,
                "paymentDbId": str(p.id),
                "provider": "paytr",
                "status": "PENDING_3DS",
                "paytr": {
                    "formParams": form_params,
                    "postUrl": "https://www.paytr.com/odeme/guvenli/" + form_params["merchant_id"],
                },
            }

            await self.idem.put(
                idempotency_key,
                CachedResponse(status=200, headers={"Cache-Control": "no-store"}, body=response_body),
                fp,
            )

            incr("PAYMENT_INIT_OK", provider="paytr")
            return response_body
        except Exception:
            incr("PAYMENT_INIT_FAIL", provider="paytr")
            raise

    async def handle_paytr_callback(self, payload: Dict[str, Any]) -> str:
        """
        Handle PayTR callback with hash validation and status update.
        
        CRITICAL: Must return exactly "OK" (plain text) or PayTR will keep
        status as "Devam Ediyor" and retry indefinitely.
        
        Ref: https://dev.paytr.com/callback-validation
        """
        if not self.paytr:
            raise RuntimeError("PayTR adapter not configured")

        merchant_oid = payload.get("merchant_oid", "")
        status = payload.get("status", "")
        total_amount = payload.get("total_amount", "")
        hash_value = payload.get("hash", "")

        # 1) Validate hash
        is_valid = self.paytr.validate_callback_hash(
            merchant_oid=merchant_oid,
            status=status,
            total_amount=total_amount,
            hash_value=hash_value,
        )

        if not is_valid:
            # Log and alert but still return OK to prevent retries
            incr("WEBHOOK_ERROR", provider="paytr")
            # In production, trigger alert here
            return "OK"

        # 2) Dedup via unique index
        # Use merchant_oid + timestamp as external event ID
        external_id = f"{merchant_oid}_{payload.get('payment_type', '')}_{status}"

        try:
            ev = PaymentEvent(
                paymentId=ObjectId(merchant_oid),  # merchant_oid is our payment DB ID
                provider=PaymentProvider.paytr,
                externalEventId=external_id,
                eventType="callback",
                status=status,
                raw=payload,
            )
            await self.repo.add_event(ev)
        except DuplicateKeyError:
            incr("WEBHOOK_DUP", provider="paytr")
            return "OK"
        except Exception:
            incr("WEBHOOK_ERROR", provider="paytr")
            return "OK"

        # 3) Update payment status
        pay_doc = await self.repo._payments.find_one({"_id": ObjectId(merchant_oid)})
        if not pay_doc:
            incr("WEBHOOK_PAY_NOT_FOUND", provider="paytr")
            return "OK"

        # Map PayTR status to our status
        if status == "success":
            async with await self.mongo.start_session() as session:
                async with session.start_transaction():
                    ok = await self._transition_status(
                        payment_id=ObjectId(merchant_oid),
                        frm=PaymentStatus.PENDING_3DS,
                        to=PaymentStatus.AUTHORIZED,
                        provider_refs=None,
                        three_ds=None,
                        raw={"callback": payload, "providerStatus": status},
                        session=session,
                    )
                    if ok:
                        # Enqueue notification in same transaction
                        await self._enqueue_notification(
                            payment_id=ObjectId(merchant_oid),
                            event_type="payment_success",
                            session=session,
                        )
                        incr("WEBHOOK_OK", provider="paytr")
                    else:
                        incr("WEBHOOK_TRANSITION_FAIL", provider="paytr")
        
        # Handle payment failure
        elif status == "failed":
            async with await self.mongo.start_session() as session:
                async with session.start_transaction():
                    ok = await self._transition_status(
                        payment_id=ObjectId(merchant_oid),
                        frm=PaymentStatus.PENDING_3DS,
                        to=PaymentStatus.FAILED,
                        provider_refs=None,
                        three_ds=None,
                        raw={"callback": payload, "providerStatus": status, "failedReasonMsg": payload.get("failed_reason_msg")},
                        session=session,
                    )
                    if ok:
                        # Enqueue failure notification in same transaction
                        await self._enqueue_notification(
                            payment_id=ObjectId(merchant_oid),
                            event_type="payment_failed",
                            session=session,
                        )
                        incr("WEBHOOK_OK", provider="paytr", status="failed")
                    else:
                        incr("WEBHOOK_TRANSITION_FAIL", provider="paytr")

        return "OK"

    # ---------- Internals ----------

    async def _transition_status(
        self,
        *,
        payment_id: ObjectId,
        frm: PaymentStatus,
        to: PaymentStatus,
        provider_refs: Optional[Dict[str, Any]],
        three_ds: Optional[ThreeDSInfo],
        raw: Optional[Dict[str, Any]],
        session=None,
    ) -> bool:
        """
        Atomic state transition with conditional update.
        Uses findOneAndUpdate with current status check to prevent race conditions.
        
        Args:
            session: MongoDB session for transaction support (required for multi-document transactions)
        """
        update: Dict[str, Any] = {"$set": {"status": to}}
        # Use $currentDate for server-side timestamp
        update["$currentDate"] = {"updatedAt": True}

        if provider_refs:
            update["$set"]["providerRefs"] = provider_refs
        if three_ds:
            update["$set"]["threeDS"] = three_ds.model_dump()
        if raw:
            update["$set"]["raw"] = raw

        res = await self.repo._payments.find_one_and_update(
            {"_id": payment_id, "status": frm},
            update,
            session=session,
        )
        return bool(res)

    async def _record_event(
        self,
        *,
        payment_id: ObjectId,
        provider: PaymentProvider,
        external_id: str,
        ev_type: str,
        raw: Dict[str, Any],
        session=None,
    ) -> None:
        """
        Record payment event (idempotent via unique index).
        
        Args:
            session: MongoDB session for transaction support
        """
        ev = PaymentEvent(
            paymentId=payment_id,
            provider=provider,
            externalEventId=external_id,
            eventType=ev_type,
            status="recorded",
            raw=raw,
        )
        try:
            await self.repo.add_event(ev, session=session)
        except DuplicateKeyError:
            # Already recorded -> idempotent
            pass

    async def _enqueue_notification(
        self,
        *,
        payment_id: ObjectId,
        event_type: str,
        session=None,
    ) -> None:
        """
        Enqueue notification to outbox (Transactional Outbox Pattern).
        
        MUST be called within a MongoDB transaction to ensure atomicity:
        - Payment status update + notification enqueue = atomic
        - If transaction fails, neither happens
        
        Args:
            payment_id: Payment document ID
            event_type: Notification event type (payment_success, payment_failed, refund_issued)
            session: MongoDB session (REQUIRED for transactional guarantee)
        
        Ref: https://microservices.io/patterns/data/transactional-outbox.html
        """
        # Fetch payment details for notification context
        pay_doc = await self.repo._payments.find_one({"_id": payment_id}, session=session)
        if not pay_doc:
            # Should never happen in transaction, but defensive
            return

        # Build notification payload
        payload = {
            "paymentId": str(payment_id),
            "orderId": pay_doc.get("orderId"),
            "amount": pay_doc.get("amount"),
            "currency": pay_doc.get("currency"),
            "status": pay_doc.get("status"),
            "provider": pay_doc.get("provider"),
        }

        # Enqueue to outbox (idempotent via unique index on idempotencyKey)
        await self.outbox_repo.enqueue(
            idempotency_key=f"{event_type}:{payment_id}",
            event_type=event_type,
            payload=payload,
            session=session,
        )
