"""Cart endpoints for shopping cart management."""
import uuid
from typing import Optional, Tuple

from fastapi import APIRouter, Depends, Header, Response, Request, HTTPException, status

from app.services.cart_service import cart_service
from app.core.deps import optional_current_user
from app.core.exceptions import ConflictError, NotFoundError
from app.schemas.cart import AddItemRequest, UpdateItemRequest


router = APIRouter(prefix="/api/v1/cart", tags=["Cart"])


def resolve_cart_owner(
    request: Request,
    user=Depends(optional_current_user)
) -> Tuple[str, str]:
    """
    Resolve cart owner (user or guest).
    
    For authenticated users, returns ("user", user_id).
    For guests, returns ("guest", session_id) from cookie or generates new one.
    
    Args:
        request: FastAPI request
        user: Optional current user
        
    Returns:
        Tuple of (owner_type, owner_id)
    """
    if user:
        return ("user", str(user.id))
    
    # Guest - check for existing cart_id cookie
    cart_cookie = request.cookies.get("cart_id")
    
    if not cart_cookie:
        # Generate new guest session ID
        cart_cookie = str(uuid.uuid4())
    
    return ("guest", cart_cookie)


@router.get(
    "",
    summary="Get cart",
    description="Get current cart for user or guest"
)
async def get_cart(
    response: Response,
    request: Request,
    owner: Tuple[str, str] = Depends(resolve_cart_owner)
):
    """
    Get current cart.
    
    Returns cart with ETag header for optimistic locking.
    For guest users, sets cart_id cookie.
    """
    owner_type, owner_id = owner
    
    # Get or create cart
    cart = await cart_service.ensure_cart(owner_id, owner_type)
    
    # Set ETag header
    etag = cart_service.generate_etag(cart)
    response.headers["ETag"] = etag
    
    # Set cache control
    response.headers["Cache-Control"] = "private, no-cache"
    
    # For guest users, set cart_id cookie
    if owner_type == "guest":
        response.set_cookie(
            key="cart_id",
            value=owner_id,
            httponly=True,
            samesite="lax",
            secure=False,  # Set to True in production with HTTPS
            max_age=7 * 24 * 60 * 60  # 7 days
        )
    
    return cart


