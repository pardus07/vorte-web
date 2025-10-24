"""Wishlist and product comparison endpoints."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.services.wishlist_service import wishlist_service, comparison_service
from app.core.deps import get_current_user
from app.core.exceptions import NotFoundError


router = APIRouter(prefix="/api/v1", tags=["Wishlist & Comparison"])


class AddToWishlistRequest(BaseModel):
    """Request to add product to wishlist."""
    product_id: str


class CompareProductsRequest(BaseModel):
    """Request to compare products."""
    product_ids: List[str]


@router.get(
    "/wishlist",
    summary="Get user wishlist",
    description="Get all products in user's wishlist"
)
async def get_wishlist(user=Depends(get_current_user)):
    """
    Get user's wishlist.
    
    Returns list of wishlist items with product details.
    """
    items = await wishlist_service.get_wishlist(str(user.id))
    
    return {
        "items": items,
        "count": len(items)
    }


@router.post(
    "/wishlist/items",
    status_code=status.HTTP_201_CREATED,
    summary="Add product to wishlist",
    description="Add a product to user's wishlist"
)
async def add_to_wishlist(
    req: AddToWishlistRequest,
    user=Depends(get_current_user)
):
    """
    Add product to wishlist.
    
    Returns the created wishlist item.
    """
    try:
        item = await wishlist_service.add_to_wishlist(
            user_id=str(user.id),
            product_id=req.product_id
        )
        
        return item
        
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete(
    "/wishlist/items/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove product from wishlist",
    description="Remove a product from user's wishlist"
)
async def remove_from_wishlist(
    product_id: str,
    user=Depends(get_current_user)
):
    """
    Remove product from wishlist.
    
    Returns 204 No Content on success.
    """
    removed = await wishlist_service.remove_from_wishlist(
        user_id=str(user.id),
        product_id=product_id
    )
    
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not in wishlist"
        )


@router.post(
    "/compare",
    summary="Compare products",
    description="Compare up to 4 products side-by-side"
)
async def compare_products(req: CompareProductsRequest):
    """
    Compare products side-by-side.
    
    Accepts up to 4 product IDs and returns comparison data.
    If more than 4 products are provided, only the first 4 are compared.
    """
    if not req.product_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one product ID is required"
        )
    
    comparison = await comparison_service.compare_products(req.product_ids)
    
    if comparison["count"] == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No valid products found for comparison"
        )
    
    return comparison
