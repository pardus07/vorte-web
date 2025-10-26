"""Email verification service for email change operations."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.repositories.user_repository import user_repository
from app.schemas.profile import ProfileResponse
from app.core.config import settings
from app.core.exceptions import NotFoundError, ConflictError, PreconditionRequiredError
from app.core.etag import generate_etag, parse_etag


def _hash_token(token: str) -> str:
    """Hash verification token using SHA-256."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _mask_email(email: str) -> str:
    """
    Mask email for logging/responses.
    Example: john.doe@example.com -> jo***@ex***.com
    """
    if not email or "@" not in email:
        return "***"
    
    local, domain = email.split("@", 1)
    domain_parts = domain.split(".", 1)
    
    if len(local) <= 2:
        masked_local = local[:1] + "***"
    else:
        masked_local = local[:2] + "***"
    
    masked_domain = domain_parts[0][:2] + "***" if len(domain_parts[0]) > 2 else "***"
    
    if len(domain_parts) > 1:
        return f"{masked_local}@{masked_domain}.{domain_parts[1]}"
    return f"{masked_local}@{masked_domain}"


class EmailVerificationService:
    """Service for email change verification operations."""
    
    def __init__(self, user_repo=None):
        self.user_repo = user_repo or user_repository
    
    async def request_email_change(
        self,
        user_id: str,
        new_email: str,
        if_match: Optional[str]
    ) -> tuple[dict, str]:
        """
        Request email change with verification token.
        
        Args:
            user_id: User ID
            new_email: New email address
            if_match: If-Match header value (ETag)
            
        Returns:
            Tuple of (response dict, new ETag)
            
        Raises:
            PreconditionRequiredError: If If-Match header missing (428)
            ConflictError: If version mismatch or email already exists (409)
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
        
        # Check user exists and not deleted
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError(resource="User", identifier=user_id)
        
        if user.get("deleted_at"):
            raise NotFoundError(resource="User", identifier=user_id)
        
        # Check if new email already exists
        if await self.user_repo.email_exists(new_email):
            raise ConflictError(
                message="Email address already in use",
                details={"error": "EMAIL_ALREADY_EXISTS"}
            )
        
        # Generate verification token
        token = secrets.token_urlsafe(32)
        token_hash = _hash_token(token)
        
        # Calculate expiry
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=settings.EMAIL_VERIFICATION_EXPIRES_SECONDS)
        
        # Set pending email with token
        updated_user = await self.user_repo.set_pending_email(
            user_id=user_id,
            expected_version=expected_version,
            new_email=new_email,
            token_hash=token_hash,
            expires_at=expires_at
        )
        
        # Generate new ETag
        etag = generate_etag(updated_user["version"])
        
        # Return response
        response = {
            "pending_email": _mask_email(new_email),
            "expires_at": expires_at.isoformat(),
            "message": "Email change requested. Please verify the new address."
        }
        
        # In non-production, include token for testing
        if settings.ENVIRONMENT != "production":
            response["verification_token"] = token
        
        return response, etag
    
    async def confirm_email_change(
        self,
        user_id: str,
        token: str
    ) -> tuple[ProfileResponse, str]:
        """
        Confirm email change with verification token.
        
        Args:
            user_id: User ID
            token: Verification token
            
        Returns:
            Tuple of (ProfileResponse, new ETag)
            
        Raises:
            NotFoundError: If user not found
            ConflictError: If no pending email, token invalid/expired
        """
        # Check user exists and not deleted
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError(resource="User", identifier=user_id)
        
        if user.get("deleted_at"):
            raise NotFoundError(resource="User", identifier=user_id)
        
        # Check if there's a pending email change
        if not user.get("pending_email"):
            raise ConflictError(
                message="No pending email change",
                details={"error": "NO_PENDING_EMAIL_CHANGE"}
            )
        
        # Hash token for verification
        token_hash = _hash_token(token)
        
        # Confirm email change (repository handles token validation and expiry)
        try:
            updated_user = await self.user_repo.confirm_email_change(
                user_id=user_id,
                token_hash=token_hash
            )
        except ConflictError:
            # Re-raise with context
            raise
        
        if not updated_user:
            raise ConflictError(
                message="Email change confirmation failed",
                details={"error": "CONFIRMATION_FAILED"}
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
email_verification_service = EmailVerificationService()
