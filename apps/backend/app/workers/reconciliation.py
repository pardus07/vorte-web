# apps/backend/app/workers/reconciliation.py
"""
Reconciliation Worker for stuck payments.

Periodically checks payments stuck in INITIATED or PENDING_3DS status
and queries provider APIs to get final status.

Schedule: Every 10 minutes (cron: */10 * * * *)

Refs:
- iyzico Retrieve Payment: https://docs.iyzico.com/
- PayTR Status Inquiry: https://dev.paytr.com/
"""
import asyncio
import logging
from datetime import datetime, timedelta, UTC
from typing import List

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from app.models.payment import Payment, PaymentStatus, PaymentProvider
from app.repositories.payment_repository import PaymentRepository
from app.services.adapters.iyzico_adapter import IyzicoAdapter
from app.services.adapters.paytr_adapter import PayTRAdapter
from app.services.payment_orchestrator import PaymentOrchestrator
from app.services.metrics import (
    incr,
    PROVIDER_LATENCY_SECONDS,
    RECONCILIATION_CALLS_TOTAL,
    RECONCILIATION_CALL_LATENCY_SECONDS,
)


logger = logging.getLogger(__name__)


class ReconciliationWorker:
    """
    Worker for reconciling stuck payments.
    
    Queries provider APIs to get final payment status for payments
    stuck in intermediate states (INITIATED, PENDING_3DS).
    
    Features:
    - Idempotent: Safe to run multiple times
    - Transaction-safe: Uses MongoDB sessions
    - Rate-limited: Respects provider limits
    - Observable: Emits Prometheus metrics
    """

    def __init__(
        self,
        mongo: AsyncIOMotorClient,
        repo: PaymentRepository,
        orchestrator: PaymentOrchestrator,
        iyzico: IyzicoAdapter,
        paytr: PayTRAdapter | None = None,
        db_name: str = "vorte",
    ):
        self.mongo = mongo
        self.repo = repo
        self.orchestrator = orchestrator
        self.iyzico = iyzico
        self.paytr = paytr
        self.db = mongo[db_name]

    async def run_once(self, now_utc: datetime | None = None) -> dict:
        """
        Run one reconciliation cycle.
        
        Query payments with status IN [PENDING_3DS, INITIATED] AND createdAt < NOW() - 15 minutes.
        For each payment:
        - If provider is iyzico, call IyzicoAdapter.query_payment_status
        - If provider is PayTR, alert (PayTR has no status query API, manual investigation required)
        - If final status received, update payment and order status in transaction
        - Emit reconciliation_recovered_total{provider, status} metric
        Alert if payment stuck > 60 minutes (emit reconciliation_stuck_total{provider} metric)
        
        Args:
            now_utc: Current time (for testing)
        
        Returns:
            Statistics dict with counts
        """
        if now_utc is None:
            now_utc = datetime.now(UTC)

        logger.info(f"Starting reconciliation cycle at {now_utc}")

        stats = {
            "checked": 0,
            "updated": 0,
            "failed": 0,
            "skipped": 0,
            "stuck_alerts": 0,
        }

        # Find stuck payments: status IN [PENDING_3DS, INITIATED] AND createdAt < NOW() - 15 minutes
        reconciliation_threshold = now_utc - timedelta(minutes=15)
        alert_threshold = now_utc - timedelta(minutes=60)

        # Query stuck payments using repository method
        stuck_payments = await self.repo.find_stuck_payments(
            older_than_minutes=15,
            providers=(PaymentProvider.iyzico, PaymentProvider.paytr),
        )

        logger.info(f"Found {len(stuck_payments)} stuck payments")

        # Process each stuck payment
        for payment in stuck_payments:
            stats["checked"] += 1

            # Alert if payment stuck > 60 minutes
            if payment.createdAt < alert_threshold:
                logger.error(
                    f"Payment stuck for > 60 minutes: {payment.id}",
                    extra={
                        "payment_id": str(payment.id),
                        "order_id": payment.orderId,
                        "provider": payment.provider,
                        "status": payment.status,
                        "created_at": payment.createdAt.isoformat(),
                        "age_minutes": (now_utc - payment.createdAt).total_seconds() / 60,
                    },
                )
                incr("reconciliation_stuck_total", provider=payment.provider)
                stats["stuck_alerts"] += 1

            try:
                await self._reconcile_payment(payment)
                stats["updated"] += 1
            except Exception as e:
                logger.error(
                    f"Failed to reconcile payment {payment.id}: {e}",
                    extra={"payment_id": str(payment.id), "provider": payment.provider},
                )
                stats["failed"] += 1
                incr("recon_fail_total", provider=payment.provider)

        logger.info(f"Reconciliation cycle completed: {stats}")
        return stats

    async def _reconcile_payment(self, payment: Payment) -> None:
        """
        Reconcile a single payment by querying provider API.
        
        Args:
            payment: Payment to reconcile
        """
        logger.info(
            f"Reconciling payment {payment.id} (provider={payment.provider}, status={payment.status})"
        )

        # Query provider for current status
        if payment.provider == PaymentProvider.iyzico:
            await self._reconcile_iyzico(payment)
        elif payment.provider == PaymentProvider.paytr:
            await self._reconcile_paytr(payment)
        else:
            logger.warning(f"Unknown provider: {payment.provider}")
            incr("recon_skip_total", provider=payment.provider)

    async def _reconcile_iyzico(self, payment: Payment) -> None:
        """
        Reconcile iyzico payment using retrieve_payment_detail API.
        
        Ref: https://docs.iyzico.com/
        """
        payment_id = payment.providerRefs.iyz_paymentId
        if not payment_id:
            logger.warning(f"No iyzico paymentId for payment {payment.id}")
            return

        # Query iyzico API
        RECONCILIATION_CALLS_TOTAL.labels(provider="iyzico").inc()
        with RECONCILIATION_CALL_LATENCY_SECONDS.labels(provider="iyzico").time():
            try:
                detail = await self.iyzico.retrieve_payment_detail({
                    "paymentId": payment_id,
                    "conversationId": payment.orderId,
                })
            except Exception as e:
                logger.error(f"iyzico retrieve failed: {e}")
                raise

        # Map iyzico status to our status
        iyz_status = detail.get("status")
        new_status = self._map_iyzico_status(iyz_status)

        if new_status == payment.status:
            logger.info(f"Payment {payment.id} status unchanged: {new_status}")
            incr("recon_no_change_total", provider="iyzico")
            return

        # Update payment status in transaction
        async with await self.mongo.start_session() as session:
            async with session.start_transaction():
                updated = await self.orchestrator._transition_status(
                    payment_id=payment.id,
                    frm=payment.status,
                    to=new_status,
                    provider_refs=None,
                    three_ds=None,
                    raw={"reconciled": detail, "reason": "RECONCILIATION"},
                    session=session,
                )

                if not updated:
                    logger.warning(
                        f"Failed to transition payment {payment.id} from {payment.status} to {new_status}"
                    )
                    incr("recon_transition_fail_total", provider="iyzico")
                    return

                # Record reconciliation event
                await self.orchestrator._record_event(
                    payment_id=payment.id,
                    provider=PaymentProvider.iyzico,
                    external_id=f"recon_{payment_id}_{datetime.now(UTC).isoformat()}",
                    ev_type=f"RECONCILED_{new_status}",
                    raw=detail,
                    session=session,
                )

        logger.info(f"Reconciled payment {payment.id}: {payment.status} → {new_status}")
        incr("recon_updated_total", provider="iyzico", status=new_status)
        incr("reconciliation_recovered_total", provider="iyzico", status=new_status)

    async def _reconcile_paytr(self, payment: Payment) -> None:
        """
        Reconcile PayTR payment using status inquiry API.
        
        Queries PayTR's "Durum Sorgu" (Status Inquiry) endpoint to get
        final payment status for stuck payments.
        
        Ref: https://www.paytr.com/odeme/durum-sorgu
        """
        if not self.paytr:
            logger.warning("PayTR adapter not configured")
            return

        merchant_oid = payment.providerRefs.paytr_merchant_oid
        if not merchant_oid:
            logger.warning(f"No PayTR merchant_oid for payment {payment.id}")
            return

        # Query PayTR API
        RECONCILIATION_CALLS_TOTAL.labels(provider="paytr").inc()
        with RECONCILIATION_CALL_LATENCY_SECONDS.labels(provider="paytr").time():
            try:
                result = await self.paytr.status_inquiry(merchant_oid)
            except Exception as e:
                logger.error(f"PayTR status inquiry failed: {e}")
                raise

        # Map PayTR status to our status
        paytr_status = result.get("status")
        new_status = self._map_paytr_status(paytr_status)

        if new_status == payment.status:
            logger.info(f"Payment {payment.id} status unchanged: {new_status}")
            incr("recon_no_change_total", provider="paytr")
            return

        # Update payment status in transaction
        async with await self.mongo.start_session() as session:
            async with session.start_transaction():
                updated = await self.orchestrator._transition_status(
                    payment_id=payment.id,
                    frm=payment.status,
                    to=new_status,
                    provider_refs=None,
                    three_ds=None,
                    raw={"reconciled": result, "reason": "RECONCILIATION"},
                    session=session,
                )

                if not updated:
                    logger.warning(
                        f"Failed to transition payment {payment.id} from {payment.status} to {new_status}"
                    )
                    incr("recon_transition_fail_total", provider="paytr")
                    return

                # Record reconciliation event
                await self.orchestrator._record_event(
                    payment_id=payment.id,
                    provider=PaymentProvider.paytr,
                    external_id=f"recon_{merchant_oid}_{datetime.now(UTC).isoformat()}",
                    ev_type=f"RECONCILED_{new_status}",
                    raw=result,
                    session=session,
                )

        logger.info(f"Reconciled payment {payment.id}: {payment.status} → {new_status}")
        incr("recon_updated_total", provider="paytr", status=new_status)
        incr("reconciliation_recovered_total", provider="paytr", status=new_status)

    def _map_iyzico_status(self, iyz_status: str) -> PaymentStatus:
        """
        Map iyzico status to our PaymentStatus enum.
        
        iyzico statuses:
        - success: Payment successful
        - failure: Payment failed
        - init_threeds: 3DS initialized
        - callback_threeds: 3DS callback received
        - bkm_pos_selected: BKM POS selected
        - require_capture: Requires capture (pre-auth)
        """
        status_map = {
            "success": PaymentStatus.AUTHORIZED,
            "failure": PaymentStatus.FAILED,
            "init_threeds": PaymentStatus.PENDING_3DS,
            "callback_threeds": PaymentStatus.PENDING_3DS,
            "require_capture": PaymentStatus.AUTHORIZED,
        }
        return status_map.get(iyz_status, PaymentStatus.FAILED)

    def _map_paytr_status(self, paytr_status: str) -> PaymentStatus:
        """
        Map PayTR status to our PaymentStatus enum.
        
        PayTR statuses:
        - success: Payment successful (approved)
        - failed: Payment failed
        - waiting: Payment pending (user hasn't completed)
        - cancelled: Payment cancelled by user
        - refunded: Payment refunded
        """
        status_map = {
            "success": PaymentStatus.AUTHORIZED,
            "failed": PaymentStatus.FAILED,
            "waiting": PaymentStatus.PENDING_3DS,
            "cancelled": PaymentStatus.CANCELLED,
            "refunded": PaymentStatus.REFUNDED,
        }
        return status_map.get(paytr_status, PaymentStatus.FAILED)


