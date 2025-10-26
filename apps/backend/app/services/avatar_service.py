"""Avatar service for MinIO-based avatar management."""
import uuid
import mimetypes
from datetime import datetime, timedelta, timezone
from typing import Optional

try:
    from minio import Minio
    from minio.error import S3Error
    MINIO_AVAILABLE = True
except ImportError:
    MINIO_AVAILABLE = False
    Minio = None
    S3Error = Exception

from app.repositories.user_repository import user_repository
from app.core.config import settings
from app.core.exceptions import NotFoundError, ConflictError, PreconditionRequiredError, ValidationError
from app.core.etag import generate_etag, parse_etag


ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"]


def _get_extension_from_content_type(content_type: str) -> str:
    """Get file extension from content type."""
    extensions = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp"
    }
    return extensions.get(content_type, mimetypes.guess_extension(content_type) or "")


class AvatarService:
    """Service for avatar management with MinIO presigned URLs."""
    
    def __init__(self):
        self.user_repo = user_repository
        self.client = None
        self._bucket_ensured = False
    
    def _ensure_client(self):
        """Lazy initialization of MinIO client."""
        if self.client is not None:
            return
        
        if not MINIO_AVAILABLE:
            raise RuntimeError("MinIO client not available. Install with: pip install minio")
        
        # Initialize MinIO client
        self.client = Minio(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
    
    def _ensure_bucket(self):
        """Ensure bucket exists (called on first use)."""
        if self._bucket_ensured:
            return
        
        self._ensure_client()
        
        try:
            if not self.client.bucket_exists(settings.AVATAR_BUCKET):
                self.client.make_bucket(settings.AVATAR_BUCKET)
            self._bucket_ensured = True
        except S3Error:
            # Bucket might already exist or we don't have permission to check
            self._bucket_ensured = True
    
    def _generate_object_key(self, user_id: str, content_type: str) -> str:
        """Generate unique object key for avatar."""
        ext = _get_extension_from_content_type(content_type)
        unique_id = uuid.uuid4().hex
        return f"{user_id}/{unique_id}{ext}"
    
    def _build_public_url(self, object_key: str) -> str:
        """Build public URL for avatar object."""
        base_url = settings.MINIO_PUBLIC_BASE_URL.rstrip("/")
        return f"{base_url}/{settings.AVATAR_BUCKET}/{object_key}"
    
    async def get_upload_url(
        self,
        user_id: str,
        content_type: str
    ) -> dict:
        """
        Generate presigned PUT URL for avatar upload.
        
        Args:
            user_id: User ID
            content_type: MIME type (image/jpeg, image/png, image/webp)
            
        Returns:
            Dict with upload_url, object_key, expires_at
            
        Raises:
            ValidationError: If content type not allowed
        """
        # Ensure MinIO client and bucket are ready
        self._ensure_bucket()
        
        # Validate content type
        if content_type not in ALLOWED_AVATAR_TYPES:
            raise ValidationError(
                message="Unsupported content type",
                details={
                    "error": "INVALID_CONTENT_TYPE",
                    "allowed_types": ALLOWED_AVATAR_TYPES
                }
            )
        
        # Generate object key
        object_key = self._generate_object_key(user_id, content_type)
        
        # Generate presigned PUT URL
        expires = timedelta(seconds=settings.AVATAR_PRESIGNED_URL_EXPIRY_SECONDS)
        
        try:
            upload_url = self.client.presigned_put_object(
                bucket_name=settings.AVATAR_BUCKET,
                object_name=object_key,
                expires=expires
            )
        except S3Error as e:
            raise ValidationError(
                message="Failed to generate upload URL",
                details={"error": str(e)}
            )
        
        expires_at = datetime.now(timezone.utc) + expires
        
        return {
            "upload_url": upload_url,
            "object_key": object_key,
            "expires_at": expires_at.isoformat()
        }
    
    async def confirm_upload(
        self,
        user_id: str,
        object_key: str,
        if_match: Optional[str]
    ) -> tuple[dict, str]:
        """
        Confirm avatar upload and update user profile.
        
        Args:
            user_id: User ID
            object_key: MinIO object key
            if_match: If-Match header value (ETag)
            
        Returns:
            Tuple of (response dict, new ETag)
            
        Raises:
            PreconditionRequiredError: If If-Match header missing (428)
            ConflictError: If version mismatch (409)
            ValidationError: If object not found or too large (422)
            NotFoundError: If user not found
        """
        # Ensure MinIO client is ready
        self._ensure_client()
        
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
        
        # Check user exists and not deleted
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError(resource="User", identifier=user_id)
        
        if user.get("deleted_at"):
            raise NotFoundError(resource="User", identifier=user_id)
        
        # Verify object exists in MinIO
        try:
            stat = self.client.stat_object(settings.AVATAR_BUCKET, object_key)
        except S3Error:
            raise ValidationError(
                message="Avatar object not found in storage",
                details={"error": "OBJECT_NOT_FOUND"}
            )
        
        # Verify size
        if stat.size > settings.AVATAR_MAX_SIZE_BYTES:
            # Delete oversized object
            try:
                self.client.remove_object(settings.AVATAR_BUCKET, object_key)
            except S3Error:
                pass
            
            raise ValidationError(
                message="Avatar file too large",
                details={
                    "error": "FILE_TOO_LARGE",
                    "max_size": settings.AVATAR_MAX_SIZE_BYTES,
                    "actual_size": stat.size
                }
            )
        
        # Build public URL
        avatar_url = self._build_public_url(object_key)
        
        # Get old avatar key for cleanup
        old_object_key = user.get("avatar_object_key")
        
        # Update user with version control
        updates = {
            "avatar_url": avatar_url,
            "avatar_object_key": object_key
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
        
        # Delete old avatar if exists and different
        if old_object_key and old_object_key != object_key:
            try:
                self.client.remove_object(settings.AVATAR_BUCKET, old_object_key)
            except S3Error:
                # Best effort - ignore errors
                pass
        
        # Generate new ETag
        etag = generate_etag(updated_user["version"])
        
        return {
            "message": "Avatar confirmed",
            "avatar_url": avatar_url
        }, etag
    
    async def delete_avatar(
        self,
        user_id: str,
        if_match: Optional[str]
    ) -> tuple[dict, str]:
        """
        Delete user avatar.
        
        Args:
            user_id: User ID
            if_match: If-Match header value (ETag)
            
        Returns:
            Tuple of (response dict, new ETag)
            
        Raises:
            PreconditionRequiredError: If If-Match header missing (428)
            ConflictError: If version mismatch (409)
            NotFoundError: If user not found
        """
        # Ensure MinIO client is ready
        self._ensure_client()
        
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
        
        # Check user exists and not deleted
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError(resource="User", identifier=user_id)
        
        if user.get("deleted_at"):
            raise NotFoundError(resource="User", identifier=user_id)
        
        # Get current avatar key
        object_key = user.get("avatar_object_key")
        
        # Clear avatar from database
        updates = {
            "avatar_url": None,
            "avatar_object_key": None
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
        
        # Delete object from MinIO (best effort)
        if object_key:
            try:
                self.client.remove_object(settings.AVATAR_BUCKET, object_key)
            except S3Error:
                # Best effort - ignore errors
                pass
        
        # Generate new ETag
        etag = generate_etag(updated_user["version"])
        
        return {"message": "Avatar deleted"}, etag


# Singleton instance
avatar_service = AvatarService()
