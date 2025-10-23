"""FastAPI dependencies for authentication and authorization."""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

from app.core.security import decode_token, is_token_revoked
from app.core.exceptions import UnauthorizedError, ForbiddenError
from app.schemas.user import TokenPayload, UserRole


# OAuth2 scheme for Bearer token
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    scheme_name="JWT"
)


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)]
) -> TokenPayload:
    """
    Dependency to get current authenticated user from JWT token.
    
    Args:
        token: JWT access token from Authorization header
        
    Returns:
        TokenPayload with user information
        
    Raises:
        UnauthorizedError: If token is invalid, expired, or revoked
    """
    try:
        payload = decode_token(token)
        
        # Check if token is revoked
        if is_token_revoked(payload.jti):
            raise UnauthorizedError("Token has been revoked")
        
        return payload
        
    except JWTError as e:
        raise UnauthorizedError(f"Could not validate credentials: {str(e)}")


async def get_current_active_user(
    current_user: Annotated[TokenPayload, Depends(get_current_user)]
) -> TokenPayload:
    """
    Dependency to get current active user.
    
    In the future, this can check if user is active/not banned.
    For now, it's the same as get_current_user.
    """
    return current_user


class RoleChecker:
    """
    Dependency class to check if user has required role(s).
    
    Usage:
        @app.get("/admin/users", dependencies=[Depends(RoleChecker([UserRole.ADMIN]))])
    """
    
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles
    
    def __call__(
        self,
        current_user: Annotated[TokenPayload, Depends(get_current_active_user)]
    ) -> TokenPayload:
        """
        Check if current user has one of the allowed roles.
        
        Args:
            current_user: Current authenticated user
            
        Returns:
            TokenPayload if user has required role
            
        Raises:
            ForbiddenError: If user doesn't have required role
        """
        if current_user.role not in self.allowed_roles:
            raise ForbiddenError(
                f"User with role '{current_user.role.value}' is not allowed to access this resource. "
                f"Required roles: {[role.value for role in self.allowed_roles]}"
            )
        
        return current_user


# Common role checkers
require_admin = RoleChecker([UserRole.ADMIN])
require_staff = RoleChecker([UserRole.ADMIN, UserRole.STAFF])
require_b2b = RoleChecker([UserRole.B2B_BUYER])


# Optional authentication (for endpoints that work with or without auth)
async def get_current_user_optional(
    token: Annotated[str | None, Depends(oauth2_scheme)] = None
) -> TokenPayload | None:
    """
    Dependency to optionally get current user.
    
    Returns None if no token is provided or token is invalid.
    Useful for endpoints that work differently for authenticated vs guest users.
    """
    if token is None:
        return None
    
    try:
        payload = decode_token(token)
        if not is_token_revoked(payload.jti):
            return payload
    except JWTError:
        pass
    
    return None