async def main():
    """
    Main entry point for reconciliation worker.
    
    Usage:
        python -m app.workers.reconciliation
    """
    from app.core.config import settings
    from app.services.idempotency import IdempotencyStore
    import redis.asyncio as redis

    # Initialize dependencies
    mongo_client = AsyncIOMotorClient(settings.MONGO_URI)
    db = mongo_client["vorte"]

    repo = PaymentRepository(db)

    iyzico = IyzicoAdapter(
        api_key=settings.IYZICO_API_KEY,
        secret_key=settings.IYZICO_SECRET_KEY,
        base_url=settings.IYZICO_BASE_URL,
    )

    paytr = None
    if hasattr(settings, 'PAYTR_MERCHANT_ID') and settings.PAYTR_MERCHANT_ID:
        from app.services.adapters.paytr_adapter import PayTRAdapter
        paytr = PayTRAdapter(
            merchant_id=settings.PAYTR_MERCHANT_ID,
            merchant_key=settings.PAYTR_MERCHANT_KEY,
            merchant_salt=settings.PAYTR_MERCHANT_SALT,
            test_mode=settings.ENVIRONMENT != "production",
        )

    redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    idem = IdempotencyStore(redis_client)

    orchestrator = PaymentOrchestrator(
        mongo=mongo_client,
        repo=repo,
        idem=idem,
        iyzico=iyzico,
        paytr=paytr,
        db_name="vorte",
    )

    worker = ReconciliationWorker(
        mongo=mongo_client,
        repo=repo,
        orchestrator=orchestrator,
        iyzico=iyzico,
        paytr=paytr,
        db_name="vorte",
    )

    # Run once
    stats = await worker.run_once()
    logger.info(f"Reconciliation completed: {stats}")

    # Cleanup
    await redis_client.close()
    mongo_client.close()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    asyncio.run(main())
