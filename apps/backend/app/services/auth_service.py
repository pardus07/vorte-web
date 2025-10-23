"""Authentication service for user registration and login."""
from datetime import datetime, timezone
from typing import Optional, Tuple

from jose import JWTError

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.core.exceptions import ValidationError, UnauthorizedError, ConflictError
from app.repositories.user_repository import user_repository
from app.services.redis_service import redis_service
from app.schemas.user import (
    UserCreate,
    User,
    TokenPair,
    AuthResult,
    UserRole,
    KVKKConsent
)
from app.core.config import settings


class AuthService:
    """Service for authentication operations."""
    
    async def register(self, user_data: UserCreate, client_ip: str) -> User:
        """
        Register a new user.
        
        Args:
            user_data: User registration data
            client_ip: Client IP address for KVKK consent logging
            
        Returns:
            Created user
            
        Raises:
            ConflictError: If email already exists
        """
        # Check if email exists
        if await user_repository.email_exists(user_data.email):
            raise ConflictError(
                "Email already registered",
                details={"email": user_data.email}
            )
        
        # Hash password
        password_hash = hash_password(user_data.password)
        
        # Prepare KVKK consent
        kvkk_consent = {
            "marketing_consent": user_data.kvkk_marketing_consent,
            "data_processing_consent": user_data.kvkk_data_processing_consent,
            "consent_date": datetime.now(timezone.utc),
            "consent_ip": client_ip,
            "consent_text_version": "1.0"
        }
        
        # Create user
        user_doc = await user_repository.create_user(
            email=user_data.email,
            password_hash=password_hash,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone=user_data.phone,
            role=UserRole.CUSTOMER,
            kvkk_consent=kvkk_consent
        )
        
        # Convert to User schema
        user_dict = user_repository.to_public(user_doc)
        return User(**user_dict)
    
    async def login(self, email: str, password: str) -> AuthResult:
        """
        Authenticate user and generate tokens.
        
        Args:
            email: User email
            password: User password
            
        Returns:
            AuthResult with user and tokens
            
        Raises:
            UnauthorizedError: If credentials are invalid
        """
        # Get user by email
        user_doc = await user_repository.get_by_email(email)
        
        if not user_doc:
            raise UnauthorizedError("Invalid email or password")
        
        # Verify password
        if not verify_password(password, user_doc["password_hash"]):
            raise UnauthorizedError("Invalid email or password")
        
        # Update last login
        user_id = str(user_doc["_id"])
        await user_repository.update_last_login(user_id)
        
        # Generate tokens
        role = UserRole(user_doc["role"])
        access_token = create_access_token(user_id, email, role)
        refresh_token = create_refresh_token(user_id, email, role)
        
        # Prepare response
        user_dict = user_repository.to_public(user_doc)
        user = User(**user_dict)
        
        tokens = TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
        return AuthResult(user=user, tokens=tokens)
    
    async def refresh_tokens(self, refresh_token: str) -> TokenPair:
        """
        Refresh access token using refresh token.
        
        Implements token rotation: old refresh token is revoked,
        new pair is issued.
        
        Args:
            refresh_token: Current refresh token
            
        Returns:
            New token pair
            
        Raises:
            UnauthorizedError: If refresh token is invalid or revoked
        """
        try:
            # Decode refresh token
            payload = decode_token(refresh_token)
            
            # Check if token is revoked
            if await redis_service.is_denied(payload.jti):
                raise UnauthorizedError("Refresh token has been revoked")
            
            # Revoke old refresh token (rotation)
            ttl = payload.exp - int(datetime.now(timezone.utc).timestamp())
            if ttl > 0:
                await redis_service.add_to_denylist(payload.jti, ttl)
            
            # Get user to verify still exists and get current role
            user_doc = await user_repository.get_by_id(payload.sub)
            if not user_doc:
                raise UnauthorizedError("User not found")
            
            # Generate new token pair
            user_id = str(user_doc["_id"])
            email = user_doc["email"]
            role = UserRole(user_doc["role"])
            
            access_token = create_access_token(user_id, email, role)
            new_refresh_token = create_refresh_token(user_id, email, role)
            
            return TokenPair(
                access_token=access_token,
                refresh_token=new_refresh_token,
                token_type="bearer",
                expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )
            
        except JWTError as e:
            raise UnauthorizedError(f"Invalid refresh token: {str(e)}")
    
    async def logout(self, access_token: str, refresh_token: str) -> bool:
        """
        Logout user by revoking both tokens.
        
        Args:
            access_token: Current access token
            refresh_token: Current refresh token
            
        Returns:
            True if logout successful
        """
        try:
            # Decode both tokens
            access_payload = decode_token(access_token)
            refresh_payload = decode_token(refresh_token)
            
            # Add both to denylist
            access_ttl = access_payload.exp - int(datetime.now(timezone.utc).timestamp())
            refresh_ttl = refresh_payload.exp - int(datetime.now(timezone.utc).timestamp())
            
            if access_ttl > 0:
                await redis_service.add_to_denylist(access_payload.jti, access_ttl)
            
            if refresh_ttl > 0:
                await redis_service.add_to_denylist(refresh_payload.jti, refresh_ttl)
            
            return True
            
        except JWTError:
            # If tokens are invalid, consider logout successful
            return True


# Singleton instance
auth_service = AuthService()
