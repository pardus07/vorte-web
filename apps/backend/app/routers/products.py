"""
Product endpoints (public + admin with RBAC).

Implements:
- RFC 8288 Link headers for pagination
- Strong ETags for conditional requests
- Cache-Control headers
- Cursor-based pagination
"""
from typing import Annotated, Optional, List

from fastapi import APIRouter, Query, HTTPException, status, Depends, Header, Response, Request

from app.services.product_service import product_service
from app.core.deps import require_admin
from app.core.pagination import set_pagination_headers, set_cache_headers
from app.core.etag import generate_etag
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    Product,
    ProductListItem,
    ProductStatus
)
from app.schemas.common import PaginationParams


# Public product endpoints
router = APIRouter(prefix="/api/v1/products", tags=["Products"])


@router.get(
    "",
    response_model=dict,
    summary="List products",
    description="List published products with filtering and cursor-based pagination"
)
async def list_products(
    request: Request,
    response: Response,
    q: Optional[str] = Query(None, description="Full-text search query"),
    category_ids: Optional[List[str]] = Query(None, description="Filter by category IDs"),
    brand: Optional[str] = Query(None, description="Filter by brand"),
    price_min: Optional[float] = Query(None, ge=0, description="Minimum price"),
    price_max: Optional[float] = Query(None, ge=0, description="Maximum price"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    cursor: Optional[str] = Query(None, description="Cursor for next page")
):
    """
    List published products with filtering and pagination.
    
    Uses keyset (cursor-based) pagination for stable results.
    Text search uses MongoDB text index on name, description, and tags.
    
    Returns RFC 8288 Link headers for pagination:
    - Link: <url?cursor=...>; rel="next"
    - Link: <url?cursor=...>; rel="prev"
    """
    items, next_cursor, prev_cursor = await product_service.list_products(
        q=q,
        category_ids=category_ids,
        brand=brand,
        price_min=price_min,
        price_max=price_max,
        tags=tags,
        limit=limit,
        cursor=cursor,
        published_only=True
    )
    
    # Set RFC 8288 Link headers for pagination
    set_pagination_headers(request, response, next_cursor, prev_cursor)
    
    # Set cache headers
    set_cache_headers(response, max_age=300, public=True)
    
    return {
        "items": [item.model_dump() for item in items],
        "nextCursor": next_cursor,
        "prevCursor": prev_cursor,
        "count": len(items)
    }


@router.get(
    "/{product_id}",
    response_model=Product,
    summary="Get product by ID",
    description="Get published product details with strong ETag for caching"
)
async def get_product(
    product_id: str,
    response: Response
):
    """
    Get product by ID.
    
    Returns strong ETag header (RFC 9110) with version for:
    - Optimistic concurrency control (If-Match)
    - Conditional requests (If-None-Match)
    - HTTP caching
    
    ETag format: "v{version}" (strong ETag, no W/ prefix)
    """
    product = await product_service.get_by_id(product_id, published_only=True)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Set strong ETag header (no W/ prefix)
    etag = generate_etag(product.version)
    set_cache_headers(response, max_age=300, public=True, etag=etag)
    
    return product


@router.get(
    "/slug/{slug}",
    response_model=Product,
    summary="Get product by slug",
    description="Get published product by URL-friendly slug with strong ETag"
)
async def get_product_by_slug(
    slug: str,
    response: Response
):
    """
    Get product by slug.
    
    Returns strong ETag header for caching and conditional requests.
    """
    product = await product_service.get_by_slug(slug)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Set strong ETag and cache headers
    etag = generate_etag(product.version)
    set_cache_headers(response, max_age=300, public=True, etag=etag)
    
    return product


# Admin product endpoints (RBAC protected)
admin_router = APIRouter(
    prefix="/api/v1/admin/products",
    tags=["Admin: Products"],
    dependencies=[Depends(require_admin)]
)


@admin_router.post(
    "",
    response_model=Product,
    status_code=status.HTTP_201_CREATED,
    summary="Create product",
    description="Create a new product (admin only)"
)
async def create_product(
    product_data: ProductCreate
):
    """
    Create a new product.
    
    Requires admin role.
    Validates slug and SKU uniqueness.
    """
    product = await product_service.create_product(product_data)
    return product


@admin_router.get(
    "",
    response_model=dict,
    summary="List all products (admin)",
    description="List all products including drafts with RFC 8288 Link headers (admin only)"
)
async def list_all_products(
    request: Request,
    response: Response,
    q: Optional[str] = Query(None),
    category_ids: Optional[List[str]] = Query(None),
    brand: Optional[str] = Query(None),
    status_filter: Optional[ProductStatus] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None)
):
    """
    List all products including drafts (admin only).
    
    Returns RFC 8288 Link headers for pagination.
    """
    items, next_cursor, prev_cursor = await product_service.list_products(
        q=q,
        category_ids=category_ids,
        brand=brand,
        limit=limit,
        cursor=cursor,
        published_only=False  # Admin sees all
    )
    
    # Set RFC 8288 Link headers
    set_pagination_headers(request, response, next_cursor, prev_cursor)
    
    return {
        "items": [item.model_dump() for item in items],
        "nextCursor": next_cursor,
        "prevCursor": prev_cursor,
        "count": len(items)
    }


