"""Inventory endpoints for stock management."""
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.services.inventory_service import inventory_service
from app.core.deps import require_admin
from app.core.exceptions import ConflictError, NotFoundError
from app.schemas.inventory import (
    CreateReservationRequest,
    StockAdjustmentRequest,
    BulkStockAdjustmentRequest,
    AvailabilityResponse,
    ReservationResponse
)


# Public inventory endpoints
router = APIRouter(prefix="/api/v1/inventory", tags=["Inventory"])

# Admin inventory endpoints
admin_router = APIRouter(prefix="/api/v1/admin/inventory", tags=["Inventory Admin"])


@router.get(
    "/{sku}/availability",
    response_model=AvailabilityResponse,
    summary="Check stock availability",
    description="Check available stock for a SKU"
)
async def check_availability(sku: str):
    """
    Check stock availability.
    
    Returns available quantity and low stock indicator.
    """
    try:
        result = await inventory_service.check_availability(sku)
        return result
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post(
    "/reservations",
    status_code=status.HTTP_201_CREATED,
    summary="Create stock reservation",
    description="Reserve stock for checkout (requires Idempotency-Key)"
)
async def create_reservation(
    req: CreateReservationRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
):
    """
    Create stock reservation.
    
    Requires Idempotency-Key header for safe retries.
    Reservation expires after 15 minutes by default.
    
    Returns:
        Reservation with pending status
        
    Raises:
        428: Idempotency-Key required
        409: Insufficient stock
    """
    if not idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Idempotency-Key header required for reservations"
        )
    
    # Convert request to items list
    items = [{"sku": item.sku, "qty": item.qty} for item in req.items]
    
    try:
        # Note: owner_id and owner_type should come from auth context
        # For now, using placeholder - will be integrated with cart
        reservation = await inventory_service.reserve(
            owner_id="placeholder",
            owner_type="guest",
            items=items,
            idempotency_key=idempotency_key
        )
        
        # Convert ObjectId to string
        reservation["_id"] = str(reservation["_id"])
        
        return reservation
        
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/reservations/{reservation_id}/release",
    status_code=status.HTTP_200_OK,
    summary="Release reservation",
    description="Release stock reservation and return stock to available"
)
async def release_reservation(reservation_id: str):
    """
    Release reservation.
    
    Returns stock to available pool.
    """
    try:
        success = await inventory_service.release(reservation_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reservation not found or already released"
            )
        
        return {"status": "released", "reservation_id": reservation_id}
        
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post(
    "/reservations/{reservation_id}/commit",
    status_code=status.HTTP_200_OK,
    summary="Commit reservation",
    description="Commit reservation after successful payment"
)
async def commit_reservation(reservation_id: str):
    """
    Commit reservation.
    
    Finalizes the sale by decrementing on_hand stock.
    Should be called after successful payment.
    """
    try:
        success = await inventory_service.commit(reservation_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reservation not found or already committed"
            )
        
        return {"status": "committed", "reservation_id": reservation_id}
        
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Admin endpoints

@admin_router.post(
    "/adjust",
    status_code=status.HTTP_200_OK,
    summary="Adjust stock",
    description="Adjust stock quantity (admin only)"
)
async def adjust_stock(
    req: StockAdjustmentRequest,
    _admin=Depends(require_admin)
):
    """
    Adjust stock quantity.
    
    Requires admin role.
    """
    try:
        result = await inventory_service.adjust_stock(
            sku=req.sku,
            delta=req.delta,
            reason=req.reason
        )
        
        # Convert ObjectId to string
        result["_id"] = str(result["_id"])
        
        return result
        
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@admin_router.post(
    "/bulk-adjust",
    status_code=status.HTTP_200_OK,
    summary="Bulk adjust stock",
    description="Adjust multiple SKUs (admin only)"
)
async def bulk_adjust_stock(
    req: BulkStockAdjustmentRequest,
    _admin=Depends(require_admin)
):
    """
    Bulk adjust stock quantities.
    
    Requires admin role.
    """
    results = []
    errors = []
    
    for adjustment in req.adjustments:
        try:
            result = await inventory_service.adjust_stock(
                sku=adjustment.sku,
                delta=adjustment.delta,
                reason=adjustment.reason
            )
            
            result["_id"] = str(result["_id"])
            results.append(result)
            
        except NotFoundError as e:
            errors.append({
                "sku": adjustment.sku,
                "error": str(e)
            })
    
    return {
        "success": results,
        "errors": errors
    }


@admin_router.get(
    "/low-stock",
    status_code=status.HTTP_200_OK,
    summary="Get low stock items",
    description="Get items with low stock (admin only)"
)
async def get_low_stock(
    limit: int = 100,
    _admin=Depends(require_admin)
):
    """
    Get low stock items.
    
    Returns items where available <= low_stock_threshold.
    """
    items = await inventory_service.get_low_stock_items(limit)
    
    # Convert ObjectIds to strings
    for item in items:
        item["_id"] = str(item["_id"])
    
    return {"items": items, "count": len(items)}
