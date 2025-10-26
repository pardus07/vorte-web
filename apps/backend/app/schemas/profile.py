"""Pydantic schemas for user profile management operations."""
from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


# Constants
PASSWORD_MIN_LENGTH = 8
AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024  # 2MB
ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"]


# Profile Update Schemas

class ProfileUpdate(BaseModel):
    """Profile update request schema."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    
    @field_validator("first_name", "last_name")
    @classmethod
    def strip_whitespace(cls, v: Optional[str]) -> Optional[str]:
        """Strip leading/trailing whitespace from names."""
        if v is not None:
            return v.strip()
        return v


class ProfileResponse(BaseModel):
    """User profile response schema."""
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str
    email_verified: bool
    phone_verified: bool
    avatar_url: Optional[str] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None
    version: int


# Email Change Schemas

class EmailChangeRequest(BaseModel):
    """Email change request schema."""
    new_email: EmailStr


class EmailChangeConfirm(BaseModel):
    """Email change confirmation schema."""
    token: str = Field(..., min_length=1)


# Password Change Schemas

class PasswordChange(BaseModel):
    """Password change request schema."""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=PASSWORD_MIN_LENGTH)
    
    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password meets minimum requirements."""
        if len(v) < PASSWORD_MIN_LENGTH:
            raise ValueError(f"Password must be at least {PASSWORD_MIN_LENGTH} characters")
        return v


# Avatar Upload Schemas

class AvatarUploadUrlRequest(BaseModel):
    """Avatar upload URL request schema."""
    content_type: Literal["image/jpeg", "image/png", "image/webp"]
    
    @field_validator("content_type")
    @classmethod
    def validate_content_type(cls, v: str) -> str:
        """Validate content type is allowed."""
        if v not in ALLOWED_AVATAR_TYPES:
            raise ValueError(f"Content type must be one of: {', '.join(ALLOWED_AVATAR_TYPES)}")
        return v


class AvatarUploadUrlResponse(BaseModel):
    """Avatar upload URL response schema."""
    upload_url: str
    object_key: str
    expires_at: datetime


class AvatarConfirmRequest(BaseModel):
    """Avatar upload confirmation request schema."""
    object_key: str = Field(..., min_length=1, max_length=500)


# Account Deletion Schemas

class AccountDeletionResponse(BaseModel):
    """Account deletion response schema."""
    message: str
    erasure_job_id: str
    status: Literal["accepted"] = "accepted"
