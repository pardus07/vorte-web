"""Campaign repository for database operations."""
from datetime import datetime
from typing import Optional, Dict, Any, List
from bson import ObjectId
from pymongo import ReturnDocument

from app.services.db import get_db


class CampaignRepository:
    """Repository for campaign database operations."""
    
    def __init__(self):
        """Initialize campaign repository."""
        self.collection_name = "campaigns"
    
    @property
    def collection(self):
        """Get collection instance."""
        from app.services.db import get_db
        return get_db()[self.collection_name]
    
    async def init_indexes(self):
        """
        Initialize database indexes.
        
        Creates indexes for:
        - Status and date range lookup
        - Coupon code lookup (for COUPON type)
        - Priority ordering
        """
        db = get_db()
        coll = db[self.collection_name]
        
        # Status and date range for active campaigns
        await coll.create_index([
            ("status", 1),
            ("start_date", 1),
            ("end_date", 1)
        ])
        
        # Priority for ordering
        await coll.create_index([("priority", -1)])
        
        # Coupon code lookup (sparse index for COUPON type only)
        await coll.create_index(
            "coupon_code",
            unique=True,
            sparse=True
        )
    
    async def create(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create new campaign.
        
        Args:
            doc: Campaign document
            
        Returns:
            Created campaign document
        """
        db = get_db()
        
        now = datetime.utcnow()
        doc["created_at"] = now
        doc["updated_at"] = now
        doc["usage_count"] = 0
        
        # Set initial status based on dates
        if now < doc["start_date"]:
            doc["status"] = "inactive"
        elif now > doc["end_date"]:
            doc["status"] = "expired"
        else:
            doc["status"] = "active"
        
        result = await db[self.collection_name].insert_one(doc)
        doc["_id"] = result.inserted_id
        
        return doc
    
    async def get_by_id(self, campaign_id: str) -> Optional[Dict[str, Any]]:
        """
        Get campaign by ID.
        
        Args:
            campaign_id: Campaign ID
            
        Returns:
            Campaign document or None
        """
        db = get_db()
        try:
            return await db[self.collection_name].find_one({"_id": ObjectId(campaign_id)})
        except Exception:
            return None
    
    async def get_by_coupon_code(self, coupon_code: str) -> Optional[Dict[str, Any]]:
        """
        Get campaign by coupon code.
        
        Args:
            coupon_code: Coupon code
            
        Returns:
            Campaign document or None
        """
        db = get_db()
        return await db[self.collection_name].find_one({
            "type": "coupon",
            "coupon_code": coupon_code
        })

    
    async def get_active_campaigns(
        self,
        campaign_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all active campaigns.
        
        Args:
            campaign_type: Optional filter by campaign type
            
        Returns:
            List of active campaign documents ordered by priority
        """
        db = get_db()
        now = datetime.utcnow()
        
        query = {
            "status": "active",
            "start_date": {"$lte": now},
            "end_date": {"$gte": now}
        }
        
        if campaign_type:
            query["type"] = campaign_type
        
        cursor = db[self.collection_name].find(query).sort("priority", -1)
        return [doc async for doc in cursor]
    
    async def update(
        self,
        campaign_id: str,
        updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Update campaign.
        
        Args:
            campaign_id: Campaign ID
            updates: Fields to update
            
        Returns:
            Updated campaign document or None
        """
        db = get_db()
        updates["updated_at"] = datetime.utcnow()
        
        result = await db[self.collection_name].find_one_and_update(
            {"_id": ObjectId(campaign_id)},
            {"$set": updates},
            return_document=ReturnDocument.AFTER
        )
        
        return result

    
    async def increment_usage(self, campaign_id: str) -> bool:
        """
        Increment campaign usage count.
        
        Args:
            campaign_id: Campaign ID
            
        Returns:
            True if incremented, False otherwise
        """
        db = get_db()
        result = await db[self.collection_name].update_one(
            {"_id": ObjectId(campaign_id)},
            {
                "$inc": {"usage_count": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return result.modified_count > 0
    
    async def delete(self, campaign_id: str) -> bool:
        """
        Delete campaign.
        
        Args:
            campaign_id: Campaign ID
            
        Returns:
            True if deleted, False otherwise
        """
        db = get_db()
        result = await db[self.collection_name].delete_one({"_id": ObjectId(campaign_id)})
        return result.deleted_count > 0
    
    async def list_campaigns(
        self,
        status: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """
        List campaigns with optional filtering.
        
        Args:
            status: Optional status filter
            limit: Maximum number of campaigns to return
            skip: Number of campaigns to skip
            
        Returns:
            List of campaign documents
        """
        db = get_db()
        query = {}
        
        if status:
            query["status"] = status
        
        cursor = db[self.collection_name].find(query).sort("created_at", -1).skip(skip).limit(limit)
        return [doc async for doc in cursor]


# Singleton instance
campaign_repository = CampaignRepository()
