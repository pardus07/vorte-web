"""Profile service for user profile management operations."""
from typing import Optional
from bson import ObjectId

from app.repositories.user_repository import user_repository
from app.schemas.profile import ProfileUpdate, ProfileResponse
from app.core.exceptions import NotFoundError, ConflictError, PreconditionRequiredError
from app.core.etag import generate_etag, parse_etag


class ProfileService:
    """Service for managing user profile operations."""
    
    def __init__(self, user_repo=None):
        self.user_repo = user_repo or user_repository
    
    async def get_profile(self, user_id: str) -> tuple[ProfileResponse, str]:
        """
        Get user profile with ETag for version control.
        
        Args:
            user_id: User ID
            
        Returns:
            Tuple of (ProfileResponse, ETag)
            
        Raises:
            NotFoundError: If user not found or deleted
        """
        user = await self.user_repo.get_by_id(user_id)
        
        if not user:
            raise NotFoundError(resource="User", identifier=user_id)
        
        # Check if user is soft-deleted
        if user.get("deleted_at"):
            raise NotFoundError(resource="User", identifier=user_id)
        
        # Convert to public format
        public_user = self.user_repo.to_public(user)
        
        # Create response
        profile = ProfileResponse(
            id=public_user["id"],
            email=public_user["email"],
            first_name=public_user["first_name"],
            last_name=public_user["last_name"],
            phone=public_user.get("phone"),
            role=public_user["role"],
            email_verified=public_user["email_verified"],
            phone_verified=public_user["phone_verified"],
            avatar_url=public_user.get("avatar_url"),
            created_at=public_user["created_at"],
            last_login_at=public_user.get("last_login_at"),
            version=public_user["version"]
        )
        
        # Generate ETag
        etag = generate_etag(profile.version)
        
        return profile, etag
    
    async def update_profile(
        self,
        user_id: str,
        updates: ProfileUpdate,
        if_match: Optional[str]
    ) -> tuple[ProfileResponse, str]:
        """
        Update user profile with optimistic locking.
        
        Args:
            user_id: User ID
            updates: Profile updates
            if_match: If-Match header value (ETag)
            
        Returns:
            Tuple of (ProfileResponse, new ETag)
            
        Raises:
            PreconditionRequiredError: If If-Match header missing (428)
            ConflictError: If version mismatch (409)
            NotFoundError: If user not found
        """
        # Validate If-Match header is present
        if not if_match:
            raise PreconditionRequiredError(header_name="If-Match")
        
        # Parse version from ETag
        try:
            current_version = parse_etag(if_match)
        except ValueError as e:
            raise ConflictError(
                message="Invalid If-Match header format",
                details={"if_match": if_match, "error": str(e)}
            )
        
        # Get only fields that were actually set
        update_dict = updates.model_dump(exclude_unset=True)
        
        if not update_dict:
            # No fields to update - return current profile
            # But still validate version to ensure client has latest
            user = await self.user_repo.get_by_id(user_id)
            if not user:
                raise NotFoundError(resource="User", identifier=user_id)
            
            if user.get("version") != current_version:
                raise ConflictError(
                    message="Resource has been modified by another request",
                    details={
                        "current_version": user.get("version"),
                        "requested_version": current_version
                    }
                )
            
            # Return current profile
            return await self.get_profile(user_id)
        
        # Update with version control
        try:
            updated_user = await self.user_repo.update_with_version(
                user_id=user_id,
                current_version=current_version,
                updates=update_dict
            )
        except ConflictError:
            # Re-raise with more context
            user = await self.user_repo.get_by_id(user_id)
            raise ConflictError(
                message="Resource has been modified by another request",
                details={
                    "current_version": user.get("version") if user else None,
                    "requested_version": current_version,
                    "current_etag": generate_etag(user.get("version")) if user else None,
                    "provided_etag": if_match
                }
            )
        
        # Convert to public format
        public_user = self.user_repo.to_public(updated_user)
        
        # Create response
        profile = ProfileResponse(
            id=public_user["id"],
            email=public_user["email"],
            first_name=public_user["first_name"],
            last_name=public_user["last_name"],
            phone=public_user.get("phone"),
            role=public_user["role"],
            email_verified=public_user["email_verified"],
            phone_verified=public_user["phone_verified"],
            avatar_url=public_user.get("avatar_url"),
            created_at=public_user["created_at"],
            last_login_at=public_user.get("last_login_at"),
            version=public_user["version"]
        )
        
        # Generate new ETag
        etag = generate_etag(profile.version)
        
        return profile, etag


# Singleton instance
profile_service = ProfileService()
