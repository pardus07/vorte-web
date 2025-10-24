"""Cart service for business logic."""
import uuid
from typing import Optional, Dict, Any
from bson import ObjectId

from app.repositories.cart_repository import cart_repository
from app.repositories.product_repository import product_repository
from app.services.redis_service import redis_service
from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError


class CartService:
    """Service for cart business logic."""
    
    def __init__(self):
        """Initialize cart service."""
        self.repo = cart_repository
        self.products = product_repository
        self.redis = redis_service
    
    @staticmethod
    def generate_etag(cart: Dict[str, Any]) -> str:
        """
        Generate ETag for cart.
        
        Uses version field for optimistic locking.
        
        Args:
            cart: Cart document
            
        Returns:
            ETag string (e.g., "v5")
        """
        return f'"v{cart["version"]}"'
    
    async def get_cart_cache_key(self, owner_type: str, owner_id: str) -> str:
        """
        Get Redis cache key for cart.
        
        Args:
            owner_type: "user" or "guest"
            owner_id: User ID or guest session ID
            
        Returns:
            Cache key
        """
        return f"cart:{owner_type}:{owner_id}"
    
    async def ensure_cart(
        self,
        owner_id: str,
        owner_type: str,
        currency: str = "TRY"
    ) -> Dict[str, Any]:
        """
        Get or create cart for owner.
        
        Uses cache-aside pattern:
        1. Try Redis cache
        2. If miss, get/create from database
        3. Store in cache
        
        Args:
            owner_id: User ID or guest session ID
            owner_type: "user" or "guest"
            currency: Currency code
            
        Returns:
            Cart document
        """
        # Try cache first
        cache_key = await self.get_cart_cache_key(owner_type, owner_id)
        
        try:
            client = await self.redis.get_client()
            cached = await client.get(cache_key)
            
            if cached:
                import json
                return json.loads(cached)
        except Exception:
            # Redis unavailable, continue without cache
            pass
        
        # Cache miss - get/create from database
        cart = await self.repo.upsert_active(owner_id, owner_type, currency)
        
        # Convert ObjectId to string for JSON serialization
        cart["_id"] = str(cart["_id"])
        
        # Store in cache
        try:
            client = await self.redis.get_client()
            import json
            ttl = getattr(settings, "CART_CACHE_TTL_SECONDS", 900)  # 15 minutes
            await client.setex(
                cache_key,
                ttl,
                json.dumps(cart, default=str)
            )
        except Exception:
            # Redis unavailable, continue without cache
            pass
        
        return cart
    
    async def invalidate_cache(self, owner_type: str, owner_id: str):
        """
        Invalidate cart cache.
        
        Args:
            owner_type: "user" or "guest"
            owner_id: User ID or guest session ID
        """
        cache_key = await self.get_cart_cache_key(owner_type, owner_id)
        
        try:
            client = await self.redis.get_client()
            await client.delete(cache_key)
        except Exception:
            # Redis unavailable, ignore
            pass
    
    async def calculate_totals(
        self,
        items: list,
        applied_coupons: list = None
    ) -> Dict[str, float]:
        """
        Calculate cart totals with automatic campaign application.
        
        Args:
            items: List of cart items
            applied_coupons: List of applied coupon codes
            
        Returns:
            Totals dict with items, shipping, discount, grand_total
        """
        items_total = round(sum(item["subtotal"] for item in items), 2)
        
        # TODO: Calculate shipping based on rules
        shipping = 0.0
        
        # Apply automatic campaigns and coupons
        discount = 0.0
        
        if items:  # Only apply campaigns if cart has items
            try:
                from app.services.campaign_service import campaign_service
                
                context = {
                    "cart_total": items_total,
                    "cart_items": items,
                    "user_role": None  # TODO: Get from authenticated user
                }
                
                discount_result = await campaign_service.calculate_cart_discounts(
                    context,
                    applied_coupons or []
                )
                
                discount = discount_result["total_discount"]
                
                # Apply free shipping if applicable
                if discount_result.get("free_shipping"):
                    shipping = 0.0
                    
            except Exception:
                # If campaign service fails, continue without discounts
                pass
        
        grand_total = round(items_total + shipping - discount, 2)
        
        return {
            "items": items_total,
            "shipping": shipping,
            "discount": discount,
            "grand_total": max(0, grand_total)  # Ensure non-negative
        }
    
    async def add_item(
        self,
        cart: Dict[str, Any],
        product_id: str,
        variant_id: Optional[str],
        qty: int,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Add item to cart.
        
        Supports idempotency via Idempotency-Key header.
        
        Args:
            cart: Current cart document
            product_id: Product ID to add
            variant_id: Optional variant ID
            qty: Quantity to add
            idempotency_key: Optional idempotency key
            
        Returns:
            Updated cart document
            
        Raises:
            ConflictError: If version conflict occurs
            NotFoundError: If product not found
        """
        # Check idempotency
        if idempotency_key:
            idem_key = f"idem:add:{cart['_id']}:{idempotency_key}"
            
            try:
                client = await self.redis.get_client()
                cached_result = await client.get(idem_key)
                
                if cached_result:
                    import json
                    return json.loads(cached_result)
            except Exception:
                # Redis unavailable, continue without idempotency check
                pass
        
        # Validate product
        product = await self.products.get_by_id(product_id)
        
        if not product:
            raise NotFoundError("Product not found")
        
        if product.get("status") != "active":
            raise ConflictError("Product not available for purchase")
        
        # Get unit price (snapshot at add time)
        unit_price = float(product.get("base_price", 0))
        
        # TODO: Validate stock availability
        # await inventory_service.check_availability(product_id, variant_id, qty)
        
        # Update cart items
        items = cart.get("items", [])
        
        # Find existing line item
        existing_line = None
        for item in items:
            if (item["product_id"] == product_id and 
                item.get("variant_id") == variant_id):
                existing_line = item
                break
        
        if existing_line:
            # Update existing line
            existing_line["qty"] += qty
            existing_line["subtotal"] = round(
                existing_line["qty"] * existing_line["unit_price"],
                2
            )
        else:
            # Add new line
            items.append({
                "line_id": str(uuid.uuid4()),
                "product_id": product_id,
                "variant_id": variant_id,
                "qty": qty,
                "unit_price": unit_price,
                "discounts": [],
                "subtotal": round(qty * unit_price, 2)
            })
        
        # Recalculate totals with campaigns
        totals = await self.calculate_totals(items, cart.get("applied_coupons", []))
        
        # Update cart with optimistic locking
        cart_id = str(cart["_id"])
        current_version = cart["version"]
        
        updated = await self.repo.update_with_version(
            cart_id,
            current_version,
            {
                "items": items,
                "totals": totals
            }
        )
        
        if not updated:
            raise ConflictError("Cart was modified by another request")
        
        # Convert ObjectId to string
        updated["_id"] = str(updated["_id"])
        
        # Invalidate cache
        await self.invalidate_cache(cart["owner"]["type"], cart["owner"]["id"])
        
        # Store idempotent result
        if idempotency_key:
            try:
                client = await self.redis.get_client()
                import json
                ttl = getattr(settings, "IDEMPOTENCY_TTL_SECONDS", 86400)  # 24 hours
                await client.setex(
                    idem_key,
                    ttl,
                    json.dumps(updated, default=str)
                )
            except Exception:
                # Redis unavailable, ignore
                pass
        
        return updated
    
    async def update_item_quantity(
        self,
        cart: Dict[str, Any],
        line_id: str,
        qty: int
    ) -> Dict[str, Any]:
        """
        Update cart item quantity.
        
        Args:
            cart: Current cart document
            line_id: Line item ID
            qty: New quantity
            
        Returns:
            Updated cart document
            
        Raises:
            NotFoundError: If line item not found
            ConflictError: If version conflict occurs
        """
        items = cart.get("items", [])
        
        # Find line item
        line_item = None
        for item in items:
            if item["line_id"] == line_id:
                line_item = item
                break
        
        if not line_item:
            raise NotFoundError("Cart item not found")
        
        # Update quantity and subtotal
        line_item["qty"] = qty
        line_item["subtotal"] = round(qty * line_item["unit_price"], 2)
        
        # Recalculate totals with campaigns
        totals = await self.calculate_totals(items, cart.get("applied_coupons", []))
        
        # Update cart with optimistic locking
        cart_id = str(cart["_id"])
        current_version = cart["version"]
        
        updated = await self.repo.update_with_version(
            cart_id,
            current_version,
            {
                "items": items,
                "totals": totals
            }
        )
        
        if not updated:
            raise ConflictError("Cart was modified by another request")
        
        # Convert ObjectId to string
        updated["_id"] = str(updated["_id"])
        
        # Invalidate cache
        await self.invalidate_cache(cart["owner"]["type"], cart["owner"]["id"])
        
        return updated
    
    async def remove_item(
        self,
        cart: Dict[str, Any],
        line_id: str
    ) -> Dict[str, Any]:
        """
        Remove item from cart.
        
        Args:
            cart: Current cart document
            line_id: Line item ID
            
        Returns:
            Updated cart document
            
        Raises:
            NotFoundError: If line item not found
            ConflictError: If version conflict occurs
        """
        items = cart.get("items", [])
        
        # Remove line item
        original_length = len(items)
        items = [item for item in items if item["line_id"] != line_id]
        
        if len(items) == original_length:
            raise NotFoundError("Cart item not found")
        
        # Recalculate totals with campaigns
        totals = await self.calculate_totals(items, cart.get("applied_coupons", []))
        
        # Update cart with optimistic locking
        cart_id = str(cart["_id"])
        current_version = cart["version"]
        
        updated = await self.repo.update_with_version(
            cart_id,
            current_version,
            {
                "items": items,
                "totals": totals
            }
        )
        
        if not updated:
            raise ConflictError("Cart was modified by another request")
        
        # Convert ObjectId to string
        updated["_id"] = str(updated["_id"])
        
        # Invalidate cache
        await self.invalidate_cache(cart["owner"]["type"], cart["owner"]["id"])
        
        return updated


# Singleton instance
cart_service = CartService()
