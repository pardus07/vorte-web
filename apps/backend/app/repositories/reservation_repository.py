"""Reservation repository for stock reservation management."""
import uuid
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from bson import ObjectId
from pymongo import ReturnDocument
from motor.motor_asyncio import AsyncIOMotorClientSession

from app.services.db import get_db
from app.core.config import settings
from app.core.metrics import (
    vorte_inventory_reservation_attempts_total,
    vorte_inventory_reservation_committed_total,
    vorte_inventory_reservation_released_total,
    vorte_inventory_reservation_latency_seconds
)


class ReservationRepository:
    """Repository for reservation database operations."""
    
    def __init__(self):
        """Initialize reservation repository."""
        self.collection_name = "reservations"
    
    @property
    def collection(self):
        """Get MongoDB collection."""
        db = get_db()
        return db[self.collection_name]
    
    async def init_indexes(self):
        """
        Initialize database indexes.
        
        Creates:
        - Unique index on reservation_id
        - Unique index on idempotency_key
        - TTL index on expires_at for automatic cleanup
        """
        await self.collection.create_index("reservation_id", unique=True)
        await self.collection.create_index("idempotency_key", unique=True, sparse=True)
        
        # TTL index for automatic cleanup of expired reservations
        # MongoDB TTL monitor runs every ~60 seconds
        await self.collection.create_index(
            "expires_at",
            expireAfterSeconds=0
        )
    
    async def find_by_idempotency_key(
        self,
        idempotency_key: str
    ) -> Optional[Dict[str, Any]]:
        """
        Find reservation by idempotency key.
        
        Args:
            idempotency_key: Idempotency key
            
        Returns:
            Reservation document or None
        """
        return await self.collection.find_one({"idempotency_key": idempotency_key})
    
    async def find_by_id(
        self,
        reservation_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Find reservation by ID.
        
        Args:
            reservation_id: Reservation ID (UUID)
            
        Returns:
            Reservation document or None
        """
        return await self.collection.find_one({"reservation_id": reservation_id})
    
    async def create(
        self,
        user_id: Optional[str],
        guest_id: Optional[str],
        items: List[Dict[str, Any]],
        idempotency_key: Optional[str] = None,
        ttl_seconds: int = 900,  # 15 minutes default
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> Dict[str, Any]:
        """
        Create new reservation.
        
        Args:
            user_id: User ID (if authenticated)
            guest_id: Guest session ID (if guest)
            items: List of items to reserve [{sku, qty}, ...]
            idempotency_key: Optional idempotency key
            ttl_seconds: Reservation TTL in seconds
            session: Optional MongoDB session for transactions
            
        Returns:
            Created reservation document
        """
        now = datetime.utcnow()
        reservation_id = str(uuid.uuid4())
        
        doc = {
            "reservation_id": reservation_id,
            "status": "pending",
            "user_id": user_id,
            "guest_id": guest_id,
            "items": items,
            "expires_at": now + timedelta(seconds=ttl_seconds),
            "idempotency_key": idempotency_key,
            "created_at": now,
            "updated_at": now
        }
        
        result = await self.collection.insert_one(doc, session=session)
        doc["_id"] = result.inserted_id
        
        return doc
    
    async def update_status(
        self,
        reservation_id: str,
        status: str,
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Update reservation status.
        
        Args:
            reservation_id: Reservation ID
            status: New status (pending, committed, released)
            session: Optional MongoDB session for transactions
            
        Returns:
            Updated reservation document or None
        """
        now = datetime.utcnow()
        
        result = await self.collection.find_one_and_update(
            {"reservation_id": reservation_id},
            {
                "$set": {
                    "status": status,
                    "updated_at": now
                }
            },
            session=session,
            return_document=ReturnDocument.AFTER
        )
        
        return result
    
    async def find_expired_pending(
        self,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Find expired pending reservations.
        
        Used by reaper job to release expired reservations.
        
        Args:
            limit: Maximum number of reservations to return
            
        Returns:
            List of reservation documents
        """
        now = datetime.utcnow()
        
        cursor = self.collection.find({
            "status": "pending",
            "expires_at": {"$lt": now}
        }).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    async def create_reservation(
        self,
        product_id: str,
        variant_id: Optional[str],
        quantity: int,
        order_id: Optional[str] = None,
        expires_in_minutes: int = 30,
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> Dict[str, Any]:
        """
        Create stock reservation for order.
        
        Args:
            product_id: Product ID
            variant_id: Variant ID
            quantity: Quantity to reserve
            order_id: Order ID (optional, can be updated later)
            expires_in_minutes: Expiration time in minutes
            session: MongoDB session for transactions
            
        Returns:
            Created reservation document
        """
        now = datetime.utcnow()
        reservation_id = str(uuid.uuid4())
        
        doc = {
            "reservation_id": reservation_id,
            "product_id": product_id,
            "variant_id": variant_id,
            "quantity": quantity,
            "order_id": order_id,
            "status": "pending",
            "expires_at": now + timedelta(minutes=expires_in_minutes),
            "created_at": now,
            "updated_at": now
        }
        
        result = await self.collection.insert_one(doc, session=session)
        doc["_id"] = result.inserted_id
        
        return doc
    
    async def commit_reservation(
        self,
        reservation_id: str,
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> bool:
        """
        Commit reservation (finalize stock deduction).
        
        Args:
            reservation_id: Reservation ID
            session: MongoDB session for transactions
            
        Returns:
            True if committed, False otherwise
        """
        result = await self.collection.update_one(
            {"_id": ObjectId(reservation_id), "status": "pending"},
            {
                "$set": {
                    "status": "committed",
                    "updated_at": datetime.utcnow()
                }
            },
            session=session
        )
        
        return result.modified_count > 0
    
    async def release_reservation(
        self,
        reservation_id: str,
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> bool:
        """
        Release reservation (restore stock).
        
        Args:
            reservation_id: Reservation ID
            session: MongoDB session for transactions
            
        Returns:
            True if released, False otherwise
        """
        result = await self.collection.update_one(
            {"_id": ObjectId(reservation_id), "status": "pending"},
            {
                "$set": {
                    "status": "released",
                    "updated_at": datetime.utcnow()
                }
            },
            session=session
        )
        
        return result.modified_count > 0
    
    async def update_reservation(
        self,
        reservation_id: str,
        updates: Dict[str, Any],
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> bool:
        """
        Update reservation fields.
        
        Args:
            reservation_id: Reservation ID
            updates: Fields to update
            session: MongoDB session for transactions
            
        Returns:
            True if updated, False otherwise
        """
        updates["updated_at"] = datetime.utcnow()
        
        result = await self.collection.update_one(
            {"_id": ObjectId(reservation_id)},
            {"$set": updates},
            session=session
        )
        
        return result.modified_count > 0



# Singleton instance
reservation_repository = ReservationRepository()
