"""Admin order management endpoints."""
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Header, HTTPException, status, Depends, Response
from pydantic import BaseModel, EmailStr

from app.services.order_service import order_service
from app.services.payment_service import payment_service
from app.core.deps import require_admin
from app.core.exceptions import ValidationError, ConflictError, NotFoundError


router = APIRouter(prefix="/api/v1/admin/orders", tags=["Admin - Orders"])


class UpdateOrderStatusRequest(BaseModel):
    """Request to update order status."""
    status: str
    reason: Optional[str] = None


class RefundOrderRequest(BaseModel):
    """Request to refund order."""
    reason: str
    amount: Optional[float] = None  # If None, refund full amount


class ManualOrderItem(BaseModel):
    """Manual order item."""
    product_id: str
    variant_id: Optional[str] = None
    product_name: str
    sku: str
    quantity: int
    unit_price: float


class ManualOrderRequest(BaseModel):
    """Request to create manual order."""
    customer_email: EmailStr
    customer_name: str
    customer_phone: str
    items: List[ManualOrderItem]
    shipping_address: dict
    billing_address: dict
    payment_method: str
    notes: Optional[str] = None


@router.get(
    "",
    summary="List all orders (admin)",
    description="Get all orders with filters and pagination"
)
async def list_orders_admin(
    response: Response,
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    payment_method: Optional[str] = None,
    limit: int = 20,
    cursor: Optional[str] = None,
    admin=Depends(require_admin)
):
    """
    List all orders with filters.
    
    Supports filtering by:
    - status: Order status
    - start_date: Orders created after this date
    - end_date: Orders created before this date
    - payment_method: Payment method
    
    Uses cursor-based pagination.
    """
    from app.repositories.order_repository import order_repository
    
    orders = await order_repository.list_orders_admin(
        status=status,
        start_date=start_date,
        end_date=end_date,
        payment_method=payment_method,
        limit=limit,
        cursor=cursor
    )
    
    # Convert ObjectId to string
    for order in orders:
        order["_id"] = str(order["_id"])
    
    # Add Link headers for pagination
    if orders and len(orders) == limit:
        next_cursor = orders[-1]["_id"]
        link_params = f"cursor={next_cursor}&limit={limit}"
        if status:
            link_params += f"&status={status}"
        if payment_method:
            link_params += f"&payment_method={payment_method}"
        response.headers["Link"] = f'</api/v1/admin/orders?{link_params}>; rel="next"'
    
    return {"orders": orders, "count": len(orders)}


@router.patch(
    "/{order_id}/status",
    summary="Update order status (admin)",
    description="Update order status with validation"
)
async def update_order_status(
    order_id: str,
    req: UpdateOrderStatusRequest,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    admin=Depends(require_admin)
):
    """
    Update order status.
    
    Requires If-Match header with ETag.
    Validates state transitions and sends customer notification.
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
        
        # Verify ETag
        current_etag = order_service.generate_etag(order)
        if if_match != current_etag:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="ETag mismatch - order was modified"
            )
        
        # Update status
        updated_order = await order_service.update_order_status_admin(
            order_id=order_id,
            new_status=req.status,
            admin_user_id=str(admin.sub),
            reason=req.reason,
            current_version=order["version"]
        )
        
        # Convert ObjectId to string
        updated_order["_id"] = str(updated_order["_id"])
        
        # TODO: Send customer notification email
        
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


@router.post(
    "/{order_id}/refund",
    summary="Refund order (admin)",
    description="Initiate refund via payment provider"
)
async def refund_order(
    order_id: str,
    req: RefundOrderRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    admin=Depends(require_admin)
):
    """
    Refund order.
    
    Requires Idempotency-Key header.
    Initiates refund via payment provider.
    """
    if not idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Idempotency-Key header required"
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
        
        # Check if order can be refunded
        if order["status"] not in ["paid", "picking", "shipped", "delivered"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order cannot be refunded in current status"
            )
        
        # Determine refund amount
        refund_amount = req.amount if req.amount else order["total"]
        
        # Initiate refund via payment provider
        transaction_id = order["payment"]["transaction_id"]
        
        refund_result = await payment_service.refund_payment(
            transaction_id=transaction_id,
            amount=refund_amount,
            reason=req.reason,
            idempotency_key=idempotency_key
        )
        
        # Update order with refund info
        await order_repository.update_with_version(
            order_id,
            order["version"],
            {
                "payment.refund_status": refund_result.get("status"),
                "payment.refund_amount": refund_amount,
                "payment.refund_reason": req.reason,
                "payment.refund_date": datetime.utcnow()
            }
        )
        
        return {
            "order_id": order_id,
            "refund_status": refund_result.get("status"),
            "refund_amount": refund_amount
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/{order_id}/shipping-label",
    summary="Generate shipping label (admin)",
    description="Generate shipping label for order"
)
async def generate_shipping_label(
    order_id: str,
    admin=Depends(require_admin)
):
    """
    Generate shipping label.
    
    TODO: Integrate with shipping provider.
    """
    from app.repositories.order_repository import order_repository
    
    order = await order_repository.get_by_id(order_id)
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # TODO: Integrate with shipping provider API
    # For now, return mock data
    
    tracking_number = f"TRACK-{order['order_number']}"
    
    # Update order with tracking number
    await order_repository.update_with_version(
        order_id,
        order["version"],
        {"tracking_number": tracking_number}
    )
    
    return {
        "order_id": order_id,
        "tracking_number": tracking_number,
        "label_url": f"https://shipping-provider.com/labels/{tracking_number}.pdf"
    }


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create manual order (admin)",
    description="Create order manually without cart"
)
async def create_manual_order(
    req: ManualOrderRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    admin=Depends(require_admin)
):
    """
    Create manual order.
    
    Requires Idempotency-Key header.
    Useful for phone orders or special cases.
    """
    if not idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Idempotency-Key header required"
        )
    
    try:
        # Prepare customer info
        customer_info = {
            "user_id": None,
            "email": req.customer_email,
            "first_name": req.customer_name.split()[0] if req.customer_name else "",
            "last_name": " ".join(req.customer_name.split()[1:]) if len(req.customer_name.split()) > 1 else "",
            "phone": req.customer_phone
        }
        
        # Prepare items
        items = [
            {
                "product_id": item.product_id,
                "variant_id": item.variant_id,
                "product_name": item.product_name,
                "sku": item.sku,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "subtotal": item.unit_price * item.quantity,
                "discount": 0
            }
            for item in req.items
        ]
        
        # Create order
        order = await order_service.create_manual_order(
            customer_info=customer_info,
            items=items,
            shipping_address=req.shipping_address,
            billing_address=req.billing_address,
            payment_method=req.payment_method,
            idempotency_key=idempotency_key,
            admin_user_id=str(admin.sub)
        )
        
        # Convert ObjectId to string
        order["_id"] = str(order["_id"])
        
        return order
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