@admin_router.get(
    "/{product_id}",
    response_model=Product,
    summary="Get product (admin)",
    description="Get product including drafts with strong ETag (admin only)"
)
async def get_product_admin(
    product_id: str,
    response: Response
):
    """
    Get product including drafts (admin only).
    
    Returns strong ETag for If-Match validation on updates.
    """
    product = await product_service.get_by_id(product_id, published_only=False)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Set strong ETag for optimistic locking
    etag = generate_etag(product.version)
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "private, no-cache"  # Admin data, no public cache
    
    return product


@admin_router.patch(
    "/{product_id}",
    response_model=Product,
    summary="Update product",
    description="Update product with optimistic locking (admin only)"
)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    if_match: Optional[str] = Header(
        None,
        description="ETag from GET request for optimistic locking"
    )
):
    """
    Update product with optimistic locking.
    
    Requires If-Match header with ETag (version) from GET request.
    Returns 409 Conflict if version mismatch (concurrent modification).
    Returns 428 Precondition Required if If-Match header missing.
    """
    if not if_match:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="If-Match header required for updates"
        )
    
    # Extract version from ETag
    try:
        # ETag format: W/"<version>"
        version_str = if_match.replace('W/"', '').replace('"', '')
        current_version = int(version_str)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid If-Match header format"
        )
    
    # Update product
    product = await product_service.update_product(
        product_id,
        current_version,
        product_data
    )
    
    return product


@admin_router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete product",
    description="Delete product (admin only)"
)
async def delete_product(product_id: str):
    """Delete product (admin only)."""
    success = await product_service.delete_product(product_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)



@admin_router.post(
    "/{product_id}/variants",
    status_code=status.HTTP_201_CREATED,
    summary="Add product variant",
    description="Add variant to product with idempotency (admin only)"
)
async def add_variant(
    product_id: str,
    variant_data: dict,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
):
    """
    Add variant to product.
    
    Requires Idempotency-Key header.
    """
    if not idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Idempotency-Key header required"
        )
    
    try:
        product = await product_service.add_variant(
            product_id=product_id,
            variant_data=variant_data,
            idempotency_key=idempotency_key
        )
        
        return product
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@admin_router.patch(
    "/{product_id}/variants/{variant_id}",
    summary="Update product variant",
    description="Update variant with optimistic locking (admin only)"
)
async def update_variant(
    product_id: str,
    variant_id: str,
    variant_updates: dict,
    if_match: Optional[str] = Header(None, alias="If-Match")
):
    """
    Update product variant.
    
    Requires If-Match header with product ETag.
    """
    if not if_match:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="If-Match header required"
        )
    
    try:
        # Extract version from ETag
        version_str = if_match.replace('W/"', '').replace('"', '')
        current_version = int(version_str)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid If-Match header format"
        )
    
    try:
        product = await product_service.update_variant(
            product_id=product_id,
            variant_id=variant_id,
            variant_updates=variant_updates,
            current_version=current_version
        )
        
        return product
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
