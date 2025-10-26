from motor.motor_asyncio import AsyncIOMotorDatabase


async def ensure_payment_indexes(db: AsyncIOMotorDatabase) -> None:
    """
    Create indexes for payments and payment_events collections.
    
    Indexes:
    - payments.orderId: Fast order lookup
    - payments.providerRefs.iyz_paymentId: Unique iyzico payment ID (sparse)
    - payments.providerRefs.paytr_merchant_oid: Unique PayTR merchant_oid (sparse)
    - payments.status + updatedAt: Reconciliation worker queries
    - payment_events.(provider, externalEventId): Webhook/callback deduplication (unique)
    """
    payments = db["payments"]
    events = db["payment_events"]

    # OrderId sorgularını hızlandırın
    await payments.create_index([("orderId", 1)], name="ix_payments_orderId")

    # Idempotency key (unique, sparse)
    await payments.create_index(
        [("idempotencyKey", 1)],
        name="uq_idempotencyKey",
        unique=True,
        sparse=True,
    )

    # Status + createdAt for reconciliation worker
    await payments.create_index(
        [("status", 1), ("createdAt", 1)],
        name="ix_payments_status_createdAt",
    )

    # Sağlayıcı referansları sparse+unique
    await payments.create_index(
        [("providerRefs.iyz_paymentId", 1)],
        name="uq_iyz_paymentId",
        unique=True,
        sparse=True,
    )
    await payments.create_index(
        [("providerRefs.paytr_merchant_oid", 1)],
        name="uq_paytr_merchant_oid",
        unique=True,
        sparse=True,
    )

    # Event tekilleştirme (provider + externalEventId)
    await events.create_index(
        [("provider", 1), ("externalEventId", 1)],
        name="uq_provider_eventId",
        unique=True,
    )

    # PaymentId lookup for events
    await events.create_index(
        [("paymentId", 1), ("createdAt", -1)],
        name="ix_events_paymentId_createdAt",
    )
