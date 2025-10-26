"""
Migration 004: Create payment collections and indexes

This migration creates:
- payments collection with indexes for orderId, idempotencyKey, status, provider refs
- payment_events collection with deduplication index

Run with:
  From host (requires MongoDB replica set accessible):
    python migrations/004_payment_collections.py
  
  From Docker (recommended):
    docker exec vorte-api python -c "import sys; sys.path.insert(0, '/app'); from app.bootstrap.mongo_indexes import ensure_payment_indexes; import asyncio; from motor.motor_asyncio import AsyncIOMotorClient; asyncio.run(ensure_payment_indexes(AsyncIOMotorClient('mongodb://mongo:27017/vorte?replicaSet=rs0')['vorte']))"
  
  Using mongosh (simplest):
    docker cp migrations/create_indexes.js vorte-mongo:/tmp/create_indexes.js
    docker exec vorte-mongo mongosh vorte /tmp/create_indexes.js
"""
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient

from apps.backend.app.bootstrap.mongo_indexes import ensure_payment_indexes
from apps.backend.app.core.config import settings


async def run_migration():
    """Run payment collections migration"""
    print("🚀 Starting migration 004: Payment collections")
    
    # Connect to MongoDB
    # Replace 'mongo' with 'localhost' for running from host machine
    # Also ensure replica set parameter is included
    mongo_uri = settings.MONGO_URI.replace("mongo:", "localhost:")
    if "replicaSet" not in mongo_uri:
        # Add replica set parameter if not present
        separator = "&" if "?" in mongo_uri else "?"
        mongo_uri = f"{mongo_uri}{separator}replicaSet=rs0"
    
    print(f"📡 Connecting to: {mongo_uri}")
    
    client = AsyncIOMotorClient(mongo_uri)
    # Extract database name from URI or use default
    db_name = "vorte"  # Default database name
    if "/" in mongo_uri:
        db_name = mongo_uri.split("/")[-1].split("?")[0]
    db = client[db_name]
    
    try:
        # Create collections if they don't exist
        existing_collections = await db.list_collection_names()
        
        if "payments" not in existing_collections:
            await db.create_collection("payments")
            print("✅ Created payments collection")
        else:
            print("ℹ️  payments collection already exists")
        
        if "payment_events" not in existing_collections:
            await db.create_collection("payment_events")
            print("✅ Created payment_events collection")
        else:
            print("ℹ️  payment_events collection already exists")
        
        # Create indexes
        print("📊 Creating indexes...")
        await ensure_payment_indexes(db)
        print("✅ All indexes created successfully")
        
        # Verify indexes
        payments_indexes = await db.payments.index_information()
        events_indexes = await db.payment_events.index_information()
        
        print(f"\n📋 Payments indexes: {len(payments_indexes)}")
        for idx_name in payments_indexes:
            print(f"  - {idx_name}")
        
        print(f"\n📋 Payment events indexes: {len(events_indexes)}")
        for idx_name in events_indexes:
            print(f"  - {idx_name}")
        
        print("\n✅ Migration 004 completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        raise
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(run_migration())
