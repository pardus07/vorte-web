"""
Product service with business logic, caching, and optimistic locking.

Implements:
- Cache-aside pattern with 5-minute TTL
- Optimistic locking with version field
- If-Match header validation
- Automatic cache invalidation on updates
"""
import json
from typing import Optional, List, Tuple
from decimal import Decimal
from bson import ObjectId
from fastapi import Request

from app.repositories.product_repository import product_repository
from app.services.redis_service import redis_service
from app.core.exceptions import ValidationError, NotFoundError, ConflictError
from app.core.etag import validate_if_match, set_etag_header
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    Product,
    ProductListItem,
    ProductStatus
)
from app.core.config import settings


class ProductService:
    """Service for product operations with caching."""
    
    def __init__(self):
        self.cache_ttl = 300  # 5 minutes
        self.cache_key_prefix = "product:"
    
    def _build_filters(
        self,
        q: Optional[str] = None,
        category_ids: Optional[List[str]] = None,
        brand: Optional[str] = None,
        price_min: Optional[Decimal] = None,
        price_max: Optional[Decimal] = None,
        tags: Optional[List[str]] = None,
        status: Optional[ProductStatus] = None
    ) -> dict:
        """Build MongoDB query filters."""
        filters = {}
        
        # Text search
        if q:
            filters["$text"] = {"$search": q}
        
        # Category filter
        if category_ids:
            filters["category_ids"] = {
                "$in": [ObjectId(cid) for cid in category_ids]
            }
        
        # Brand filter
        if brand:
            filters["brand"] = brand
        
        # Price range filter
        if price_min is not None or price_max is not None:
            price_filter = {}
            if price_min is not None:
                price_filter["$gte"] = float(price_min)
            if price_max is not None:
                price_filter["$lte"] = float(price_max)
            filters["base_price"] = price_filter
        
        # Tags filter
        if tags:
            filters["tags"] = {"$in": tags}
        
        # Status filter
        if status:
            filters["status"] = status.value
        
        return filters
    
    async def _get_from_cache(self, product_id: str) -> Optional[dict]:
        """Get product from Redis cache."""
        try:
            client = await redis_service.get_client()
            cache_key = f"{self.cache_key_prefix}{product_id}"
            cached = await client.get(cache_key)
            
            if cached:
                return json.loads(cached)
        except Exception:
            pass  # Cache miss or error, continue to DB
        
        return None
    
    async def _set_cache(self, product_id: str, product_data: dict) -> None:
        """Set product in Redis cache."""
        try:
            client = await redis_service.get_client()
            cache_key = f"{self.cache_key_prefix}{product_id}"
            await client.setex(
                cache_key,
                self.cache_ttl,
                json.dumps(product_data, default=str)
            )
        except Exception:
            pass  # Cache write failure, not critical
    
    async def _invalidate_cache(self, product_id: str) -> None:
        """Invalidate product cache."""
        try:
            client = await redis_service.get_client()
            cache_key = f"{self.cache_key_prefix}{product_id}"
            await client.delete(cache_key)
        except Exception:
            pass
    
    async def get_by_id(
        self,
        product_id: str,
        published_only: bool = True
    ) -> Optional[Product]:
        """
        Get product by ID with cache-aside pattern.
        
        1. Check cache
        2. If miss, get from DB
        3. Store in cache
        """
        # Try cache first
        cached = await self._get_from_cache(product_id)
        if cached:
            return Product(**product_repository.to_public(cached))
        
        # Cache miss, get from DB
        product_doc = await product_repository.get_by_id(product_id)
        
        if not product_doc:
            return None
        
        # Filter by status if needed
        if published_only and product_doc.get("status") != ProductStatus.ACTIVE.value:
            return None
        
        # Store in cache
        await self._set_cache(product_id, product_doc)
        
        return Product(**product_repository.to_public(product_doc))
    
    async def get_by_slug(self, slug: str) -> Optional[Product]:
        """Get published product by slug."""
        product_doc = await product_repository.get_by_slug(slug, published_only=True)
        
        if not product_doc:
            return None
        
        # Cache by ID
        await self._set_cache(str(product_doc["_id"]), product_doc)
        
        return Product(**product_repository.to_public(product_doc))
    
    async def list_products(
        self,
        q: Optional[str] = None,
        category_ids: Optional[List[str]] = None,
        brand: Optional[str] = None,
        price_min: Optional[Decimal] = None,
        price_max: Optional[Decimal] = None,
        tags: Optional[List[str]] = None,
        limit: int = 20,
        cursor: Optional[str] = None,
        published_only: bool = True
    ) -> Tuple[List[ProductListItem], Optional[str], Optional[str]]:
        """
        List products with filtering and cursor-based pagination.
        
        Returns:
            Tuple of (products, next_cursor, prev_cursor)
        """
        # Build filters
        filters = self._build_filters(
            q=q,
            category_ids=category_ids,
            brand=brand,
            price_min=price_min,
            price_max=price_max,
            tags=tags,
            status=ProductStatus.ACTIVE if published_only else None
        )
        
        # Get products with cursors
        products, next_cursor, prev_cursor = await product_repository.list_products(
            filters=filters,
            limit=limit,
            cursor=cursor
        )
        
        # Convert to list items
        items = [
            ProductListItem(
                id=str(doc["_id"]),
                sku=doc["sku"],
                name=doc["name"],
                slug=doc["slug"],
                base_price=doc["base_price"],
                primary_image=doc.get("images", [{}])[0] if doc.get("images") else None,
                status=ProductStatus(doc["status"]),
                in_stock=any(v.get("stock_quantity", 0) > 0 for v in doc.get("variants", []))
            )
            for doc in products
        ]
        
        return items, next_cursor, prev_cursor
    
    async def create_product(self, product_data: ProductCreate) -> Product:
        """Create a new product (admin only)."""
        # Check slug uniqueness
        if await product_repository.slug_exists(product_data.slug):
            raise ConflictError(
                f"Product with slug '{product_data.slug}' already exists",
                details={"slug": product_data.slug}
            )
        
        # Check SKU uniqueness
        if await product_repository.sku_exists(product_data.sku):
            raise ConflictError(
                f"Product with SKU '{product_data.sku}' already exists",
                details={"sku": product_data.sku}
            )
        
        # Prepare document
        doc = product_data.model_dump()
        doc["status"] = ProductStatus.DRAFT.value
        doc["category_ids"] = [ObjectId(cid) for cid in product_data.category_ids]
        
        # Create product
        created_doc = await product_repository.create(doc)
        
        return Product(**product_repository.to_public(created_doc))
    
    async def update_product(
        self,
        product_id: str,
        update_data: ProductUpdate,
        request: Optional[Request] = None
    ) -> Product:
        """
        Update product with optimistic locking (admin only).
        
        Validates If-Match header if request is provided.
        Uses atomic findOneAndUpdate for version checking.
        
        Args:
            product_id: Product ID to update
            update_data: Fields to update
            request: Optional FastAPI request for If-Match validation
        
        Raises:
            NotFoundError: If product not found
            ConflictError: If version conflict (409)
        """
        # Get current product
        current = await product_repository.get_by_id(product_id)
        if not current:
            raise NotFoundError("Product", product_id)
        
        # Validate If-Match header if request provided
        if request:
            validate_if_match(request, current["version"])
        
        # Prepare update data
        update_dict = update_data.model_dump(exclude_unset=True)
        
        # Check slug uniqueness if changing
        if "slug" in update_dict and update_dict["slug"] != current["slug"]:
            if await product_repository.slug_exists(update_dict["slug"], exclude_id=product_id):
                raise ConflictError(
                    f"Product with slug '{update_dict['slug']}' already exists"
                )
        
        # Update with version check (atomic findOneAndUpdate)
        success = await product_repository.update_with_version(
            product_id,
            current["version"],
            update_dict
        )
        
        if not success:
            raise ConflictError(
                "Resource has been modified by another request",
                details={
                    "current_version": current["version"],
                    "message": "Please refresh and try again"
                }
            )
        
        # Invalidate cache
        await self._invalidate_cache(product_id)
        
        # Get updated product
        updated = await product_repository.get_by_id(product_id)
        
        # Set ETag header if request provided
        if request:
            set_etag_header(request, updated["version"])
        
        return Product(**product_repository.to_public(updated))
    
    async def delete_product(
        self,
        product_id: str,
        request: Optional[Request] = None
    ) -> bool:
        """
        Delete product (admin only).
        
        Validates If-Match header if request is provided.
        Actually performs soft delete by setting status to ARCHIVED.
        
        Args:
            product_id: Product ID to delete
            request: Optional FastAPI request for If-Match validation
        
        Returns:
            True if deleted successfully
        
        Raises:
            NotFoundError: If product not found
            ConflictError: If version conflict
        """
        # Get current product
        current = await product_repository.get_by_id(product_id)
        if not current:
            raise NotFoundError("Product", product_id)
        
        # Validate If-Match header if request provided
        if request:
            validate_if_match(request, current["version"])
        
        # Soft delete: set status to ARCHIVED
        success = await product_repository.update_with_version(
            product_id,
            current["version"],
            {"status": ProductStatus.ARCHIVED.value}
        )
        
        if not success:
            raise ConflictError(
                "Resource has been modified by another request",
                details={"message": "Please refresh and try again"}
            )
        
        # Invalidate cache
        await self._invalidate_cache(product_id)
        
        return True
    
    async def change_status(
        self,
        product_id: str,
        new_status: ProductStatus,
        request: Optional[Request] = None
    ) -> Product:
        """
        Change product status (DRAFT → ACTIVE → ARCHIVED).
        
        Args:
            product_id: Product ID
            new_status: New status
            request: Optional FastAPI request for If-Match validation
        
        Returns:
            Updated product
        
        Raises:
            NotFoundError: If product not found
            ConflictError: If version conflict
        """
        # Get current product
        current = await product_repository.get_by_id(product_id)
        if not current:
            raise NotFoundError("Product", product_id)
        
        # Validate If-Match header if request provided
        if request:
            validate_if_match(request, current["version"])
        
        # Update status
        success = await product_repository.update_with_version(
            product_id,
            current["version"],
            {"status": new_status.value}
        )
        
        if not success:
            raise ConflictError(
                "Resource has been modified by another request"
            )
        
        # Invalidate cache
        await self._invalidate_cache(product_id)
        
        # Get updated product
        updated = await product_repository.get_by_id(product_id)
        
        # Set ETag header if request provided
        if request:
            set_etag_header(request, updated["version"])
        
        return Product(**product_repository.to_public(updated))

    async def add_variant(
        self,
        product_id: str,
        variant_data: dict,
        idempotency_key: str
    ) -> dict:
        """
        Add variant to product.
        
        Args:
            product_id: Product ID
            variant_data: Variant data
            idempotency_key: Idempotency key
            
        Returns:
            Updated product with new variant
        """
        from app.services.db import get_db
        from bson import ObjectId
        import uuid
        
        db = get_db()
        
        # Check idempotency
        cache_key = f"variant:add:{idempotency_key}"
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)
        
        # Get product
        product = await self.repo.get_by_id(product_id)
        if not product:
            raise NotFoundError(f"Product {product_id} not found")
        
        # Generate variant ID
        variant_id = str(uuid.uuid4())
        variant_data["id"] = variant_id
        variant_data["created_at"] = datetime.utcnow()
        
        # Add variant
        result = await db["products"].find_one_and_update(
            {"_id": ObjectId(product_id)},
            {
                "$push": {"variants": variant_data},
                "$inc": {"version": 1},
                "$set": {"updated_at": datetime.utcnow()}
            },
            return_document=True
        )
        
        if not result:
            raise NotFoundError(f"Product {product_id} not found")
        
        # Cache result
        result["_id"] = str(result["_id"])
        await self.redis.setex(cache_key, 86400, json.dumps(result, default=str))
        
        # Invalidate product cache
        await self._invalidate_cache(product_id)
        
        return result
    
    async def update_variant(
        self,
        product_id: str,
        variant_id: str,
        variant_updates: dict,
        current_version: int
    ) -> dict:
        """
        Update product variant with optimistic locking.
        
        Args:
            product_id: Product ID
            variant_id: Variant ID
            variant_updates: Fields to update
            current_version: Current product version
            
        Returns:
            Updated product
        """
        from app.services.db import get_db
        from bson import ObjectId
        
        db = get_db()
        
        # Build update for array element
        update_fields = {}
        for key, value in variant_updates.items():
            update_fields[f"variants.$.{key}"] = value
        
        update_fields["variants.$.updated_at"] = datetime.utcnow()
        
        # Update with optimistic locking
        result = await db["products"].find_one_and_update(
            {
                "_id": ObjectId(product_id),
                "version": current_version,
                "variants.id": variant_id
            },
            {
                "$set": update_fields,
                "$inc": {"version": 1}
            },
            return_document=True
        )
        
        if not result:
            # Check if product exists
            product = await self.repo.get_by_id(product_id)
            if not product:
                raise NotFoundError(f"Product {product_id} not found")
            
            # Version mismatch
            raise ConflictError("Product was modified by another request")
        
        # Invalidate cache
        await self._invalidate_cache(product_id)
        
        result["_id"] = str(result["_id"])
        return result


# Singleton instance
product_service = ProductService()
