"""User profile endpoints."""
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, status, Depends, Response
from pydantic import BaseModel

from app.core.deps import get_current_user
from app.repositories.user_repository import user_repository
from app.schemas.user import Address
from app.core.exceptions import ValidationError, ConflictError


router = APIRouter(prefix="/api/v1/users", tags=["Users"])


class UserUpdateRequest(BaseModel):
    """Request to update user profile."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None


@router.get(
    "/me",
    summary="Get current user profile",
    description="Get authenticated user's profile information"
)
async def get_current_user_profile(
    response: Response,
    user=Depends(get_current_user)
):
    """
    Get current user profile.
    
    Returns ETag header for optimistic locking.
    """
    user_doc = await user_repository.get_by_id(str(user.id))
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate ETag from version
    etag = f'"v{user_doc["version"]}"'
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "private, no-cache"
    
    return user_repository.to_public(user_doc)


@router.patch(
    "/me",
    summary="Update user profile",
    description="Update authenticated user's profile"
)
async def update_user_profile(
    req: UserUpdateRequest,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    user=Depends(get_current_user)
):
    """
    Update user profile.
    
    Requires If-Match header with ETag for optimistic locking.
    """
    if not if_match:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="If-Match header required"
        )
    
    user_doc = await user_repository.get_by_id(str(user.id))
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify ETag
    current_etag = f'"v{user_doc["version"]}"'
    if if_match != current_etag:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ETag mismatch - user was modified"
        )
    
    # Update user (simplified - would need proper update method)
    from app.services.db import get_db
    from bson import ObjectId
    
    updates = {}
    if req.first_name:
        updates["first_name"] = req.first_name
    if req.last_name:
        updates["last_name"] = req.last_name
    if req.phone:
        updates["phone"] = req.phone
    
    if updates:
        db = get_db()
        await db["users"].update_one(
            {"_id": ObjectId(str(user.id)), "version": user_doc["version"]},
            {
                "$set": updates,
                "$inc": {"version": 1}
            }
        )
    
    # Get updated user
    updated_user = await user_repository.get_by_id(str(user.id))
    return user_repository.to_public(updated_user)


@router.get(
    "/me/addresses",
    summary="Get user addresses",
    description="Get all addresses for authenticated user"
)
async def get_user_addresses(
    user=Depends(get_current_user)
):
    """Get user's addresses."""
    user_doc = await user_repository.get_by_id(str(user.id))
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"addresses": user_doc.get("addresses", [])}


@router.post(
    "/me/addresses",
    status_code=status.HTTP_201_CREATED,
    summary="Add user address",
    description="Add new address to user profile"
)
async def add_user_address(
    address: Address,
    set_as_default: bool = False,
    user=Depends(get_current_user)
):
    """Add address to user profile."""
    updated_user = await user_repository.add_address(
        user_id=str(user.id),
        address=address.model_dump(),
        set_as_default=set_as_default
    )
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user_repository.to_public(updated_user)


@router.get(
    "/me/data",
    summary="Get user data (KVKK)",
    description="Get all user data for KVKK data access right"
)
async def get_user_data(
    user=Depends(get_current_user)
):
    """
    Get all user data (KVKK data access right).
    
    Returns complete user data including orders, addresses, etc.
    """
    user_doc = await user_repository.get_by_id(str(user.id))
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get user's orders
    from app.repositories.order_repository import order_repository
    orders = await order_repository.list_user_orders(str(user.id), limit=1000)
    
    # Return all user data
    return {
        "user": user_repository.to_public(user_doc),
        "addresses": user_doc.get("addresses", []),
        "orders": [{"_id": str(o["_id"]), **o} for o in orders],
        "kvkk_consent": user_doc.get("kvkk_consent")
    }


@router.delete(
    "/me",
    summary="Delete user account (KVKK)",
    description="Soft delete user account (KVKK erasure right)"
)
async def delete_user_account(
    user=Depends(get_current_user)
):
    """
    Delete user account (KVKK erasure right).
    
    Performs soft delete with data retention for legal requirements.
    """
    from app.services.db import get_db
    from bson import ObjectId
    from datetime import datetime, timezone
    
    db = get_db()
    
    # Soft delete: mark as deleted but retain data
    await db["users"].update_one(
        {"_id": ObjectId(str(user.id))},
        {
            "$set": {
                "deleted_at": datetime.now(timezone.utc),
                "status": "deleted"
            }
        }
    )
    
    return {"message": "Account deletion requested. Data will be retained per legal requirements."}
