"""Security utilities for password hashing and JWT token management."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import JWTError, jwt

from app.core.config import settings
from app.schemas.user import TokenPayload, UserRole


# Argon2 password hasher (OWASP recommended)
# Parameters loaded from environment configuration
_password_hasher: Optional[PasswordHasher] = None


def get_password_hasher() -> PasswordHasher:
    """
    Get singleton Argon2id password hasher configured from environment.
    
    Uses environment-specific parameters:
    - Development: 64MB memory, 2 parallelism
    - Production: 128MB memory, 4 parallelism
    
    Returns:
        Configured PasswordHasher instance
    """
    global _password_hasher
    if _password_hasher is None:
        _password_hasher = PasswordHasher(
            time_cost=settings.ARGON2_TIME_COST,
            memory_cost=settings.ARGON2_MEMORY_COST,
            parallelism=settings.ARGON2_PARALLELISM,
            hash_len=32,  # Length of hash in bytes
            salt_len=16,  # Length of salt in bytes
        )
    return _password_hasher


def hash_password(password: str) -> str:
    """
    Hash a password using Argon2id.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password string
        
    Note:
        Uses Argon2id variant which provides resistance against both
        side-channel and GPU-based attacks (OWASP recommendation).
        Parameters are loaded from environment configuration.
    """
    return get_password_hasher().hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to compare against
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        hasher = get_password_hasher()
        hasher.verify(hashed_password, plain_password)
        
        # Check if rehashing is needed (parameters changed)
        if hasher.check_needs_rehash(hashed_password):
            # In production, trigger a background job to rehash
            # For now, just log it
            pass
        
        return True
    except VerifyMismatchError:
        return False


def create_access_token(
    user_id: str,
    email: str,
    role: UserRole,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.
    
    Args:
        user_id: User ID (subject)
        email: User email
        role: User role for RBAC
        expires_delta: Token expiration time (default: 15 minutes)
        
    Returns:
        Encoded JWT token
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    now = datetime.now(timezone.utc)
    expire = now + expires_delta
    
    payload = {
        "sub": user_id,
        "email": email,
        "role": role.value,
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "jti": str(uuid.uuid4()),  # JWT ID for revocation
        "type": "access"
    }
    
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(
    user_id: str,
    email: str,
    role: UserRole,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT refresh token.
    
    Args:
        user_id: User ID (subject)
        email: User email
        role: User role
        expires_delta: Token expiration time (default: 7 days)
        
    Returns:
        Encoded JWT refresh token
    """
    if expires_delta is None:
        expires_delta = timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    
    now = datetime.now(timezone.utc)
    expire = now + expires_delta
    
    payload = {
        "sub": user_id,
        "email": email,
        "role": role.value,
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "jti": str(uuid.uuid4()),
        "type": "refresh"
    }
    
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> TokenPayload:
    """
    Decode and validate a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        TokenPayload with decoded claims
        
    Raises:
        JWTError: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        return TokenPayload(
            sub=payload["sub"],
            email=payload["email"],
            role=UserRole(payload["role"]),
            exp=payload["exp"],
            iat=payload["iat"],
            jti=payload["jti"]
        )
    except JWTError as e:
        raise JWTError(f"Invalid token: {str(e)}")


async def is_token_revoked(jti: str) -> bool:
    """
    Check if a token has been revoked.
    
    Args:
        jti: JWT ID
        
    Returns:
        True if token is revoked, False otherwise
    """
    from app.services.redis_service import redis_service
    return await redis_service.is_denied(jti)


async def revoke_token(jti: str, expires_in: int) -> None:
    """
    Revoke a token by adding it to the denylist.
    
    Args:
        jti: JWT ID
        expires_in: Time until token naturally expires (for TTL)
    """
    from app.services.redis_service import redis_service
    await redis_service.add_to_denylist(jti, expires_in)
