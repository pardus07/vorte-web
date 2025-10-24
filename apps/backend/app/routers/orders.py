"""Order management endpoints."""
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, status, Depends, Response
from pydantic import BaseModel

from app.services.order_service import order_service
from app.core.deps import get_current_user
from app.core.exceptions import ValidationError, ConflictError, NotFoundError


router = APIRouter(prefix="/api/v1/orders", tags=["Orders"])


class OrderCancelRequest(BaseModel):
    """Request to cancel order."""
    reason: str


@router.get(
    "",
    summary="List user orders",
    description="Get order history for authenticated user"
)
async def list_orders(
    response: Response,
    limit: int = 20,
    cursor: Optional[str] = None,
    user=Depends(get_current_user)
):
    """
    List user's orders with cursor-based pagination.
    
    Returns orders sorted by creation date (newest first).
    """
    from app.repositories.order_repository import order_repository
    
    orders = await order_repository.list_user_orders(
        user_id=str(user.id),
        limit=limit,
        cursor=cursor
    )
    
    # Convert ObjectId to string
    for order in orders:
        order["_id"] = str(order["_id"])
    
    # Add Link headers for pagination
    if orders and len(orders) == limit:
        next_cursor = orders[-1]["_id"]
        response.headers["Link"] = f'</api/v1/orders?cursor={next_cursor}&limit={limit}>; rel="next"'
    
    return {"orders": orders}


@router.get(
    "/{order_id}",
    summary="Get order details",
    description="Get detailed information about an order"
)
async def get_order(
    order_id: str,
    response: Response,
    user=Depends(get_current_user)
):
    """
    Get order by ID.
    
    Returns ETag header for optimistic locking.
    """
    from app.repositories.order_repository import order_repository
    
    order = await order_repository.get_by_id(order_id)
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Verify ownership
    if order.get("customer_info", {}).get("user_id") != str(user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Convert ObjectId to string
    order["_id"] = str(order["_id"])
    
    # Set ETag header
    etag = order_service.generate_etag(order)
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "private, no-cache"
    
    return order



@router.post(
    "/{order_id}/cancel",
    summary="Cancel order",
    description="Cancel order before shipping"
)
async def cancel_order(
    order_id: str,
    req: OrderCancelRequest,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    user=Depends(get_current_user)
):
    """
    Cancel order.
    
    Requires If-Match header with ETag.
    Only allowed before SHIPPED status.
    Releases stock reservations and initiates refund if paid.
    """
    if not if_match:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="If-Match header required"
        )
    
    try:
        # Get order
        from app.repositories.order_repository import order_repository
        order = await order_repository.get_by_id(order_id)
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Verify ownership
        if order.get("customer_info", {}).get("user_id") != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Verify ETag
        current_etag = order_service.generate_etag(order)
        if if_match != current_etag:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="ETag mismatch - order was modified"
            )
        
        # Cancel order
        updated_order = await order_service.cancel_order(
            order_id=order_id,
            reason=req.reason,
            current_version=order["version"]
        )
        
        # Convert ObjectId to string
        updated_order["_id"] = str(updated_order["_id"])
        
        return updated_order
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
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



@router.post(
    "/{order_id}/return",
    summary="Return order",
    description="Initiate return for delivered order"
)
async def return_order(
    order_id: str,
    req: OrderCancelRequest,  # Reusing same schema (has reason field)
    if_match: Optional[str] = Header(None, alias="If-Match"),
    user=Depends(get_current_user)
):
    """
    Return order.
    
    Requires If-Match header with ETag.
    Only allowed after DELIVERED status.
    """
    if not if_match:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="If-Match header required"
        )
    
    try:
        # Get order
        from app.repositories.order_repository import order_repository
        order = await order_repository.get_by_id(order_id)
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Verify ownership
        if order.get("customer_info", {}).get("user_id") != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Verify ETag
        current_etag = order_service.generate_etag(order)
        if if_match != current_etag:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="ETag mismatch - order was modified"
            )
        
        # Check if order can be returned (must be delivered)
        if order["status"] != "delivered":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only delivered orders can be returned"
            )
        
        # Update order status to RETURNED
        updated_order = await order_service.update_order_status(
            order_id=order_id,
            new_status="returned",
            changed_by=str(user.id),
            reason=req.reason,
            current_version=order["version"]
        )
        
        # Convert ObjectId to string
        updated_order["_id"] = str(updated_order["_id"])
        
        return updated_order
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
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



# Guest order tracking
@router.get(
    "/track/{tracking_token}",
    summary="Track guest order",
    description="Track order using guest tracking token (no authentication required)"
)
async def track_guest_order(
    tracking_token: str,
    response: Response
):
    """
    Track guest order using token.
    
    Public endpoint - no authentication required.
    Returns order details for guest users.
    """
    from app.services.db import get_db
    
    db = get_db()
    
    # Find order by tracking token
    order = await db["orders"].find_one({"tracking_token": tracking_token})
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found or invalid tracking token"
        )
    
    # Convert ObjectId to string
    order["_id"] = str(order["_id"])
    
    # Return limited order info for guests
    return {
        "order_number": order["order_number"],
        "status": order["status"],
        "total": order["total"],
        "created_at": order["created_at"],
        "items": order.get("items", []),
        "tracking_number": order.get("tracking_number")
    }
