"""User repository for database operations."""
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

from app.services.db import get_db
from app.schemas.user import UserRole


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
            "created_at": doc["created_at"],
            "last_login_at": doc.get("last_login_at")
        }


# Singleton instance
user_repository = UserRepository()
