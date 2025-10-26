#!/usr/bin/env python3
"""
Migration 005: Create notifications_outbox collection with indexes.

Transactional Outbox pattern for reliable notification delivery.

Refs:
- https://microservices.io/patterns/data/transactional-outbox.html
- https://www.mongodb.com/docs/manual/core/index-ttl/
"""
from pymongo import MongoClient, ASCENDING, IndexModel
from pymongo.errors import CollectionInvalid


def migrate(mongo_uri: str):
    """Create notifications_outbox collection and indexes."""
    client = MongoClient(mongo_uri)
    db = client.get_database()
    
    # Create collection if not exists
    try:
        db.create_collection("notifications_outbox")
        print("✓ Created notifications_outbox collection")
    except CollectionInvalid:
        print("✓ notifications_outbox collection already exists")
    
    collection = db.notifications_outbox
    
    # Create indexes
    indexes = [
        # Unique idempotency key (prevent duplicate notifications)
        IndexModel(
            [("idempotencyKey", ASCENDING)],
            unique=True,
            name="idx_idempotency_key",
        ),
        
        # Dispatcher query (status + nextAttemptAt)
        IndexModel(
            [("status", ASCENDING), ("nextAttemptAt", ASCENDING)],
            name="idx_status_next_attempt",
        ),
        
        # Payment lookup
        IndexModel(
            [("paymentId", ASCENDING), ("eventType", ASCENDING)],
            name="idx_payment_event",
        ),
        
        # Order lookup
        IndexModel(
            [("orderId", ASCENDING)],
            name="idx_order",
        ),
        
        # TTL index: Delete SENT notifications after 14 days
        IndexModel(
            [("sentAt", ASCENDING)],
            expireAfterSeconds=1209600,  # 14 days
            partialFilterExpression={"status": "SENT"},
            name="idx_ttl_sent",
        ),
    ]
    
    # Create indexes
    for index in indexes:
        try:
            collection.create_indexes([index])
            print(f"✓ Created index: {index.document['name']}")
        except Exception as exc:
            print(f"✗ Failed to create index {index.document['name']}: {exc}")
    
    print("\n✅ Migration 005 complete")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python 005_notifications_outbox.py <mongo_uri>")
        sys.exit(1)
    
    mongo_uri = sys.argv[1]
    migrate(mongo_uri)