@router.post(
    "/items",
    status_code=status.HTTP_200_OK,
    summary="Add item to cart",
    description="Add product to cart with stock validation and idempotency support"
)
async def add_item(
    req: AddItemRequest,
    response: Response,
    request: Request,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    owner: Tuple[str, str] = Depends(resolve_cart_owner)
):
    """
    Add item to cart.
    
    Requires If-Match header with ETag for optimistic locking.
    Supports Idempotency-Key header for safe retries.
    
    Returns:
        Updated cart with new ETag
        
    Raises:
        428: If-Match header required
        409: ETag mismatch or version conflict
        404: Product not found
    """
    owner_type, owner_id = owner
    
    # Get current cart
    cart = await cart_service.ensure_cart(owner_id, owner_type)
    
    # Validate If-Match header (RFC 9110)
    current_etag = cart_service.generate_etag(cart)
    
    if if_match is None:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="If-Match header required for cart modifications"
        )
    
    if if_match != current_etag:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ETag mismatch - cart was modified"
        )
    
    # Add item to cart
    try:
        updated_cart = await cart_service.add_item(
            cart,
            req.product_id,
            req.variant_id,
            req.qty,
            idempotency_key
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    
    # Set new ETag
    new_etag = cart_service.generate_etag(updated_cart)
    response.headers["ETag"] = new_etag
    response.headers["Cache-Control"] = "private, no-cache"
    
    # For guest users, ensure cart_id cookie is set
    if owner_type == "guest":
        response.set_cookie(
            key="cart_id",
            value=owner_id,
            httponly=True,
            samesite="lax",
            secure=False,
            max_age=7 * 24 * 60 * 60
        )
    
    return updated_cart


@router.patch(
    "/items/{line_id}",
    summary="Update cart item",
    description="Update cart item quantity"
)
async def update_item(
    line_id: str,
    req: UpdateItemRequest,
    response: Response,
    request: Request,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    owner: Tuple[str, str] = Depends(resolve_cart_owner)
):
    """
    Update cart item quantity.
    
    Requires If-Match header with ETag for optimistic locking.
    
    Returns:
        Updated cart with new ETag
        
    Raises:
        428: If-Match header required
        409: ETag mismatch or version conflict
        404: Cart item not found
    """
    owner_type, owner_id = owner
    
    # Get current cart
    cart = await cart_service.ensure_cart(owner_id, owner_type)
    
    # Validate If-Match header
    current_etag = cart_service.generate_etag(cart)
    
    if if_match is None:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="If-Match header required for cart modifications"
        )
    
    if if_match != current_etag:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ETag mismatch - cart was modified"
        )
    
    # Update item quantity
    try:
        updated_cart = await cart_service.update_item_quantity(
            cart,
            line_id,
            req.qty
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    
    # Set new ETag
    new_etag = cart_service.generate_etag(updated_cart)
    response.headers["ETag"] = new_etag
    response.headers["Cache-Control"] = "private, no-cache"
    
    return updated_cart


@router.delete(
    "/items/{line_id}",
    status_code=status.HTTP_200_OK,
    summary="Remove cart item",
    description="Remove item from cart"
)
async def remove_item(
    line_id: str,
    response: Response,
    request: Request,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    owner: Tuple[str, str] = Depends(resolve_cart_owner)
):
    """
    Remove item from cart.
    
    Requires If-Match header with ETag for optimistic locking.
    
    Returns:
        Updated cart with new ETag
        
    Raises:
        428: If-Match header required
        409: ETag mismatch or version conflict
        404: Cart item not found
    """
    owner_type, owner_id = owner
    
    # Get current cart
    cart = await cart_service.ensure_cart(owner_id, owner_type)
    
    # Validate If-Match header
    current_etag = cart_service.generate_etag(cart)
    
    if if_match is None:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="If-Match header required for cart modifications"
        )
    
    if if_match != current_etag:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ETag mismatch - cart was modified"
        )
    
    # Remove item
    try:
        updated_cart = await cart_service.remove_item(cart, line_id)
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    
    # Set new ETag
    new_etag = cart_service.generate_etag(updated_cart)
    response.headers["ETag"] = new_etag
    response.headers["Cache-Control"] = "private, no-cache"
    
    return updated_cart



@router.post(
    "/apply-coupon",
    summary="Apply coupon to cart",
    description="Apply a coupon code to the cart and calculate discount"
)
async def apply_coupon(
    coupon_code: str,
    response: Response,
    request: Request,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    owner: Tuple[str, str] = Depends(resolve_cart_owner)
):
    """
    Apply coupon code to cart.
    
    Requires If-Match header with ETag for optimistic locking.
    
    Args:
        coupon_code: Coupon code to apply
        response: FastAPI response
        request: FastAPI request
        if_match: ETag for optimistic locking
        owner: Cart owner tuple
        
    Returns:
        Updated cart with applied coupon
        
    Raises:
        428: If-Match header required
        409: ETag mismatch or version conflict
        404: Invalid coupon code
    """
    from app.services.campaign_service import campaign_service
    
    owner_type, owner_id = owner
    
    # Get current cart
    cart = await cart_service.ensure_cart(owner_id, owner_type)
    
    # Validate If-Match header
    current_etag = cart_service.generate_etag(cart)
    
    if if_match is None:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="If-Match header required for cart modifications"
        )
    
    if if_match != current_etag:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ETag mismatch - cart was modified"
        )
    
    # Prepare context for coupon validation
    context = {
        "cart_total": cart.get("totals", {}).get("items", 0),
        "cart_items": cart.get("items", []),
        "user_role": None  # TODO: Get from authenticated user
    }
    
    # Validate coupon
    validation = await campaign_service.validate_coupon(coupon_code, context)
    
    if not validation["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=validation.get("message", "Invalid coupon code")
        )
    
    # Add coupon to cart
    applied_coupons = cart.get("applied_coupons", [])
    
    # Check if coupon already applied
    if coupon_code in applied_coupons:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coupon already applied"
        )
    
    applied_coupons.append(coupon_code)
    
    # Recalculate cart totals with discount
    items_total = cart.get("totals", {}).get("items", 0)
    discount_total = validation["discount_amount"]
    shipping = cart.get("totals", {}).get("shipping", 0)
    grand_total = items_total + shipping - discount_total
    
    # Update cart
    try:
        from app.repositories.cart_repository import cart_repository
        
        updated = await cart_repository.update_with_version(
            str(cart["_id"]),
            cart["version"],
            {
                "applied_coupons": applied_coupons,
                "totals": {
                    "items": items_total,
                    "shipping": shipping,
                    "discount": discount_total,
                    "grand_total": max(0, grand_total)
                }
            }
        )
        
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cart was modified by another request"
            )
        
        # Convert ObjectId to string
        updated["_id"] = str(updated["_id"])
        
        # Set new ETag
        new_etag = cart_service.generate_etag(updated)
        response.headers["ETag"] = new_etag
        response.headers["Cache-Control"] = "private, no-cache"
        
        # Invalidate cache
        await cart_service.invalidate_cache(owner_type, owner_id)
        
        return updated
        
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )


