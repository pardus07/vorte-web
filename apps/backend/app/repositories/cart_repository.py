"""Cart repository for database operations."""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from bson import ObjectId
from pymongo import ReturnDocument

from app.services.db import get_db
from app.core.config import settings


class CartRepository:
    """Repository for cart database operations."""
    
    def __init__(self):
        """Initialize cart repository."""
        self.collection_name = "carts"
    
    async def init_indexes(self):
        """
        Initialize database indexes.
        
        Creates indexes for:
        - Owner lookup (owner.id + owner.type + status)
        - TTL index for guest cart expiration
        """
        db = get_db()
        collection = db[self.collection_name]
        
        # Owner/type/status lookup
        await collection.create_index(
            [("owner.id", 1), ("owner.type", 1), ("status", 1)]
        )
        
        # TTL index for guest carts (expires_at field)
        # MongoDB automatically removes documents when expires_at < current time
        await collection.create_index(
            "expires_at",
            expireAfterSeconds=0
        )
    
    async def get_by_id(self, cart_id: str) -> Optional[Dict[str, Any]]:
        """
        Get cart by ID.
        
        Args:
            cart_id: Cart ID
            
        Returns:
            Cart document or None
        """
        db = get_db()
        collection = db[self.collection_name]
        try:
            return await collection.find_one({"_id": ObjectId(cart_id)})
        except Exception:
            return None
    
    async def get_active(self, owner_id: str, owner_type: str) -> Optional[Dict[str, Any]]:
        """
        Get active cart for owner.
        
        Args:
            owner_id: User ID or guest session ID
            owner_type: "user" or "guest"
            
        Returns:
            Cart document or None
        """
        db = get_db()
        collection = db[self.collection_name]
        return await collection.find_one({
            "owner.id": owner_id,
            "owner.type": owner_type,
            "status": "active"
        })
    
    async def create(
        self,
        owner_id: str,
        owner_type: str,
        currency: str = "TRY"
    ) -> Dict[str, Any]:
        """
        Create new cart.
        
        Args:
            owner_id: User ID or guest session ID
            owner_type: "user" or "guest"
            currency: Currency code (default: TRY)
            
        Returns:
            Created cart document
        """
        now = datetime.utcnow()
        
        # Guest carts expire after configured days
        expires_at = None
        if owner_type == "guest":
            ttl_days = getattr(settings, "CART_TTL_GUEST_DAYS", 7)
            expires_at = now + timedelta(days=ttl_days)
        
        doc = {
            "owner": {
                "id": owner_id,
                "type": owner_type
            },
            "status": "active",
            "currency": currency,
            "items": [],
            "totals": {
                "items": 0.0,
                "shipping": 0.0,
                "discount": 0.0,
                "grand_total": 0.0
            },
            "version": 1,
            "expires_at": expires_at,
            "created_at": now,
            "updated_at": now
        }
        
        db = get_db()
        collection = db[self.collection_name]
        result = await collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        
        return doc
    
    async def upsert_active(
        self,
        owner_id: str,
        owner_type: str,
        currency: str = "TRY"
    ) -> Dict[str, Any]:
        """
        Get or create active cart for owner.
        
        Args:
            owner_id: User ID or guest session ID
            owner_type: "user" or "guest"
            currency: Currency code (default: TRY)
            
        Returns:
            Cart document
        """
        cart = await self.get_active(owner_id, owner_type)
        if cart:
            return cart
        
        return await self.create(owner_id, owner_type, currency)
    
    async def update_with_version(
        self,
        cart_id: str,
        current_version: int,
        updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Update cart with optimistic locking.
        
        Uses version field to prevent lost updates. Only updates if
        current version matches, then increments version.
        
        Args:
            cart_id: Cart ID
            current_version: Expected current version
            updates: Fields to update
            
        Returns:
            Updated cart document or None if version mismatch
        """
        updates["updated_at"] = datetime.utcnow()
        
        db = get_db()
        collection = db[self.collection_name]
        result = await collection.find_one_and_update(
            {
                "_id": ObjectId(cart_id),
                "version": current_version,
                "status": "active"
            },
            {
                "$set": updates,
                "$inc": {"version": 1}
            },
            return_document=ReturnDocument.AFTER
        )
        
        return result
    
    async def delete(self, cart_id: str) -> bool:
        """
        Delete cart.
        
        Args:
            cart_id: Cart ID
            
        Returns:
            True if deleted, False otherwise
        """
        db = get_db()
        collection = db[self.collection_name]
        result = await collection.delete_one({"_id": ObjectId(cart_id)})
        return result.deleted_count > 0
    
    async def mark_checked_out(self, cart_id: str) -> bool:
        """
        Mark cart as checked out.
        
        Args:
            cart_id: Cart ID
            
        Returns:
            True if updated, False otherwise
        """
        db = get_db()
        collection = db[self.collection_name]
        result = await collection.update_one(
            {"_id": ObjectId(cart_id), "status": "active"},
            {
                "$set": {
                    "status": "checked_out",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0


# Singleton instance
cart_repository = CartRepository()
