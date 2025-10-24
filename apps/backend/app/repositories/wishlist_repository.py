"""Wishlist repository for database operations."""
from datetime import datetime
from typing import Optional, Dict, Any, List
from bson import ObjectId

from app.services.db import get_db


class WishlistRepository:
    """Repository for wishlist database operations."""
    
    def __init__(self):
        """Initialize wishlist repository."""
        self.collection_name = "wishlists"
    
    async def init_indexes(self):
        """
        Initialize database indexes.
        
        Creates indexes for:
        - User wishlist lookup
        - Product lookup in wishlist
        """
        db = get_db()
        coll = db[self.collection_name]
        
        # User wishlist lookup
        await coll.create_index("user_id")
        
        # Compound index for user + product (unique)
        await coll.create_index(
            [("user_id", 1), ("product_id", 1)],
            unique=True
        )
    
    async def get_user_wishlist(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all wishlist items for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            List of wishlist items
        """
        db = get_db()
        cursor = db[self.collection_name].find({"user_id": user_id})
        return await cursor.to_list(length=None)
    
    async def add_to_wishlist(
        self,
        user_id: str,
        product_id: str,
        product_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Add product to wishlist.
        
        Args:
            user_id: User ID
            product_id: Product ID
            product_data: Product information (name, price, image, etc.)
            
        Returns:
            Created wishlist item
        """
        db = get_db()
        
        doc = {
            "user_id": user_id,
            "product_id": product_id,
            "product_name": product_data.get("name"),
            "product_price": product_data.get("price"),
            "product_image": product_data.get("image_url"),
            "added_at": datetime.utcnow(),
            "price_at_addition": product_data.get("price")
        }
        
        try:
            result = await db[self.collection_name].insert_one(doc)
            doc["_id"] = result.inserted_id
            return doc
        except Exception:
            # Duplicate - already in wishlist
            return await db[self.collection_name].find_one({
                "user_id": user_id,
                "product_id": product_id
            })
    
    async def remove_from_wishlist(
        self,
        user_id: str,
        product_id: str
    ) -> bool:
        """
        Remove product from wishlist.
        
        Args:
            user_id: User ID
            product_id: Product ID
            
        Returns:
            True if removed, False otherwise
        """
        db = get_db()
        
        result = await db[self.collection_name].delete_one({
            "user_id": user_id,
            "product_id": product_id
        })
        
        return result.deleted_count > 0
    
    async def is_in_wishlist(
        self,
        user_id: str,
        product_id: str
    ) -> bool:
        """
        Check if product is in user's wishlist.
        
        Args:
            user_id: User ID
            product_id: Product ID
            
        Returns:
            True if in wishlist, False otherwise
        """
        db = get_db()
        
        count = await db[self.collection_name].count_documents({
            "user_id": user_id,
            "product_id": product_id
        }, limit=1)
        
        return count > 0
    
    async def get_price_drop_candidates(
        self,
        threshold_percentage: float = 10.0
    ) -> List[Dict[str, Any]]:
        """
        Get wishlist items where price has dropped significantly.
        
        Args:
            threshold_percentage: Minimum price drop percentage
            
        Returns:
            List of wishlist items with price drops
        """
        db = get_db()
        
        # Get all wishlist items
        wishlist_items = await db[self.collection_name].find().to_list(length=None)
        
        candidates = []
        
        for item in wishlist_items:
            product_id = item["product_id"]
            original_price = item.get("price_at_addition", 0)
            
            if original_price == 0:
                continue
            
            # Get current product price
            product = await db["products"].find_one({"_id": ObjectId(product_id)})
            
            if not product:
                continue
            
            current_price = product.get("price", 0)
            
            if current_price == 0:
                continue
            
            # Calculate price drop percentage
            price_drop = ((original_price - current_price) / original_price) * 100
            
            if price_drop >= threshold_percentage:
                item["current_price"] = current_price
                item["price_drop_percentage"] = price_drop
                candidates.append(item)
        
        return candidates


# Singleton instance
wishlist_repository = WishlistRepository()
