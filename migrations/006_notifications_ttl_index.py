# migrations/006_notifications_ttl_index.py
"""
Migration: Add TTL index to notifications_outbox collection.

Creates TTL index on expireAt field for automatic cleanup of SENT notifications.
MongoDB TTL thread runs every 60 seconds and removes documents where expireAt < now.

Retention Policy:
- SENT notifications: 7 days (set via expireAt field)
- ENQUEUED/SENDING/DEAD: No expiration (no expireAt field)

Refs:
- https://www.mongodb.com/docs/manual/core/index-ttl/
- https://www.mongodb.com/docs/manual/tutorial/expire-data/

Usage:
    python migrations/006_notifications_ttl_index.py
"""
import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MONGODB_URL = "mongodb://localhost:27017"
DB_NAME = "vorte"


async def migrate():
    """Create TTL index on notifications_outbox.expireAt field."""
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    collection = db.notifications_outbox
    
    logger.info("Starting migration: Add TTL index to notifications_outbox")
    
    try:
        # Check if TTL index already exists
        indexes = await collection.index_information()
        ttl_index_exists = any(
            "expireAt" in idx.get("key", [{}])[0]
            for idx in indexes.values()
        )
        
        if ttl_index_exists:
            logger.info("TTL index already exists, skipping creation")
        else:
            # Create TTL index
            # expireAfterSeconds: 0 means "expire at the time specified in expireAt field"
            await collection.create_index(
                "expireAt",
                name="expireAt_ttl",
                expireAfterSeconds=0,
            )
            logger.info("✅ Created TTL index on expireAt field (expireAfterSeconds=0)")
        
        # Verify index
        indexes = await collection.index_information()
        logger.info(f"Current indexes: {list(indexes.keys())}")
        
        # Show TTL index details
        if "expireAt_ttl" in indexes:
            ttl_index = indexes["expireAt_ttl"]
            logger.info(f"TTL index details: {ttl_index}")
        
        # Stats
        total_docs = await collection.count_documents({})
        sent_docs = await collection.count_documents({"status": "SENT"})
        sent_with_expire = await collection.count_documents({
            "status": "SENT",
            "expireAt": {"$exists": True}
        })
        
        logger.info(f"Collection stats:")
        logger.info(f"  Total documents: {total_docs}")
        logger.info(f"  SENT documents: {sent_docs}")
        logger.info(f"  SENT with expireAt: {sent_with_expire}")
        
        if sent_docs > sent_with_expire:
            logger.warning(
                f"⚠️  {sent_docs - sent_with_expire} SENT documents missing expireAt field. "
                "These will not be automatically cleaned up by TTL."
            )
            logger.info("Run backfill migration to add expireAt to existing SENT documents.")
        
        logger.info("✅ Migration complete")
    
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}", exc_info=True)
        raise
    
    finally:
        client.close()


async def backfill_expire_at():
    """
    Backfill expireAt field for existing SENT notifications.
    
    Sets expireAt = sentAt + 7 days for all SENT documents without expireAt.
    """
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    collection = db.notifications_outbox
    
    logger.info("Starting backfill: Add expireAt to existing SENT notifications")
    
    try:
        from datetime import timedelta
        
        # Find SENT documents without expireAt
        cursor = collection.find({
            "status": "SENT",
            "expireAt": {"$exists": False}
        })
        
        count = 0
        async for doc in cursor:
            sent_at = doc.get("sentAt")
            if not sent_at:
                logger.warning(f"Document {doc['_id']} has no sentAt field, skipping")
                continue
            
            # Set expireAt = sentAt + 7 days
            expire_at = sent_at + timedelta(days=7)
            
            await collection.update_one(
                {"_id": doc["_id"]},
                {"$set": {"expireAt": expire_at}}
            )
            
            count += 1
            if count % 100 == 0:
                logger.info(f"Backfilled {count} documents...")
        
        logger.info(f"✅ Backfill complete: Updated {count} documents")
    
    except Exception as e:
        logger.error(f"❌ Backfill failed: {e}", exc_info=True)
        raise
    
    finally:
        client.close()


async def verify_ttl():
    """
    Verify TTL index is working correctly.
    
    Creates a test document with expireAt in the past and checks if it gets deleted.
    """
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    collection = db.notifications_outbox
    
    logger.info("Starting TTL verification")
    
    try:
        from datetime import timedelta
        
        # Create test document with expireAt in the past
        test_doc = {
            "eventType": "test_ttl",
            "paymentId": "test_pay",
            "orderId": "test_ord",
            "provider": "test",
            "locale": "en",
            "channels": ["email"],
            "payload": {},
            "status": "SENT",
            "attempts": 0,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
            "sentAt": datetime.now(timezone.utc),
            "expireAt": datetime.now(timezone.utc) - timedelta(seconds=10),  # Expired 10 seconds ago
            "idempotencyKey": "test_ttl_verification",
        }
        
        result = await collection.insert_one(test_doc)
        test_id = result.inserted_id
        
        logger.info(f"Created test document with _id={test_id}, expireAt in the past")
        logger.info("Waiting 70 seconds for MongoDB TTL thread to run...")
        logger.info("(TTL thread runs every 60 seconds)")
        
        # Wait for TTL thread (runs every 60 seconds)
        await asyncio.sleep(70)
        
        # Check if document was deleted
        doc = await collection.find_one({"_id": test_id})
        
        if doc is None:
            logger.info("✅ TTL verification passed: Test document was deleted")
        else:
            logger.warning("⚠️  TTL verification failed: Test document still exists")
            logger.warning("This may be normal if TTL thread hasn't run yet. Wait and check again.")
            # Clean up test document
            await collection.delete_one({"_id": test_id})
    
    except Exception as e:
        logger.error(f"❌ TTL verification failed: {e}", exc_info=True)
        raise
    
    finally:
        client.close()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == "backfill":
            asyncio.run(backfill_expire_at())
        elif command == "verify":
            asyncio.run(verify_ttl())
        else:
            print(f"Unknown command: {command}")
            print("Usage: python migrations/006_notifications_ttl_index.py [backfill|verify]")
            sys.exit(1)
    else:
        asyncio.run(migrate())
