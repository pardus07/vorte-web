"""Authentication endpoints with rate limiting and secure cookies."""
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.schemas.user import (
    UserCreate,
    User,
    UserLogin,
    TokenPair,
    AuthResult,
    RefreshTokenRequest
)
from app.services.auth_service import auth_service
from app.core.deps import get_current_active_user
from app.schemas.user import TokenPayload
from app.core.rate_limit import rate_limit_dependency
from app.core.cookies import (
    set_session_cookie,
    set_refresh_token_cookie,
    clear_auth_cookies
)


router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=User,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Create a new user account with email and password",
    dependencies=[Depends(rate_limit_dependency)]  # Rate limit: 60 req/min per IP
)
async def register(
    user_data: UserCreate,
    request: Request,
    response: Response
) -> User:
    """
    Register a new user.
    
    - **email**: Valid email address
    - **password**: Minimum 8 characters with uppercase, lowercase, and digit
    - **first_name**: User's first name
    - **last_name**: User's last name
    - **phone**: Optional phone number in E.164 format
    - **kvkk_data_processing_consent**: Required KVKK consent
    - **kvkk_marketing_consent**: Optional marketing consent
    
    Rate limited to 60 requests per minute per IP address.
    """
    from app.core.rate_limit import get_client_ip
    client_ip = get_client_ip(request)
    user = await auth_service.register(user_data, client_ip)
    
    # Link guest orders to user account
    from app.repositories.order_repository import order_repository
    linked_count = await order_repository.link_guest_orders_to_user(
        email=user.email,
        user_id=str(user.id)
    )
    
    # Set session cookie for newly registered user
    set_session_cookie(response, str(user.id))
    
    return user


@router.post(
    "/login",
    response_model=AuthResult,
    summary="Login user",
    description="Authenticate user and receive access + refresh tokens",
    dependencies=[Depends(rate_limit_dependency)]  # Rate limit: 60 req/min per IP
)
async def login(
    login_data: UserLogin,
    response: Response
) -> AuthResult:
    """
    Login with email and password.
    
    Returns user information and JWT token pair.
    - Access token expires in 15 minutes
    - Refresh token expires in 7 days
    
    Sets secure HttpOnly cookies for session and refresh token.
    Rate limited to 60 requests per minute per IP address.
    """
    result = await auth_service.login(login_data.email, login_data.password)
    
    # Set secure cookies
    set_session_cookie(response, str(result.user.id))
    set_refresh_token_cookie(response, result.tokens.refresh_token)
    
    return result


@router.post(
    "/login/form",
    response_model=AuthResult,
    summary="Login user (OAuth2 form)",
    description="OAuth2-compatible login endpoint",
    dependencies=[Depends(rate_limit_dependency)]  # Rate limit: 60 req/min per IP
)
async def login_form(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    response: Response
) -> AuthResult:
    """
    OAuth2-compatible login endpoint.
    
    Uses username field for email.
    Rate limited to 60 requests per minute per IP address.
    """
    result = await auth_service.login(form_data.username, form_data.password)
    return result


@router.post(
    "/refresh",
    response_model=TokenPair,
    summary="Refresh access token",
    description="Get new access token using refresh token (implements token rotation)"
)
async def refresh(refresh_data: RefreshTokenRequest) -> TokenPair:
    """
    Refresh access token.
    
    Implements token rotation:
    - Old refresh token is revoked
    - New access + refresh tokens are issued
    """
    tokens = await auth_service.refresh_tokens(refresh_data.refresh_token)
    return tokens


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Logout user",
    description="Revoke current access and refresh tokens"
)
async def logout(
    current_user: Annotated[TokenPayload, Depends(get_current_active_user)],
    refresh_data: RefreshTokenRequest,
    request: Request
) -> None:
    """
    Logout user by revoking tokens.
    
    Requires both access token (in Authorization header) and refresh token.
    """
    # Get access token from header
    auth_header = request.headers.get("authorization", "")
    access_token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""
    
    await auth_service.logout(access_token, refresh_data.refresh_token)


@router.get(
    "/me",
    response_model=User,
    summary="Get current user",
    description="Get information about the currently authenticated user"
)
async def get_me(
    current_user: Annotated[TokenPayload, Depends(get_current_active_user)]
) -> User:
    """
    Get current user information.
    
    Requires valid access token in Authorization header.
    """
    from app.repositories.user_repository import user_repository
    
    user_doc = await user_repository.get_by_id(current_user.sub)
    if not user_doc:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("User", current_user.sub)
    
    user_dict = user_repository.to_public(user_doc)
    return User(**user_dict)
