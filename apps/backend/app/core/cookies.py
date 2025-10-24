"""
Secure cookie utilities for session and cart management.
Implements security best practices: HttpOnly, SameSite, Secure flags.
"""
from typing import Optional
from fastapi import Response, Request
from app.core.config import settings


class SecureCookie:
    """
    Utility class for managing secure cookies.
    
    Implements security best practices:
    - HttpOnly: Prevents JavaScript access (XSS protection)
    - SameSite=Lax: CSRF protection while allowing normal navigation
    - Secure: HTTPS only in production
    - Domain and Path restrictions
    """
    
    @staticmethod
    def set_cookie(
        response: Response,
        key: str,
        value: str,
        max_age: Optional[int] = None,
        expires: Optional[int] = None,
        path: str = "/",
        domain: Optional[str] = None,
        secure: Optional[bool] = None,
        httponly: bool = True,
        samesite: str = "lax"
    ) -> None:
        """
        Set a secure cookie.
        
        Args:
            response: FastAPI response object
            key: Cookie name
            value: Cookie value
            max_age: Cookie lifetime in seconds
            expires: Expiration timestamp
            path: Cookie path (default: "/")
            domain: Cookie domain (default: None)
            secure: Use Secure flag (default: True in production)
            httponly: Use HttpOnly flag (default: True)
            samesite: SameSite policy (default: "lax")
        """
        # Auto-detect secure flag based on environment
        if secure is None:
            secure = settings.ENVIRONMENT == "production"
        
        response.set_cookie(
            key=key,
            value=value,
            max_age=max_age,
            expires=expires,
            path=path,
            domain=domain,
            secure=secure,
            httponly=httponly,
            samesite=samesite
        )
    
    @staticmethod
    def get_cookie(request: Request, key: str) -> Optional[str]:
        """
        Get cookie value from request.
        
        Args:
            request: FastAPI request object
            key: Cookie name
            
        Returns:
            Cookie value or None if not found
        """
        return request.cookies.get(key)
    
    @staticmethod
    def delete_cookie(
        response: Response,
        key: str,
        path: str = "/",
        domain: Optional[str] = None
    ) -> None:
        """
        Delete a cookie.
        
        Args:
            response: FastAPI response object
            key: Cookie name
            path: Cookie path (must match set_cookie path)
            domain: Cookie domain (must match set_cookie domain)
        """
        response.delete_cookie(key=key, path=path, domain=domain)


# Predefined cookie configurations

def set_session_cookie(
    response: Response,
    session_id: str,
    max_age: int = 86400 * 7  # 7 days
) -> None:
    """
    Set session cookie with secure defaults.
    
    Args:
        response: FastAPI response object
        session_id: Session identifier
        max_age: Cookie lifetime in seconds (default: 7 days)
    """
    SecureCookie.set_cookie(
        response=response,
        key="session_id",
        value=session_id,
        max_age=max_age,
        httponly=True,
        samesite="lax"
    )


def set_cart_cookie(
    response: Response,
    cart_id: str,
    max_age: int = 86400 * 7  # 7 days for guest carts
) -> None:
    """
    Set cart cookie with secure defaults.
    
    Args:
        response: FastAPI response object
        cart_id: Cart identifier
        max_age: Cookie lifetime in seconds (default: 7 days)
    """
    SecureCookie.set_cookie(
        response=response,
        key="cart_id",
        value=cart_id,
        max_age=max_age,
        httponly=True,
        samesite="lax"
    )


def set_refresh_token_cookie(
    response: Response,
    refresh_token: str,
    max_age: int = 86400 * 7  # 7 days
) -> None:
    """
    Set refresh token cookie with secure defaults.
    
    Args:
        response: FastAPI response object
        refresh_token: JWT refresh token
        max_age: Cookie lifetime in seconds (default: 7 days)
    """
    SecureCookie.set_cookie(
        response=response,
        key="refresh_token",
        value=refresh_token,
        max_age=max_age,
        httponly=True,
        samesite="strict",  # Stricter for refresh tokens
        path="/api/v1/auth/refresh"  # Only sent to refresh endpoint
    )


def get_session_id(request: Request) -> Optional[str]:
    """Get session ID from cookie."""
    return SecureCookie.get_cookie(request, "session_id")


def get_cart_id(request: Request) -> Optional[str]:
    """Get cart ID from cookie."""
    return SecureCookie.get_cookie(request, "cart_id")


def get_refresh_token(request: Request) -> Optional[str]:
    """Get refresh token from cookie."""
    return SecureCookie.get_cookie(request, "refresh_token")


def clear_auth_cookies(response: Response) -> None:
    """
    Clear all authentication-related cookies.
    
    Args:
        response: FastAPI response object
    """
    SecureCookie.delete_cookie(response, "session_id")
    SecureCookie.delete_cookie(response, "refresh_token", path="/api/v1/auth/refresh")


def clear_cart_cookie(response: Response) -> None:
    """
    Clear cart cookie.
    
    Args:
        response: FastAPI response object
    """
    SecureCookie.delete_cookie(response, "cart_id")