@router.delete(
    "/coupons/{coupon_code}",
    summary="Remove coupon from cart",
    description="Remove an applied coupon code from the cart"
)
async def remove_coupon(
    coupon_code: str,
    response: Response,
    request: Request,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    owner: Tuple[str, str] = Depends(resolve_cart_owner)
):
    """
    Remove coupon from cart.
    
    Requires If-Match header with ETag for optimistic locking.
    
    Args:
        coupon_code: Coupon code to remove
        response: FastAPI response
        request: FastAPI request
        if_match: ETag for optimistic locking
        owner: Cart owner tuple
        
    Returns:
        Updated cart without the coupon
        
    Raises:
        428: If-Match header required
        409: ETag mismatch or version conflict
        404: Coupon not found in cart
    """
    owner_type, owner_id = owner
    
    # Get current cart
    cart = await cart_service.ensure_cart(owner_id, owner_type)
    
    # Validate If-Match header
    current_etag = cart_service.generate_etag(cart)
    
    if if_match is None:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="If-Match header required for cart modifications"
        )
    
    if if_match != current_etag:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ETag mismatch - cart was modified"
        )
    
    # Remove coupon from cart
    applied_coupons = cart.get("applied_coupons", [])
    
    if coupon_code not in applied_coupons:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found in cart"
        )
    
    applied_coupons.remove(coupon_code)
    
    # Recalculate cart totals without this coupon
    items_total = cart.get("totals", {}).get("items", 0)
    shipping = cart.get("totals", {}).get("shipping", 0)
    
    # Recalculate discount with remaining coupons
    from app.services.campaign_service import campaign_service
    
    context = {
        "cart_total": items_total,
        "cart_items": cart.get("items", []),
        "user_role": None
    }
    
    discount_result = await campaign_service.calculate_cart_discounts(
        context,
        applied_coupons
    )
    
    discount_total = discount_result["total_discount"]
    grand_total = items_total + shipping - discount_total
    
    # Update cart
    try:
        from app.repositories.cart_repository import cart_repository
        
        updated = await cart_repository.update_with_version(
            str(cart["_id"]),
            cart["version"],
            {
                "applied_coupons": applied_coupons,
                "totals": {
                    "items": items_total,
                    "shipping": shipping,
                    "discount": discount_total,
                    "grand_total": max(0, grand_total)
                }
            }
        )
        
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cart was modified by another request"
            )
        
        # Convert ObjectId to string
        updated["_id"] = str(updated["_id"])
        
        # Set new ETag
        new_etag = cart_service.generate_etag(updated)
        response.headers["ETag"] = new_etag
        response.headers["Cache-Control"] = "private, no-cache"
        
        # Invalidate cache
        await cart_service.invalidate_cache(owner_type, owner_id)
        
        return updated
        
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
