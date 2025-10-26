"""Password service for password change operations."""
from typing import Optional
from datetime import datetime, timezone

from app.repositories.user_repository import user_repository
from app.core.security import hash_password, verify_password
from app.core.exceptions import NotFoundError, ConflictError, PreconditionRequiredError, ValidationError
from app.core.etag import generate_etag, parse_etag


class PasswordService:
    """Service for password management operations."""
    
    def __init__(self):
        self.user_repo = user_repository
    
    async def change_password(
        self,
        user_id: str,
        current_password: str,
        new_password: str,
        if_match: Optional[str]
    ) -> tuple[dict, str]:
        """
        Change user password with optimistic locking.
        
        Args:
            user_id: User ID
            current_password: Current password for verification
            new_password: New password (min 8 characters)
            if_match: If-Match header value (ETag)
            
        Returns:
            Tuple of (response dict, new ETag)
            
        Raises:
            PreconditionRequiredError: If If-Match header missing (428)
            ConflictError: If version mismatch or current password invalid (409)
            ValidationError: If new password doesn't meet requirements (422)
            NotFoundError: If user not found
        """
        # Validate If-Match header
        if not if_match:
            raise PreconditionRequiredError(header_name="If-Match")
        
        # Parse version from ETag
        try:
            expected_version = parse_etag(if_match)
        except ValueError as e:
            raise ConflictError(
                message="Invalid If-Match header format",
                details={"if_match": if_match, "error": str(e)}
            )
        
        # Validate new password
        if len(new_password) < 8:
            raise ValidationError(
                message="Password must be at least 8 characters",
                details={"min_length": 8}
            )
        
        # Check user exists and not deleted
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError(resource="User", identifier=user_id)
        
        if user.get("deleted_at"):
            raise NotFoundError(resource="User", identifier=user_id)
        
        # Verify current password
        stored_hash = user.get("password_hash", "")
        if not verify_password(current_password, stored_hash):
            raise ConflictError(
                message="Current password is incorrect",
                details={"error": "INVALID_CURRENT_PASSWORD"}
            )
        
        # Check if new password is same as current
        if verify_password(new_password, stored_hash):
            raise ConflictError(
                message="New password must be different from current password",
                details={"error": "SAME_PASSWORD"}
            )
        
        # Hash new password
        new_hash = hash_password(new_password)
        
        # Update with version control
        now = datetime.now(timezone.utc)
        updates = {
            "password_hash": new_hash,
            "updated_at": now
        }
        
        try:
            updated_user = await self.user_repo.update_with_version(
                user_id=user_id,
                current_version=expected_version,
                updates=updates
            )
        except ConflictError:
            # Re-raise with more context
            user = await self.user_repo.get_by_id(user_id)
            raise ConflictError(
                message="Resource has been modified by another request",
                details={
                    "current_version": user.get("version") if user else None,
                    "requested_version": expected_version
                }
            )
        
        # Generate new ETag
        etag = generate_etag(updated_user["version"])
        
        return {"message": "Password updated successfully"}, etag


# Singleton instance
password_service = PasswordService()
