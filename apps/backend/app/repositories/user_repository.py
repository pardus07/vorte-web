"""User repository for database operations."""
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from bson import ObjectId
from pymongo import ReturnDocument

from app.services.db import get_db
from app.schemas.user import UserRole
from app.core.exceptions import ConflictError


class UserRepository:
    """Repository for user data access."""
    
    def __init__(self):
        self.collection_name = "users"
    
    async def get_by_email(self, email: str) -> Optional[dict]:
        """Get user by email address."""
        db = get_db()
        return await db[self.collection_name].find_one({"email": email})
    
    async def get_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID."""
        db = get_db()
        try:
            return await db[self.collection_name].find_one({"_id": ObjectId(user_id)})
        except Exception:
            return None
    
    async def create_user(
        self,
        email: str,
        password_hash: str,
        first_name: str,
        last_name: str,
        phone: Optional[str] = None,
        role: UserRole = UserRole.CUSTOMER,
        kvkk_consent: Optional[dict] = None
    ) -> dict:
        """Create a new user."""
        db = get_db()
        
        now = datetime.now(timezone.utc)
        doc = {
            "email": email,
            "password_hash": password_hash,
            "first_name": first_name,
            "last_name": last_name,
            "phone": phone,
            "role": role.value,
            "email_verified": False,
            "phone_verified": False,
            "addresses": [],
            "default_address_id": None,
            "kvkk_consent": kvkk_consent,
            "created_at": now,
            "last_login_at": None,
            "version": 1
        }
        
        result = await db[self.collection_name].insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc
    
    async def update_last_login(self, user_id: str) -> bool:
        """Update user's last login timestamp."""
        db = get_db()
        
        result = await db[self.collection_name].update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"last_login_at": datetime.now(timezone.utc)}}
        )
        
        return result.modified_count > 0
    
    async def email_exists(self, email: str) -> bool:
        """Check if email already exists."""
        db = get_db()
        count = await db[self.collection_name].count_documents({"email": email}, limit=1)
        return count > 0
    
    # Profile Management Methods
    
    async def update_with_version(
        self,
        user_id: str,
        current_version: int,
        updates: Dict[str, Any]
    ) -> dict:
        """
        Update user with optimistic locking (ETag/If-Match).
        
        Args:
            user_id: User ID
            current_version: Expected current version from If-Match header
            updates: Fields to update
            
        Returns:
            Updated user document
            
        Raises:
            ConflictError: If version mismatch (409)
        """
        db = get_db()
        
        now = datetime.now(timezone.utc)
        update_doc = {
            "$set": {**updates, "updated_at": now},
            "$inc": {"version": 1}
        }
        
        result = await db[self.collection_name].find_one_and_update(
            {"_id": ObjectId(user_id), "version": current_version},
            update_doc,
            return_document=ReturnDocument.AFTER
        )
        
        if not result:
            raise ConflictError(
                message="Resource has been modified by another request",
                details={
                    "current_version": current_version,
                    "resource": "user"
                }
            )
        
        return result
    
    async def set_pending_email(
        self,
        user_id: str,
        expected_version: int,
        new_email: str,
        token_hash: str,
        expires_at: datetime
    ) -> Optional[dict]:
        """
        Set pending email for verification with token and expiry.
        
        Args:
            user_id: User ID
            expected_version: Expected current version for optimistic locking
            new_email: New email awaiting verification
            token_hash: SHA-256 hash of verification token
            expires_at: Token expiration timestamp
            
        Returns:
            Updated user document or None if version mismatch
            
        Raises:
            ConflictError: If version mismatch
        """
        db = get_db()
        
        now = datetime.now(timezone.utc)
        result = await db[self.collection_name].find_one_and_update(
            {"_id": ObjectId(user_id), "version": expected_version},
            {
                "$set": {
                    "pending_email": {
                        "email": new_email,
                        "token_hash": token_hash,
                        "expires_at": expires_at
                    },
                    "updated_at": now
                },
                "$inc": {"version": 1}
            },
            return_document=ReturnDocument.AFTER
        )
        
        if not result:
            raise ConflictError(
                message="Resource has been modified by another request",
                details={
                    "current_version": expected_version,
                    "resource": "user"
                }
            )
        
        return result
    
    async def confirm_email_change(self, user_id: str, token_hash: str) -> Optional[dict]:
        """
        Confirm email change by verifying token and moving pending_email to email.
        
        Args:
            user_id: User ID
            token_hash: SHA-256 hash of verification token
            
        Returns:
            Updated user document or None if no pending email or token mismatch
            
        Raises:
            ConflictError: If token mismatch or expired
        """
        db = get_db()
        
        # Get user with pending email
        user = await db[self.collection_name].find_one(
            {"_id": ObjectId(user_id)},
            {"pending_email": 1, "version": 1}
        )
        
        if not user or not user.get("pending_email"):
            return None
        
        pending = user["pending_email"]
        
        # Verify token hash
        if pending.get("token_hash") != token_hash:
            raise ConflictError(
                message="Invalid verification token",
                details={"error": "EMAIL_TOKEN_INVALID"}
            )
        
        # Check expiry
        expires_at = pending.get("expires_at")
        if not expires_at or datetime.now(timezone.utc) >= expires_at:
            raise ConflictError(
                message="Verification token has expired",
                details={"error": "EMAIL_TOKEN_EXPIRED"}
            )
        
        new_email = pending["email"]
        
        # Move pending_email to email and increment version
        now = datetime.now(timezone.utc)
        result = await db[self.collection_name].find_one_and_update(
            {"_id": ObjectId(user_id)},
            {
                "$set": {"email": new_email, "updated_at": now},
                "$unset": {"pending_email": ""},
                "$inc": {"version": 1}
            },
            return_document=ReturnDocument.AFTER
        )
        
        return result
    
    async def set_avatar_url(self, user_id: str, current_version: int, avatar_url: str) -> dict:
        """
        Set avatar URL with version control.
        
        Args:
            user_id: User ID
            current_version: Expected current version
            avatar_url: MinIO object URL
            
        Returns:
            Updated user document
            
        Raises:
            ConflictError: If version mismatch
        """
        return await self.update_with_version(
            user_id=user_id,
            current_version=current_version,
            updates={"avatar_url": avatar_url}
        )
    
    async def clear_avatar_url(self, user_id: str, current_version: int) -> dict:
        """
        Clear avatar URL with version control.
        
        Args:
            user_id: User ID
            current_version: Expected current version
            
        Returns:
            Updated user document
            
        Raises:
            ConflictError: If version mismatch
        """
        return await self.update_with_version(
            user_id=user_id,
            current_version=current_version,
            updates={"avatar_url": None}
        )
    
    async def mark_for_erasure(self, user_id: str, current_version: int) -> dict:
        """
        Mark user account for KVKV-compliant erasure.
        
        Args:
            user_id: User ID
            current_version: Expected current version
            
        Returns:
            Updated user document
            
        Raises:
            ConflictError: If version mismatch
        """
        now = datetime.now(timezone.utc)
        return await self.update_with_version(
            user_id=user_id,
            current_version=current_version,
            updates={
                "deleted_at": now,
                "erasure_requested": True
            }
        )
    
    def to_public(self, doc: dict) -> dict:
        """Convert database document to public user dict."""
        return {
            "id": str(doc["_id"]),
            "email": doc["email"],
            "first_name": doc["first_name"],
            "last_name": doc["last_name"],
            "phone": doc.get("phone"),
            "role": doc["role"],
            "email_verified": doc.get("email_verified", False),
            "phone_verified": doc.get("phone_verified", False),
            "avatar_url": doc.get("avatar_url"),
            "created_at": doc["created_at"],
            "last_login_at": doc.get("last_login_at"),
            "version": doc.get("version", 1)
        }
    
    async def init_indexes(self):
        """
        Initialize database indexes.
        
        Creates:
        - Unique index on email
        - Unique sparse index on phone
        - Index on deleted_at (for erasure job queries)
        - Index on erasure_requested (for erasure queue processing)
        """
        db = get_db()
        coll = db[self.collection_name]
        
        # Email unique index
        await coll.create_index("email", unique=True)
        
        # Phone unique sparse index (not all users have phone)
        await coll.create_index("phone", unique=True, sparse=True)
        
        # Profile management indexes
        await coll.create_index("deleted_at")
        await coll.create_index("erasure_requested")
    
    async def add_address(
        self,
        user_id: str,
        address: dict,
        set_as_default: bool = False
    ) -> Optional[dict]:
        """
        Add address to user.
        
        Args:
            user_id: User ID
            address: Address dict
            set_as_default: Whether to set as default address
            
        Returns:
            Updated user document or None
        """
        db = get_db()
        
        # Generate address ID
        import uuid
        address_id = str(uuid.uuid4())
        address["id"] = address_id
        address["created_at"] = datetime.now(timezone.utc)
        
        update = {"$push": {"addresses": address}}
        
        if set_as_default:
            update["$set"] = {"default_address_id": address_id}
        
        result = await db[self.collection_name].find_one_and_update(
            {"_id": ObjectId(user_id)},
            update,
            return_document=True
        )
        
        return result
    
    async def update_address(
        self,
        user_id: str,
        address_id: str,
        address_updates: dict
    ) -> bool:
        """
        Update user address.
        
        Args:
            user_id: User ID
            address_id: Address ID
            address_updates: Fields to update
            
        Returns:
            True if updated, False otherwise
        """
        db = get_db()
        
        # Build update for array element
        update_fields = {}
        for key, value in address_updates.items():
            update_fields[f"addresses.$.{key}"] = value
        
        result = await db[self.collection_name].update_one(
            {
                "_id": ObjectId(user_id),
                "addresses.id": address_id
            },
            {"$set": update_fields}
        )
        
        return result.modified_count > 0
    
    async def delete_address(
        self,
        user_id: str,
        address_id: str
    ) -> bool:
        """
        Delete user address.
        
        Args:
            user_id: User ID
            address_id: Address ID
            
        Returns:
            True if deleted, False otherwise
        """
        db = get_db()
        
        result = await db[self.collection_name].update_one(
            {"_id": ObjectId(user_id)},
            {"$pull": {"addresses": {"id": address_id}}}
        )
        
        return result.modified_count > 0
    
    @staticmethod
    def mask_pii(text: str, visible_chars: int = 2) -> str:
        """
        Mask PII data for logging.
        
        Shows first and last N characters, masks the rest.
        
        Args:
            text: Text to mask
            visible_chars: Number of visible characters at start/end
            
        Returns:
            Masked text
        """
        if not text or len(text) <= visible_chars * 2:
            return "***"
        
        return f"{text[:visible_chars]}***{text[-visible_chars:]}"
    
    @staticmethod
    def mask_email(email: str) -> str:
        """
        Mask email for logging.
        
        Example: john.doe@example.com -> jo***@ex***.com
        """
        if not email or "@" not in email:
            return "***"
        
        local, domain = email.split("@", 1)
        domain_parts = domain.split(".", 1)
        
        masked_local = UserRepository.mask_pii(local, 2)
        masked_domain = UserRepository.mask_pii(domain_parts[0], 2)
        
        if len(domain_parts) > 1:
            return f"{masked_local}@{masked_domain}.{domain_parts[1]}"
        return f"{masked_local}@{masked_domain}"
    
    @staticmethod
    def mask_phone(phone: str) -> str:
        """
        Mask phone number for logging.
        
        Example: +905551234567 -> +9***67
        """
        return UserRepository.mask_pii(phone, 2)


# Singleton instance
user_repository = UserRepository()
