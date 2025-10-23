"""User-related schemas for authentication and profile management."""
from datetime import datetime
from typing import Optional
from enum import Enum

from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict


class UserRole(str, Enum):
    """User roles for RBAC."""
    CUSTOMER = "customer"
    ADMIN = "admin"
    STAFF = "staff"
    B2B_BUYER = "b2b_buyer"


class KVKKConsent(BaseModel):
    """KVKK consent information."""
    marketing_consent: bool = Field(description="Consent for marketing communications")
    data_processing_consent: bool = Field(description="Consent for data processing")
    consent_date: datetime = Field(description="Date of consent")
    consent_ip: str = Field(description="IP address when consent was given")
    consent_text_version: str = Field(description="Version of consent text")


class Address(BaseModel):
    """User address."""
    id: Optional[str] = None
    title: str = Field(min_length=1, max_length=50, description="Address title (e.g., Home, Office)")
    first_name: str = Field(min_length=1, max_length=50)
    last_name: str = Field(min_length=1, max_length=50)
    phone: str = Field(pattern=r"^\+?[1-9]\d{1,14}$", description="Phone number in E.164 format")
    address_line: str = Field(min_length=5, max_length=200)
    city: str = Field(min_length=2, max_length=50)
    district: str = Field(min_length=2, max_length=50)
    postal_code: str = Field(pattern=r"^\d{5}$", description="5-digit postal code")
    country: str = Field(default="TR", max_length=2, description="ISO 3166-1 alpha-2 country code")
    is_default: bool = Field(default=False)


class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr = Field(description="User email address")
    phone: Optional[str] = Field(
        default=None,
        pattern=r"^\+?[1-9]\d{1,14}$",
        description="Phone number in E.164 format"
    )
    first_name: str = Field(min_length=1, max_length=50)
    last_name: str = Field(min_length=1, max_length=50)


class UserCreate(UserBase):
    """Schema for user registration."""
    password: str = Field(
        min_length=8,
        max_length=128,
        description="Password (min 8 characters, must include uppercase, lowercase, digit)"
    )
    kvkk_marketing_consent: bool = Field(default=False, description="KVKK marketing consent")
    kvkk_data_processing_consent: bool = Field(description="KVKK data processing consent (required)")
    
    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password meets ASVS V2 requirements."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)
        
        if not (has_upper and has_lower and has_digit):
            raise ValueError(
                "Password must contain at least one uppercase letter, "
                "one lowercase letter, and one digit"
            )
        
        return v


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr = Field(description="User email address")
    password: str = Field(description="User password")


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    phone: Optional[str] = Field(
        default=None,
        pattern=r"^\+?[1-9]\d{1,14}$"
    )


class User(UserBase):
    """User schema for responses (without password)."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(description="User ID")
    role: UserRole = Field(default=UserRole.CUSTOMER)
    email_verified: bool = Field(default=False)
    phone_verified: bool = Field(default=False)
    created_at: datetime
    last_login_at: Optional[datetime] = None


class UserWithAddresses(User):
    """User schema with addresses."""
    addresses: list[Address] = Field(default_factory=list)
    default_address_id: Optional[str] = None


class TokenPair(BaseModel):
    """JWT token pair."""
    access_token: str = Field(description="Short-lived access token")
    refresh_token: str = Field(description="Long-lived refresh token")
    token_type: str = Field(default="bearer")
    expires_in: int = Field(description="Access token expiry in seconds")


class TokenPayload(BaseModel):
    """JWT token payload."""
    sub: str = Field(description="Subject (user ID)")
    email: str = Field(description="User email")
    role: UserRole = Field(description="User role")
    exp: int = Field(description="Expiration timestamp")
    iat: int = Field(description="Issued at timestamp")
    jti: str = Field(description="JWT ID (for revocation)")


class RefreshTokenRequest(BaseModel):
    """Request to refresh access token."""
    refresh_token: str = Field(description="Refresh token")


class AuthResult(BaseModel):
    """Authentication result with user and tokens."""
    user: User
    tokens: TokenPair
