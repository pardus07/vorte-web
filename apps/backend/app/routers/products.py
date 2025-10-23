"""Product endpoints (public + admin with RBAC)."""
from typing import Annotated, Optional, List

from fastapi import APIRouter, Query, HTTPException, status, Depends, Header, Response

from app.services.product_service import product_service
from app.core.deps import require_admin
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
    description="List published products with filtering and keyset pagination"
)
async def list_products(
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
    """
    items, next_cursor = await product_service.list_products(
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
    
    return {
        "items": [item.model_dump() for item in items],
        "nextCursor": next_cursor,
        "count": len(items)
    }


@router.get(
    "/{product_id}",
    response_model=Product,
    summary="Get product by ID",
    description="Get published product details with ETag for caching"
)
async def get_product(
    product_id: str,
    response: Response
):
    """
    Get product by ID.
    
    Returns ETag header with version for optimistic concurrency control.
    """
    product = await product_service.get_by_id(product_id, published_only=True)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Set ETag header for caching and optimistic locking
    response.headers["ETag"] = f'W/"{product.version}"'
    response.headers["Cache-Control"] = "public, max-age=300"  # 5 minutes
    
    return product


@router.get(
    "/slug/{slug}",
    response_model=Product,
    summary="Get product by slug",
    description="Get published product by URL-friendly slug"
)
async def get_product_by_slug(
    slug: str,
    response: Response
):
    """Get product by slug."""
    product = await product_service.get_by_slug(slug)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Set ETag and cache headers
    response.headers["ETag"] = f'W/"{product.version}"'
    response.headers["Cache-Control"] = "public, max-age=300"
    
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
    description="List all products including drafts (admin only)"
)
async def list_all_products(
    q: Optional[str] = Query(None),
    category_ids: Optional[List[str]] = Query(None),
    brand: Optional[str] = Query(None),
    status_filter: Optional[ProductStatus] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None)
):
    """List all products including drafts (admin only)."""
    items, next_cursor = await product_service.list_products(
        q=q,
        category_ids=category_ids,
        brand=brand,
        limit=limit,
        cursor=cursor,
        published_only=False  # Admin sees all
    )
    
    return {
        "items": [item.model_dump() for item in items],
        "nextCursor": next_cursor,
        "count": len(items)
    }


@admin_router.get(
    "/{product_id}",
    response_model=Product,
    summary="Get product (admin)",
    description="Get product including drafts (admin only)"
)
async def get_product_admin(
    product_id: str,
    response: Response
):
    """Get product including drafts (admin only)."""
    product = await product_service.get_by_id(product_id, published_only=False)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Set ETag for optimistic locking
    response.headers["ETag"] = f'W/"{product.version}"'
    
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
