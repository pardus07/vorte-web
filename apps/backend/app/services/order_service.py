"""Order service for business logic."""
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, List, Optional
from bson import ObjectId

from app.repositories.order_repository import order_repository
from app.repositories.cart_repository import cart_repository
from app.repositories.inventory_repository import inventory_repository
from app.repositories.reservation_repository import reservation_repository
from app.services.db import TransactionContext
from app.services.payment_service import payment_service
from app.core.exceptions import ValidationError, ConflictError, NotFoundError


class OrderService:
    """Service for order business logic."""
    
    # Valid status transitions
    STATUS_TRANSITIONS = {
        "created": ["paid", "cancelled"],
        "paid": ["picking", "cancelled"],
        "picking": ["shipped", "cancelled"],
        "shipped": ["delivered"],
        "delivered": ["returned"],
        "cancelled": [],
        "returned": []
    }
    
    def __init__(self):
        """Initialize order service."""
        self.repo = order_repository
        self.cart_repo = cart_repository
        self.inventory_repo = inventory_repository
        self.reservation_repo = reservation_repository
        self.payment_service = payment_service
    
    @staticmethod
    def generate_etag(order: Dict[str, Any]) -> str:
        """
        Generate ETag for order.
        
        Args:
            order: Order document
            
        Returns:
            ETag string
        """
        return f'"v{order["version"]}"'
    
    def validate_status_transition(
        self,
        from_status: str,
        to_status: str
    ) -> bool:
        """
        Validate if status transition is allowed.
        
        Args:
            from_status: Current status
            to_status: Target status
            
        Returns:
            True if transition is valid
        """
        allowed = self.STATUS_TRANSITIONS.get(from_status, [])
        return to_status in allowed

    
    async def create_order_from_cart(
        self,
        cart_id: str,
        shipping_address: Dict[str, Any],
        billing_address: Dict[str, Any],
        payment_method: str,
        customer_info: Dict[str, Any],
        idempotency_key: str
    ) -> Dict[str, Any]:
        """
        Create order from cart with MongoDB transaction.
        
        Steps:
        1. Validate cart
        2. Reserve stock
        3. Create order
        4. Mark cart as checked out
        
        All steps are atomic within a transaction.
        
        Args:
            cart_id: Cart ID
            shipping_address: Shipping address
            billing_address: Billing address
            payment_method: Payment method
            customer_info: Customer information
            idempotency_key: Idempotency key
            
        Returns:
            Created order document
            
        Raises:
            ValidationError: If validation fails
            ConflictError: If stock unavailable
        """
        # Get cart
        cart = await self.cart_repo.get_by_id(cart_id)
        if not cart:
            raise NotFoundError("Cart not found")
        
        if not cart.get("items"):
            raise ValidationError("Cart is empty")
        
        # Validate stock availability
        for item in cart["items"]:
            product_id = item["product_id"]
            variant_id = item.get("variant_id")
            qty = item["qty"]
            
            available = await self.inventory_repo.check_availability(
                product_id,
                variant_id,
                qty
            )
            
            if not available:
                raise ConflictError(
                    f"Insufficient stock for product {product_id}"
                )
        
        # Use MongoDB transaction
        async with TransactionContext() as session:
            # Reserve stock for all items
            reservation_ids = []
            
            for item in cart["items"]:
                product_id = item["product_id"]
                variant_id = item.get("variant_id")
                qty = item["qty"]
                
                reservation = await self.reservation_repo.create_reservation(
                    product_id=product_id,
                    variant_id=variant_id,
                    quantity=qty,
                    order_id=None,  # Will update after order creation
                    expires_in_minutes=30,
                    session=session
                )
                
                reservation_ids.append(str(reservation["_id"]))
            
            # Generate tracking token for guest orders
            import secrets
            tracking_token = None
            if not customer_info.get("user_id"):
                tracking_token = secrets.token_urlsafe(32)
            
            # Create order document
            order_doc = {
                "customer_info": customer_info,
                "items": self._prepare_order_items(cart["items"]),
                "subtotal": cart["totals"]["items"],
                "discount_total": cart["totals"].get("discount", 0),
                "shipping_cost": cart["totals"].get("shipping", 0),
                "tax": 0,  # TODO: Calculate tax
                "total": cart["totals"]["grand_total"],
                "payment": {
                    "provider": "mock",
                    "method": payment_method,
                    "transaction_id": "",
                    "idempotency_key": idempotency_key,
                    "status": "initiated",
                    "amount": cart["totals"]["grand_total"],
                    "currency": "TRY"
                },
                "shipping_address": shipping_address,
                "billing_address": billing_address,
                "status": "created",
                "status_history": [],
                "reservation_ids": reservation_ids,
                "tracking_token": tracking_token,
                "notes": ""
            }
            
            # Create order
            order = await self.repo.create(order_doc)
            
            # Update reservations with order_id
            for res_id in reservation_ids:
                await self.reservation_repo.update_reservation(
                    res_id,
                    {"order_id": str(order["_id"])},
                    session=session
                )
            
            # Mark cart as checked out
            await self.cart_repo.mark_checked_out(cart_id)
        
        return order

    
    def _prepare_order_items(self, cart_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Prepare order items from cart items.
        
        Args:
            cart_items: Cart items
            
        Returns:
            Order items with denormalized data
        """
        order_items = []
        
        for item in cart_items:
            order_items.append({
                "product_id": item["product_id"],
                "variant_id": item.get("variant_id"),
                "product_name": item.get("product_name", ""),
                "sku": item.get("sku", ""),
                "attributes": item.get("attributes", {}),
                "quantity": item["qty"],
                "unit_price": item["unit_price"],
                "subtotal": item["subtotal"],
                "discount": 0,
                "image_url": item.get("image_url")
            })
        
        return order_items
    
    async def update_order_status(
        self,
        order_id: str,
        new_status: str,
        changed_by: str,
        reason: Optional[str] = None,
        current_version: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Update order status with validation.
        
        Args:
            order_id: Order ID
            new_status: New status
            changed_by: User ID or 'system'
            reason: Optional reason
            current_version: Current version for optimistic locking
            
        Returns:
            Updated order document
            
        Raises:
            ValidationError: If transition invalid
            ConflictError: If version mismatch
        """
        # Get current order
        order = await self.repo.get_by_id(order_id)
        if not order:
            raise NotFoundError("Order not found")
        
        current_status = order["status"]
        
        # Validate transition
        if not self.validate_status_transition(current_status, new_status):
            raise ValidationError(
                f"Invalid status transition from {current_status} to {new_status}"
            )
        
        # Prepare status change record
        status_change = {
            "from_status": current_status,
            "to_status": new_status,
            "changed_by": changed_by,
            "reason": reason,
            "timestamp": datetime.utcnow()
        }
        
        # Update with optimistic locking if version provided
        if current_version is not None:
            updated = await self.repo.update_with_version(
                order_id,
                current_version,
                {
                    "status": new_status,
                    "$push": {"status_history": status_change}
                }
            )
            
            if not updated:
                raise ConflictError("Order was modified by another request")
            
            return updated
        else:
            # Update without version check
            await self.repo.add_status_change(order_id, status_change)
            
            from app.services.db import get_db
            db = get_db()
            await db["orders"].update_one(
                {"_id": ObjectId(order_id)},
                {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
            )
            
            return await self.repo.get_by_id(order_id)
    
    async def cancel_order(
        self,
        order_id: str,
        reason: str,
        current_version: int
    ) -> Dict[str, Any]:
        """
        Cancel order and release reservations.
        
        Args:
            order_id: Order ID
            reason: Cancellation reason
            current_version: Current version
            
        Returns:
            Updated order document
        """
        order = await self.repo.get_by_id(order_id)
        if not order:
            raise NotFoundError("Order not found")
        
        # Can only cancel before shipped
        if order["status"] not in ["created", "paid", "picking"]:
            raise ValidationError("Cannot cancel order after shipping")
        
        # Release reservations
        reservation_ids = order.get("reservation_ids", [])
        for res_id in reservation_ids:
            await self.reservation_repo.release_reservation(res_id)
        
        # Update status
        return await self.update_order_status(
            order_id,
            "cancelled",
            "user",
            reason,
            current_version
        )

    async def update_order_status_admin(
        self,
        order_id: str,
        new_status: str,
        admin_user_id: str,
        reason: Optional[str] = None,
        current_version: int = None
    ) -> Dict[str, Any]:
        """
        Update order status (admin operation).
        
        Args:
            order_id: Order ID
            new_status: New status
            admin_user_id: Admin user ID
            reason: Optional reason
            current_version: Current version for optimistic locking
            
        Returns:
            Updated order document
        """
        return await self.update_order_status(
            order_id=order_id,
            new_status=new_status,
            changed_by=admin_user_id,
            reason=reason,
            current_version=current_version
        )
    
    async def create_manual_order(
        self,
        customer_info: Dict[str, Any],
        items: List[Dict[str, Any]],
        shipping_address: Dict[str, Any],
        billing_address: Dict[str, Any],
        payment_method: str,
        idempotency_key: str,
        admin_user_id: str
    ) -> Dict[str, Any]:
        """
        Create manual order (admin operation).
        
        Args:
            customer_info: Customer information
            items: Order items
            shipping_address: Shipping address
            billing_address: Billing address
            payment_method: Payment method
            idempotency_key: Idempotency key
            admin_user_id: Admin user ID
            
        Returns:
            Created order document
        """
        # Calculate totals
        subtotal = sum(item["unit_price"] * item["quantity"] for item in items)
        
        order_doc = {
            "customer_info": customer_info,
            "items": items,
            "subtotal": subtotal,
            "discount_total": 0,
            "shipping_cost": 0,
            "tax": 0,
            "total": subtotal,
            "payment": {
                "provider": "manual",
                "method": payment_method,
                "transaction_id": f"MANUAL-{idempotency_key}",
                "idempotency_key": idempotency_key,
                "status": "captured",
                "amount": subtotal,
                "currency": "TRY"
            },
            "shipping_address": shipping_address,
            "billing_address": billing_address,
            "status": "paid",
            "status_history": [{
                "from_status": None,
                "to_status": "paid",
                "changed_by": admin_user_id,
                "reason": "Manual order creation",
                "timestamp": datetime.utcnow()
            }],
            "reservation_ids": [],
            "tracking_token": None,
            "notes": f"Manual order created by admin {admin_user_id}"
        }
        
        return await self.repo.create(order_doc)


# Singleton instance
order_service = OrderService()
