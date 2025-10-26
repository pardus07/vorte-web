"""Account erasure service for KVKV-compliant account deletion."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.repositories.user_repository import user_repository
from app.core.config import settings
from app.core.security import verify_password, revoke_token
from app.core.exceptions import NotFoundError, ConflictError, PreconditionRequiredError, ValidationError
from app.core.etag import generate_etag, parse_etag


class AccountErasureService:
    """Service for KVKV-compliant account deletion and erasure."""
    
    def __init__(self):
        self.user_repo = user_repository
    
    async def delete_account(
        self,
        user_id: str,
        if_match: Optional[str],
        current_password: Optional[str] = None,
        require_password: bool = True
    ) -> tuple[dict, str]:
        """
        Mark account for deletion (soft delete) with KVKV compliance.
        
        Args:
            user_id: User ID
            if_match: If-Match header value (ETag)
            current_password: Current password for verification (optional)
            require_password: Whether to require password verification
            
        Returns:
            Tuple of (response dict with erasure_job_id, new ETag)
            
        Raises:
            PreconditionRequiredError: If If-Match header missing (428)
            ConflictError: If version mismatch or password invalid (409)
            ValidationError: If password required but not provided (422)
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
        
        # Check user exists and not already deleted
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError(resource="User", identifier=user_id)
        
        # If already deleted, return idempotent response
        if user.get("deleted_at"):
            retention_days = settings.PII_ERASURE_RETENTION_DAYS
            deleted_at = user["deleted_at"]
            retention_until = deleted_at + timedelta(days=retention_days)
            
            etag = generate_etag(user["version"])
            
            return {
                "message": "Account already marked for deletion",
                "erasure_job_id": user.get("erasure_job_id", "unknown"),
                "status": "accepted",
                "deleted_at": deleted_at.isoformat(),
                "retention_until": retention_until.isoformat()
            }, etag
        
        # Verify password if required
        if require_password:
            if not current_password:
                raise ValidationError(
                    message="Current password required for account deletion",
                    details={"error": "PASSWORD_REQUIRED"}
                )
            
            stored_hash = user.get("password_hash", "")
            if not verify_password(current_password, stored_hash):
                raise ConflictError(
                    message="Current password is incorrect",
                    details={"error": "INVALID_CURRENT_PASSWORD"}
                )
        
        # Generate erasure job ID
        erasure_job_id = str(uuid.uuid4())
        
        # Calculate retention period
        now = datetime.now(timezone.utc)
        retention_days = settings.PII_ERASURE_RETENTION_DAYS
        retention_until = now + timedelta(days=retention_days)
        
        # Mark for deletion with version control
        updates = {
            "deleted_at": now,
            "erasure_requested": True,
            "erasure_job_id": erasure_job_id,
            "erasure_requested_at": now,
            "erasure_retention_until": retention_until
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
        
        # Revoke all user tokens
        # Note: This requires tracking active JTIs. For now, we'll add a placeholder
        # In production, you'd query active sessions/tokens and revoke them
        # await self._revoke_user_tokens(user_id)
        
        # Generate new ETag
        etag = generate_etag(updated_user["version"])
        
        return {
            "message": "Account marked for deletion. Your data will be erased after the retention period.",
            "erasure_job_id": erasure_job_id,
            "status": "accepted",
            "deleted_at": now.isoformat(),
            "retention_until": retention_until.isoformat()
        }, etag
    
    async def _revoke_user_tokens(self, user_id: str) -> None:
        """
        Revoke all active tokens for a user.
        
        This is a placeholder implementation. In production, you would:
        1. Query active sessions/tokens from Redis or database
        2. Get JTIs for all active tokens
        3. Add each JTI to the denylist with appropriate TTL
        
        Args:
            user_id: User ID
        """
        # TODO: Implement token tracking and revocation
        # Example:
        # active_tokens = await self.get_active_tokens(user_id)
        # for token in active_tokens:
        #     jti = token["jti"]
        #     expires_in = token["exp"] - int(datetime.now(timezone.utc).timestamp())
        #     if expires_in > 0:
        #         await revoke_token(jti, expires_in)
        pass
    
    async def enqueue_erasure_job(self, user_id: str, erasure_job_id: str) -> str:
        """
        Enqueue PII erasure job for background processing.
        
        This creates a job document that will be processed by a background worker
        after the retention period expires.
        
        Args:
            user_id: User ID
            erasure_job_id: Unique job identifier
            
        Returns:
            Job ID
            
        Note:
            In production, this would:
            1. Create a job document in MongoDB erasure_jobs collection
            2. Or push to a Redis queue for worker processing
            3. Or use a task queue like Celery/RQ
            
            For now, the job is tracked via user.erasure_job_id field.
        """
        # TODO: Implement actual job queue
        # Example with MongoDB:
        # from app.services.db import get_db
        # db = get_db()
        # await db.erasure_jobs.insert_one({
        #     "_id": erasure_job_id,
        #     "user_id": user_id,
        #     "status": "pending",
        #     "created_at": datetime.now(timezone.utc),
        #     "scheduled_for": user.erasure_retention_until
        # })
        
        # For now, return the job ID (already stored in user document)
        return erasure_job_id
    
    async def process_erasure_job(self, user_id: str) -> bool:
        """
        Process PII erasure for a user after retention period.
        
        This method should be called by a background worker/cron job.
        It performs the actual PII erasure after the retention period expires.
        
        Args:
            user_id: User ID
            
        Returns:
            True if erasure completed, False otherwise
            
        Note:
            This is called by background jobs, not directly by API endpoints.
        """
        import logging
        
        logger = logging.getLogger(__name__)
        
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            return False
        
        # Check if retention period has expired
        retention_until = user.get("erasure_retention_until")
        if not retention_until or retention_until > datetime.now(timezone.utc):
            return False
        
        # Check if already processed
        if user.get("erasure_completed_at"):
            return True
        
        # Delete avatar from MinIO if exists
        avatar_object_key = user.get("avatar_object_key")
        if avatar_object_key:
            try:
                from app.services.avatar_service import avatar_service
                await avatar_service._delete_object(avatar_object_key)
                logger.info(f"Deleted avatar for user {user_id}: {avatar_object_key}")
            except Exception as e:
                # Best-effort deletion, don't fail the erasure
                logger.warning(f"Failed to delete avatar for user {user_id}: {e}")
        
        # Perform PII erasure
        now = datetime.now(timezone.utc)
        current_version = user["version"]
        
        # Mask/clear PII fields
        updates = {
            "email": f"deleted_{user_id}@deleted.local",
            "first_name": None,
            "last_name": None,
            "phone": None,
            "addresses": [],
            "pending_email": None,
            "avatar_url": None,
            "avatar_object_key": None,
            "password_hash": None,
            "erasure_completed_at": now,
            "erasure_requested": False  # Mark as completed
        }
        
        try:
            await self.user_repo.update_with_version(
                user_id=user_id,
                current_version=current_version,
                updates=updates
            )
            
            # Log successful erasure completion
            logger.info(
                f"PII erasure completed for user_id={user_id}, "
                f"timestamp={now.isoformat()}, "
                f"deleted_at={user.get('deleted_at').isoformat() if user.get('deleted_at') else 'unknown'}"
            )
            
            return True
        except ConflictError:
            # Retry on next run
            logger.warning(f"Version conflict during erasure for user {user_id}, will retry")
            return False


# Singleton instance
account_erasure_service = AccountErasureService()
