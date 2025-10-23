"""Product repository for database operations."""
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId

from app.services.db import get_db
from app.schemas.product import ProductStatus


class ProductRepository:
    """Repository for product data access with MongoDB."""
    
    def __init__(self):
        self.collection_name = "products"
    
    async def ensure_indexes(self):
        """
        Create MongoDB indexes for optimal query performance.
        
        Indexes:
        - Text index: name, description, tags (full-text search)
        - Unique: slug
        - Compound: status + category_ids + base_price + _id (filtering + sorting)
        - Compound: status + _id (published products listing)
        """
        db = get_db()
        coll = db[self.collection_name]
        
        # Text index for full-text search (only one text index per collection)
        await coll.create_index([
            ("name", "text"),
            ("description", "text"),
            ("tags", "text")
        ], name="text_search_idx")
        
        # Unique slug index
        await coll.create_index([("slug", 1)], unique=True, name="slug_unique_idx")
        
        # Compound index for filtering and sorting
        await coll.create_index([
            ("status", 1),
            ("category_ids", 1),
            ("base_price", 1),
            ("_id", -1)
        ], name="filter_sort_idx")
        
        # Published products index
        await coll.create_index([
            ("status", 1),
            ("_id", -1)
        ], name="published_idx")
        
        # SKU index for quick lookup
        await coll.create_index([("sku", 1)], unique=True, name="sku_unique_idx")
    
    async def create(self, doc: dict) -> dict:
        """Create a new product."""
        db = get_db()
        
        # Add metadata
        now = datetime.now(timezone.utc)
        doc["created_at"] = now
        doc["updated_at"] = now
        doc["version"] = 1
        
        result = await db[self.collection_name].insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc
    
    async def get_by_id(self, product_id: str) -> Optional[dict]:
        """Get product by ID."""
        db = get_db()
        try:
            return await db[self.collection_name].find_one({"_id": ObjectId(product_id)})
        except Exception:
            return None
    
    async def get_by_slug(self, slug: str, published_only: bool = True) -> Optional[dict]:
        """Get product by slug."""
        db = get_db()
        
        query = {"slug": slug}
        if published_only:
            query["status"] = ProductStatus.ACTIVE.value
        
        return await db[self.collection_name].find_one(query)
    
    async def get_by_sku(self, sku: str) -> Optional[dict]:
        """Get product by SKU."""
        db = get_db()
        return await db[self.collection_name].find_one({"sku": sku})
    
    async def list_products(
        self,
        filters: dict,
        limit: int = 20,
        cursor: Optional[str] = None,
        sort_field: str = "_id",
        sort_direction: int = -1
    ) -> List[dict]:
        """
        List products with keyset pagination.
        
        Uses cursor-based pagination for stable results.
        Avoids skip/limit for better performance.
        
        Args:
            filters: MongoDB query filters
            limit: Number of items to return
            cursor: Last item ID from previous page
            sort_field: Field to sort by
            sort_direction: 1 for ascending, -1 for descending
            
        Returns:
            List of product documents
        """
        db = get_db()
        
        query = filters.copy()
        
        # Keyset pagination: use cursor as boundary
        if cursor:
            try:
                if sort_direction == -1:
                    query["_id"] = {"$lt": ObjectId(cursor)}
                else:
                    query["_id"] = {"$gt": ObjectId(cursor)}
            except Exception:
                pass  # Invalid cursor, ignore
        
        cursor_obj = db[self.collection_name].find(query)
        cursor_obj = cursor_obj.sort([(sort_field, sort_direction)])
        cursor_obj = cursor_obj.limit(limit)
        
        return [doc async for doc in cursor_obj]
    
    async def update_with_version(
        self,
        product_id: str,
        current_version: int,
        update_data: dict
    ) -> bool:
        """
        Update product with optimistic locking.
        
        Uses version field to prevent concurrent modification conflicts.
        
        Args:
            product_id: Product ID
            current_version: Expected current version
            update_data: Fields to update
            
        Returns:
            True if update succeeded, False if version conflict
        """
        db = get_db()
        
        # Add updated_at timestamp
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        result = await db[self.collection_name].update_one(
            {
                "_id": ObjectId(product_id),
                "version": current_version
            },
            {
                "$set": update_data,
                "$inc": {"version": 1}
            }
        )
        
        return result.modified_count == 1
    
    async def delete(self, product_id: str) -> bool:
        """Delete product by ID."""
        db = get_db()
        
        result = await db[self.collection_name].delete_one({"_id": ObjectId(product_id)})
        return result.deleted_count == 1
    
    async def slug_exists(self, slug: str, exclude_id: Optional[str] = None) -> bool:
        """Check if slug already exists."""
        db = get_db()
        
        query = {"slug": slug}
        if exclude_id:
            query["_id"] = {"$ne": ObjectId(exclude_id)}
        
        count = await db[self.collection_name].count_documents(query, limit=1)
        return count > 0
    
    async def sku_exists(self, sku: str, exclude_id: Optional[str] = None) -> bool:
        """Check if SKU already exists."""
        db = get_db()
        
        query = {"sku": sku}
        if exclude_id:
            query["_id"] = {"$ne": ObjectId(exclude_id)}
        
        count = await db[self.collection_name].count_documents(query, limit=1)
        return count > 0
    
    def to_public(self, doc: dict) -> dict:
        """Convert database document to public product dict."""
        return {
            "id": str(doc["_id"]),
            "sku": doc["sku"],
            "name": doc["name"],
            "slug": doc["slug"],
            "description": doc["description"],
            "category_ids": [str(cid) for cid in doc.get("category_ids", [])],
            "brand": doc.get("brand"),
            "tags": doc.get("tags", []),
            "base_price": doc["base_price"],
            "images": doc.get("images", []),
            "variants": doc.get("variants", []),
            "status": doc["status"],
            "created_at": doc["created_at"],
            "updated_at": doc["updated_at"],
            "version": doc["version"]
        }


# Singleton instance
product_repository = ProductRepository()
