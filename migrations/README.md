# Database Migrations

This directory contains database migration scripts for the VORTE e-commerce platform.

## Running Migrations

### Migration 004: Payment Collections

This migration creates the `payments` and `payment_events` collections with all required indexes.

#### Option 1: Using mongosh (Recommended)

```bash
# Copy the index creation script to the MongoDB container
docker cp migrations/create_indexes.js vorte-mongo:/tmp/create_indexes.js

# Run the script
docker exec vorte-mongo mongosh vorte /tmp/create_indexes.js
```

#### Option 2: Using Python from Docker

```bash
# Run from inside the API container
docker exec vorte-api python -c "
import sys
sys.path.insert(0, '/app')
from app.bootstrap.mongo_indexes import ensure_payment_indexes
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient('mongodb://mongo:27017/vorte?replicaSet=rs0')
    await ensure_payment_indexes(client['vorte'])
    print('✅ Indexes created successfully')

asyncio.run(run())
"
```

#### Option 3: Using Python from Host

```bash
# Requires MongoDB replica set accessible from host
python migrations/004_payment_collections.py
```

## Verifying Migrations

Check that collections and indexes were created:

```bash
# List collections
docker exec vorte-mongo mongosh vorte --eval "db.getCollectionNames()"

# Check payments indexes
docker exec vorte-mongo mongosh vorte --eval "db.payments.getIndexes()"

# Check payment_events indexes
docker exec vorte-mongo mongosh vorte --eval "db.payment_events.getIndexes()"
```

## Expected Indexes

### payments collection
- `_id_` (default)
- `ix_payments_orderId` - Fast order lookup
- `uq_idempotencyKey` - Unique idempotency key (sparse)
- `ix_payments_status_createdAt` - Reconciliation worker queries
- `uq_iyz_paymentId` - Unique iyzico payment ID (sparse)
- `uq_paytr_merchant_oid` - Unique PayTR merchant order ID (sparse)

### payment_events collection
- `_id_` (default)
- `uq_provider_eventId` - Webhook/callback deduplication (unique on provider + externalEventId)
- `ix_events_paymentId_createdAt` - Event lookup by payment
