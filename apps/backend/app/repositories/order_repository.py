"""Order repository for database operations."""
from datetime import datetime
from typing import Optional, Dict, Any, List
from bson import ObjectId
from pymongo import ReturnDocument

from app.services.db import get_db


class OrderRepository:
    """Repository for order database operations."""
    
    def __init__(self):
        """Initialize order repository."""
        self.collection_name = "orders"
    
    async def init_indexes(self):
        """
        Initialize database indexes.
        
        Creates indexes for:
        - Unique order number
        - User orders lookup
        - Status filtering
        - Payment idempotency key (unique)
        """
        db = get_db()
        coll = db[self.collection_name]
        
        # Unique order number
        await coll.create_index("order_number", unique=True)
        
        # User orders with date sorting
        await coll.create_index([
            ("customer_info.user_id", 1),
            ("created_at", -1)
        ])
        
        # Status filtering
        await coll.create_index("status")
        
        # Payment idempotency key (unique, sparse)
        await coll.create_index(
            "payment.idempotency_key",
            unique=True,
            sparse=True
        )
        
        # Created date for sorting
        await coll.create_index([("created_at", -1)])
    
    async def generate_order_number(self) -> str:
        """
        Generate unique order number.
        
        Format: ORD-YYYY-NNNNN
        
        Returns:
            Order number string
        """
        db = get_db()
        coll = db[self.collection_name]
        
        # Get current year
        year = datetime.utcnow().year
        
        # Find highest order number for current year
        prefix = f"ORD-{year}-"
        last_order = await coll.find_one(
            {"order_number": {"$regex": f"^{prefix}"}},
            sort=[("order_number", -1)]
        )
        
        if last_order:
            # Extract number and increment
            last_num = int(last_order["order_number"].split("-")[-1])
            next_num = last_num + 1
        else:
            # First order of the year
            next_num = 1
        
        return f"{prefix}{next_num:05d}"
    
    async def create(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create new order.
        
        Args:
            doc: Order document
            
        Returns:
            Created order document
        """
        db = get_db()
        
        now = datetime.utcnow()
        doc["created_at"] = now
        doc["updated_at"] = now
        doc["version"] = 1
        
        # Generate order number if not provided
        if "order_number" not in doc:
            doc["order_number"] = await self.generate_order_number()
        
        result = await db[self.collection_name].insert_one(doc)
        doc["_id"] = result.inserted_id
        
        return doc
    
    async def get_by_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        """
        Get order by ID.
        
        Args:
            order_id: Order ID
            
        Returns:
            Order document or None
        """
        db = get_db()
        try:
            return await db[self.collection_name].find_one({"_id": ObjectId(order_id)})
        except Exception:
            return None
    
    async def get_by_order_number(self, order_number: str) -> Optional[Dict[str, Any]]:
        """
        Get order by order number.
        
        Args:
            order_number: Order number
            
        Returns:
            Order document or None
        """
        db = get_db()
        return await db[self.collection_name].find_one({"order_number": order_number})

    
    async def list_user_orders(
        self,
        user_id: str,
        limit: int = 20,
        cursor: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        List orders for a user with cursor-based pagination.
        
        Args:
            user_id: User ID
            limit: Maximum number of orders
            cursor: Cursor for pagination (ObjectId)
            
        Returns:
            List of order documents
        """
        db = get_db()
        
        query = {"customer_info.user_id": user_id}
        
        if cursor:
            try:
                query["_id"] = {"$lt": ObjectId(cursor)}
            except Exception:
                pass
        
        cursor_obj = db[self.collection_name].find(query).sort("_id", -1).limit(limit)
        return [doc async for doc in cursor_obj]
    
    async def update_with_version(
        self,
        order_id: str,
        current_version: int,
        updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Update order with optimistic locking.
        
        Args:
            order_id: Order ID
            current_version: Expected current version
            updates: Fields to update
            
        Returns:
            Updated order document or None if version mismatch
        """
        db = get_db()
        updates["updated_at"] = datetime.utcnow()
        
        result = await db[self.collection_name].find_one_and_update(
            {
                "_id": ObjectId(order_id),
                "version": current_version
            },
            {
                "$set": updates,
                "$inc": {"version": 1}
            },
            return_document=ReturnDocument.AFTER
        )
        
        return result
    
    async def add_status_change(
        self,
        order_id: str,
        status_change: Dict[str, Any]
    ) -> bool:
        """
        Add status change to history.
        
        Args:
            order_id: Order ID
            status_change: Status change record
            
        Returns:
            True if added, False otherwise
        """
        db = get_db()
        status_change["timestamp"] = datetime.utcnow()
        
        result = await db[self.collection_name].update_one(
            {"_id": ObjectId(order_id)},
            {
                "$push": {"status_history": status_change},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return result.modified_count > 0
    
    async def link_guest_orders_to_user(
        self,
        email: str,
        user_id: str
    ) -> int:
        """
        Link guest orders to user account when user registers.
        
        Args:
            email: Customer email
            user_id: User ID to link orders to
            
        Returns:
            Number of orders linked
        """
        db = get_db()
        
        # Find guest orders with matching email
        result = await db[self.collection_name].update_many(
            {
                "customer_info.email": email,
                "customer_info.user_id": None
            },
            {
                "$set": {
                    "customer_info.user_id": user_id,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count

    async def list_orders_admin(
        self,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        payment_method: Optional[str] = None,
        limit: int = 20,
        cursor: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        List all orders with filters for admin (cursor-based pagination).
        
        Args:
            status: Filter by order status
            start_date: Filter orders created after this date
            end_date: Filter orders created before this date
            payment_method: Filter by payment method
            limit: Maximum number of orders
            cursor: Cursor for pagination (ObjectId)
            
        Returns:
            List of order documents
        """
        db = get_db()
        
        query = {}
        
        if status:
            query["status"] = status
        
        if start_date:
            query.setdefault("created_at", {})["$gte"] = start_date
        
        if end_date:
            query.setdefault("created_at", {})["$lte"] = end_date
        
        if payment_method:
            query["payment.method"] = payment_method
        
        if cursor:
            try:
                query["_id"] = {"$lt": ObjectId(cursor)}
            except Exception:
                pass
        
        cursor_obj = db[self.collection_name].find(query).sort("_id", -1).limit(limit)
        return [doc async for doc in cursor_obj]


# Singleton instance
order_repository = OrderRepository()
