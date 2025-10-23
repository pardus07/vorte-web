"""Inventory service for stock management with atomic operations."""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from bson import ObjectId

from app.repositories.inventory_repository import inventory_repository
from app.repositories.reservation_repository import reservation_repository
from app.services.db import get_db, get_client
from app.core.exceptions import ConflictError, NotFoundError
from app.core.config import settings


class InventoryService:
    """Service for inventory business logic with transaction support."""
    
    def __init__(self):
        """Initialize inventory service."""
        self.inventory_repo = inventory_repository
        self.reservation_repo = reservation_repository
    
    async def check_availability(self, sku: str) -> Dict[str, Any]:
        """
        Check stock availability for a SKU.
        
        Args:
            sku: Product SKU
            
        Returns:
            Dict with sku, available, low_stock
            
        Raises:
            NotFoundError: If SKU not found
        """
        item = await self.inventory_repo.get_by_sku(sku)
        
        if not item:
            raise NotFoundError(f"SKU not found: {sku}")
        
        available = item["on_hand"] - item["reserved"]
        low_stock = available <= item.get("low_stock_threshold", 10)
        
        return {
            "sku": sku,
            "available": available,
            "low_stock": low_stock
        }
    
    async def reserve(
        self,
        owner_id: str,
        owner_type: str,  # "user" or "guest"
        items: List[Dict[str, Any]],  # [{"sku": str, "qty": int}, ...]
        idempotency_key: Optional[str] = None,
        ttl_seconds: int = 900  # 15 minutes default
    ) -> Dict[str, Any]:
        """
        Reserve stock for items (atomic with transaction).
        
        Uses MongoDB transaction to ensure atomicity across:
        1. Creating reservation record
        2. Decrementing available stock
        
        Supports idempotency via idempotency_key.
        
        Args:
            owner_id: User ID or guest session ID
            owner_type: "user" or "guest"
            items: List of items to reserve [{"sku": str, "qty": int}, ...]
            idempotency_key: Optional idempotency key for safe retries
            ttl_seconds: Reservation TTL in seconds
            
        Returns:
            Reservation document
            
        Raises:
            ConflictError: If insufficient stock
            ValueError: If validation fails
        """
        # Check idempotency first (outside transaction)
        if idempotency_key:
            existing = await self.reservation_repo.find_by_idempotency_key(idempotency_key)
            if existing:
                # Return existing reservation (idempotent)
                return existing
        
        # Validate items
        if not items:
            raise ValueError("Items list cannot be empty")
        
        # Start transaction
        client = get_client()
        async with await client.start_session() as session:
            async with session.start_transaction():
                try:
                    # Create reservation record
                    user_id = owner_id if owner_type == "user" else None
                    guest_id = owner_id if owner_type == "guest" else None
                    
                    reservation = await self.reservation_repo.create(
                        user_id=user_id,
                        guest_id=guest_id,
                        items=items,
                        idempotency_key=idempotency_key,
                        ttl_seconds=ttl_seconds,
                        session=session
                    )
                    
                    # Reserve stock for each item (atomic)
                    for item in items:
                        sku = item["sku"]
                        qty = item["qty"]
                        
                        # Atomic conditional update
                        result = await self.inventory_repo.try_reserve_one(
                            sku=sku,
                            qty=qty,
                            session=session
                        )
                        
                        if not result:
                            # Insufficient stock - transaction will rollback
                            raise ConflictError(
                                f"Insufficient stock for SKU: {sku}. "
                                f"Requested: {qty}"
                            )
                    
                    # All reservations successful
                    return reservation
                    
                except Exception as e:
                    # Transaction will auto-rollback on exception
                    raise
    
    async def release(self, reservation_id: str) -> bool:
        """
        Release reservation and return stock (atomic with transaction).
        
        Args:
            reservation_id: Reservation ID
            
        Returns:
            True if released, False if not found or already released
            
        Raises:
            RuntimeError: If release fails
        """
        client = get_client()
        async with await client.start_session() as session:
            async with session.start_transaction():
                try:
                    # Get reservation
                    reservation = await self.reservation_repo.find_by_id(reservation_id)
                    
                    if not reservation:
                        return False
                    
                    if reservation["status"] != "pending":
                        # Already released or committed
                        return False
                    
                    # Release stock for each item
                    for item in reservation["items"]:
                        sku = item["sku"]
                        qty = item["qty"]
                        
                        result = await self.inventory_repo.release_one(
                            sku=sku,
                            qty=qty,
                            session=session
                        )
                        
                        if not result:
                            raise RuntimeError(
                                f"Failed to release stock for SKU: {sku}"
                            )
                    
                    # Update reservation status
                    await self.reservation_repo.update_status(
                        reservation_id=reservation_id,
                        status="released",
                        session=session
                    )
                    
                    return True
                    
                except Exception as e:
                    # Transaction will auto-rollback
                    raise
    
    async def commit(self, reservation_id: str) -> bool:
        """
        Commit reservation (finalize sale after payment).
        
        Decrements both on_hand and reserved stock.
        
        Args:
            reservation_id: Reservation ID
            
        Returns:
            True if committed, False if not found or already committed
            
        Raises:
            RuntimeError: If commit fails
        """
        client = get_client()
        async with await client.start_session() as session:
            async with session.start_transaction():
                try:
                    # Get reservation
                    reservation = await self.reservation_repo.find_by_id(reservation_id)
                    
                    if not reservation:
                        return False
                    
                    if reservation["status"] != "pending":
                        # Already committed or released
                        return False
                    
                    # Commit stock for each item
                    for item in reservation["items"]:
                        sku = item["sku"]
                        qty = item["qty"]
                        
                        result = await self.inventory_repo.commit_one(
                            sku=sku,
                            qty=qty,
                            session=session
                        )
                        
                        if not result:
                            raise RuntimeError(
                                f"Failed to commit stock for SKU: {sku}"
                            )
                    
                    # Update reservation status
                    await self.reservation_repo.update_status(
                        reservation_id=reservation_id,
                        status="committed",
                        session=session
                    )
                    
                    return True
                    
                except Exception as e:
                    # Transaction will auto-rollback
                    raise
    
    async def adjust_stock(
        self,
        sku: str,
        delta: int,
        reason: str
    ) -> Dict[str, Any]:
        """
        Adjust stock quantity (admin operation).
        
        Args:
            sku: Product SKU
            delta: Stock adjustment (positive or negative)
            reason: Adjustment reason
            
        Returns:
            Updated inventory document
            
        Raises:
            NotFoundError: If SKU not found
        """
        result = await self.inventory_repo.adjust_stock(sku, delta)
        
        if not result:
            raise NotFoundError(f"SKU not found: {sku}")
        
        # TODO: Log adjustment with reason and admin user
        
        return result
    
    async def get_low_stock_items(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get items with low stock.
        
        Args:
            limit: Maximum number of items to return
            
        Returns:
            List of inventory items with low stock
        """
        return await self.inventory_repo.get_low_stock_items(limit)
    
    async def release_expired_reservations(self) -> int:
        """
        Release expired pending reservations (reaper job).
        
        This should be called periodically (e.g., every 60 seconds)
        to handle TTL cleanup delays.
        
        Returns:
            Number of reservations released
        """
        expired = await self.reservation_repo.find_expired_pending(limit=100)
        
        released_count = 0
        for reservation in expired:
            try:
                reservation_id = reservation["reservation_id"]
                success = await self.release(reservation_id)
                if success:
                    released_count += 1
            except Exception as e:
                # Log error but continue with other reservations
                print(f"Error releasing reservation {reservation.get('reservation_id')}: {e}")
        
        return released_count


# Singleton instance
inventory_service = InventoryService()
