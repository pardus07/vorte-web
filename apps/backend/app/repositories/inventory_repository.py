"""Inventory repository for atomic stock operations."""
from datetime import datetime
from typing import Optional, Dict, Any, List
from bson import ObjectId
from pymongo import ReturnDocument
from motor.motor_asyncio import AsyncIOMotorClientSession

from app.services.db import get_db
from app.core.config import settings


class InventoryRepository:
    """Repository for inventory database operations."""
    
    def __init__(self):
        """Initialize inventory repository."""
        self.db = get_db()
        self.collection = self.db["inventory"]
    
    async def init_indexes(self):
        """
        Initialize database indexes.
        
        Creates unique index on SKU for fast lookups and uniqueness.
        """
        await self.collection.create_index("sku", unique=True)
    
    async def get_by_sku(self, sku: str) -> Optional[Dict[str, Any]]:
        """
        Get inventory item by SKU.
        
        Args:
            sku: Product SKU
            
        Returns:
            Inventory document or None
        """
        return await self.collection.find_one({"sku": sku})
    
    async def create(
        self,
        sku: str,
        on_hand: int,
        low_stock_threshold: int = 10
    ) -> Dict[str, Any]:
        """
        Create inventory item.
        
        Args:
            sku: Product SKU
            on_hand: Initial stock quantity
            low_stock_threshold: Low stock alert threshold
            
        Returns:
            Created inventory document
        """
        now = datetime.utcnow()
        
        doc = {
            "sku": sku,
            "on_hand": on_hand,
            "reserved": 0,
            "low_stock_threshold": low_stock_threshold,
            "version": 1,
            "updated_at": now,
            "created_at": now
        }
        
        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        
        return doc
    
    async def upsert(
        self,
        sku: str,
        on_hand: int,
        low_stock_threshold: int = 10
    ) -> Dict[str, Any]:
        """
        Get or create inventory item.
        
        Args:
            sku: Product SKU
            on_hand: Initial stock quantity
            low_stock_threshold: Low stock alert threshold
            
        Returns:
            Inventory document
        """
        item = await self.get_by_sku(sku)
        if item:
            return item
        
        return await self.create(sku, on_hand, low_stock_threshold)
    
    async def try_reserve_one(
        self,
        sku: str,
        qty: int,
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Atomically reserve stock for one SKU.
        
        Uses conditional update with $expr to ensure available >= qty.
        This is atomic and prevents overselling.
        
        Args:
            sku: Product SKU
            qty: Quantity to reserve
            session: Optional MongoDB session for transactions
            
        Returns:
            Updated inventory document or None if insufficient stock
        """
        now = datetime.utcnow()
        
        # Atomic conditional update:
        # Only update if available (on_hand - reserved) >= qty
        result = await self.collection.find_one_and_update(
            {
                "sku": sku,
                "$expr": {
                    "$gte": [
                        {"$subtract": ["$on_hand", "$reserved"]},
                        qty
                    ]
                }
            },
            {
                "$inc": {"reserved": qty, "version": 1},
                "$set": {"updated_at": now}
            },
            session=session,
            return_document=ReturnDocument.AFTER
        )
        
        return result
    
    async def release_one(
        self,
        sku: str,
        qty: int,
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Atomically release reserved stock for one SKU.
        
        Args:
            sku: Product SKU
            qty: Quantity to release
            session: Optional MongoDB session for transactions
            
        Returns:
            Updated inventory document or None if not found
        """
        now = datetime.utcnow()
        
        result = await self.collection.find_one_and_update(
            {"sku": sku},
            {
                "$inc": {"reserved": -qty, "version": 1},
                "$set": {"updated_at": now}
            },
            session=session,
            return_document=ReturnDocument.AFTER
        )
        
        return result
    
    async def commit_one(
        self,
        sku: str,
        qty: int,
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Atomically commit reservation (decrease both on_hand and reserved).
        
        Called after successful payment to finalize the sale.
        
        Args:
            sku: Product SKU
            qty: Quantity to commit
            session: Optional MongoDB session for transactions
            
        Returns:
            Updated inventory document or None if not found
        """
        now = datetime.utcnow()
        
        result = await self.collection.find_one_and_update(
            {"sku": sku},
            {
                "$inc": {
                    "on_hand": -qty,
                    "reserved": -qty,
                    "version": 1
                },
                "$set": {"updated_at": now}
            },
            session=session,
            return_document=ReturnDocument.AFTER
        )
        
        return result
    
    async def adjust_stock(
        self,
        sku: str,
        delta: int,
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Adjust stock quantity (admin operation).
        
        Args:
            sku: Product SKU
            delta: Stock adjustment (positive or negative)
            session: Optional MongoDB session for transactions
            
        Returns:
            Updated inventory document or None if not found
        """
        now = datetime.utcnow()
        
        result = await self.collection.find_one_and_update(
            {"sku": sku},
            {
                "$inc": {"on_hand": delta, "version": 1},
                "$set": {"updated_at": now}
            },
            session=session,
            return_document=ReturnDocument.AFTER
        )
        
        return result
    
    async def get_low_stock_items(
        self,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get items with low stock.
        
        Returns items where available <= low_stock_threshold.
        
        Args:
            limit: Maximum number of items to return
            
        Returns:
            List of inventory documents
        """
        cursor = self.collection.aggregate([
            {
                "$addFields": {
                    "available": {"$subtract": ["$on_hand", "$reserved"]}
                }
            },
            {
                "$match": {
                    "$expr": {
                        "$lte": ["$available", "$low_stock_threshold"]
                    }
                }
            },
            {"$limit": limit}
        ])
        
        return await cursor.to_list(length=limit)


# Singleton instance
inventory_repository = InventoryRepository()
