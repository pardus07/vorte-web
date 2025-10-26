"""Profile management router for user profile operations."""
from typing import Optional, Annotated

from fastapi import APIRouter, Depends, Header, Response, status, Request

from app.core.deps import get_current_user
from app.schemas.user import TokenPayload
from app.core.rate_limit import (
    check_rate_limit,
    password_change_limiter,
    avatar_upload_limiter,
    email_change_limiter
)
from app.schemas.profile import (
    ProfileUpdate,
    ProfileResponse,
    EmailChangeRequest,
    EmailChangeConfirm,
    PasswordChange,
    AvatarUploadUrlRequest,
    AvatarUploadUrlResponse,
    AvatarConfirmRequest,
    AccountDeletionResponse,
)
from app.services.profile_service import profile_service
from app.services.email_verification_service import email_verification_service
from app.services.password_service import password_service
from app.services.avatar_service import avatar_service
from app.services.account_erasure_service import account_erasure_service


router = APIRouter(prefix="/api/v1/users/me", tags=["profile"])


def _set_etag_header(response: Response, etag: str) -> None:
    """Set ETag header and cache control."""
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "no-store"


# 8.1 - GET /api/v1/users/me
@router.get(
    "",
    response_model=ProfileResponse,
    summary="Get my profile",
    description="Get authenticated user's profile with ETag for version control"
)
async def get_my_profile(
    response: Response,
    current_user: Annotated[TokenPayload, Depends(get_current_user)]
):
    """Get user profile with ETag."""
    profile, etag = await profile_service.get_profile(current_user.sub)
    _set_etag_header(response, etag)
    return profile


# 8.2 - PATCH /api/v1/users/me
@router.patch(
    "",
    response_model=ProfileResponse,
    summary="Update my profile",
    description="Update profile with optimistic locking (If-Match required)"
)
async def update_my_profile(
    updates: ProfileUpdate,
    response: Response,
    current_user: Annotated[TokenPayload, Depends(get_current_user)],
    if_match: Annotated[Optional[str], Header()] = None
):
    """Update user profile with If-Match header."""
    profile, etag = await profile_service.update_profile(
        user_id=current_user.sub,
        updates=updates,
        if_match=if_match
    )
    _set_etag_header(response, etag)
    return profile


# 8.3 - POST /api/v1/users/me/email-change
@router.post(
    "/email-change",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Request email change",
    description="Request email change with verification (If-Match required, rate limited: 3/hour)"
)
async def request_email_change_endpoint(
    req: Request,
    request: EmailChangeRequest,
    response: Response,
    current_user: Annotated[TokenPayload, Depends(get_current_user)],
    if_match: Annotated[Optional[str], Header()] = None
):
    """Request email change with verification token (rate limited: 3 per hour per user)."""
    # Rate limit by user ID
    await check_rate_limit(req, email_change_limiter)
    
    result, etag = await email_verification_service.request_email_change(
        user_id=current_user.sub,
        new_email=request.new_email,
        if_match=if_match
    )
    _set_etag_header(response, etag)
    return result


# 8.4 - POST /api/v1/users/me/email-change/confirm
@router.post(
    "/email-change/confirm",
    response_model=ProfileResponse,
    summary="Confirm email change",
    description="Confirm email change with verification token"
)
async def confirm_email_change_endpoint(
    request: EmailChangeConfirm,
    response: Response,
    current_user: Annotated[TokenPayload, Depends(get_current_user)]
):
    """Confirm email change with token."""
    profile, etag = await email_verification_service.confirm_email_change(
        user_id=current_user.sub,
        token=request.token
    )
    _set_etag_header(response, etag)
    return profile


# 8.5 - POST /api/v1/users/me/password
@router.post(
    "/password",
    summary="Change password",
    description="Change password with current password verification (If-Match required, rate limited: 3/10min)"
)
async def change_password_endpoint(
    req: Request,
    request: PasswordChange,
    response: Response,
    current_user: Annotated[TokenPayload, Depends(get_current_user)],
    if_match: Annotated[Optional[str], Header()] = None
):
    """Change user password (rate limited: 3 per 10 minutes per user)."""
    # Rate limit by user ID
    await check_rate_limit(req, password_change_limiter)
    
    result, etag = await password_service.change_password(
        user_id=current_user.sub,
        current_password=request.current_password,
        new_password=request.new_password,
        if_match=if_match
    )
    _set_etag_header(response, etag)
    return result


# 8.6 - POST /api/v1/users/me/avatar/upload-url
@router.post(
    "/avatar/upload-url",
    response_model=AvatarUploadUrlResponse,
    summary="Get avatar upload URL",
    description="Get presigned URL for direct avatar upload to MinIO (rate limited: 5/10min)"
)
async def get_avatar_upload_url_endpoint(
    req: Request,
    request: AvatarUploadUrlRequest,
    current_user: Annotated[TokenPayload, Depends(get_current_user)]
):
    """Get presigned URL for avatar upload (rate limited: 5 per 10 minutes per user)."""
    # Rate limit by user ID
    await check_rate_limit(req, avatar_upload_limiter)
    
    return await avatar_service.get_upload_url(
        user_id=current_user.sub,
        content_type=request.content_type
    )


# 8.7 - POST /api/v1/users/me/avatar/confirm
@router.post(
    "/avatar/confirm",
    summary="Confirm avatar upload",
    description="Confirm avatar upload and update profile (If-Match required)"
)
async def confirm_avatar_upload_endpoint(
    request: AvatarConfirmRequest,
    response: Response,
    current_user: Annotated[TokenPayload, Depends(get_current_user)],
    if_match: Annotated[Optional[str], Header()] = None
):
    """Confirm avatar upload."""
    result, etag = await avatar_service.confirm_upload(
        user_id=current_user.sub,
        object_key=request.object_key,
        if_match=if_match
    )
    _set_etag_header(response, etag)
    return result


# 8.8 - DELETE /api/v1/users/me/avatar
@router.delete(
    "/avatar",
    summary="Delete avatar",
    description="Delete user avatar (If-Match required)"
)
async def delete_avatar_endpoint(
    response: Response,
    current_user: Annotated[TokenPayload, Depends(get_current_user)],
    if_match: Annotated[Optional[str], Header()] = None
):
    """Delete user avatar."""
    result, etag = await avatar_service.delete_avatar(
        user_id=current_user.sub,
        if_match=if_match
    )
    _set_etag_header(response, etag)
    return result


# 8.9 - DELETE /api/v1/users/me
@router.delete(
    "",
    response_model=AccountDeletionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Delete account",
    description="Request account deletion with KVKV compliance (If-Match required)"
)
async def delete_account_endpoint(
    response: Response,
    current_user: Annotated[TokenPayload, Depends(get_current_user)],
    if_match: Annotated[Optional[str], Header()] = None,
    x_current_password: Annotated[Optional[str], Header(alias="X-Current-Password")] = None
):
    """Request account deletion (KVKV compliant)."""
    result, etag = await account_erasure_service.delete_account(
        user_id=current_user.sub,
        if_match=if_match,
        current_password=x_current_password,
        require_password=True
    )
    _set_etag_header(response, etag)
    return result
