"""
ETag utilities for optimistic locking and conditional requests.
Implements RFC 9110 HTTP Conditional Requests.
"""
from typing import Optional
from fastapi import Request, HTTPException

from app.core.exceptions import PreconditionFailedError, ConflictError


def generate_etag(version: int) -> str:
    """
    Generate strong ETag from version field.
    Format: "v{version}" (strong ETag, no W/ prefix)
    
    Args:
        version: Resource version number
        
    Returns:
        Strong ETag string (e.g., "v1", "v42")
    """
    return f'"v{version}"'


def parse_etag(etag: str) -> int:
    """
    Parse version number from ETag.
    
    Args:
        etag: ETag string (e.g., "v1", "v42")
        
    Returns:
        Version number as integer
        
    Raises:
        ValueError: If ETag format is invalid
    """
    try:
        # Remove quotes and 'v' prefix
        return int(etag.strip('"').lstrip('v'))
    except (ValueError, AttributeError):
        raise ValueError(f"Invalid ETag format: {etag}")


def validate_if_match(request: Request, current_version: int) -> None:
    """
    Validate If-Match header against current resource version.
    
    Args:
        request: FastAPI request object
        current_version: Current version of the resource
        
    Raises:
        ConflictError: If If-Match doesn't match current version (HTTP 409)
    """
    if_match = getattr(request.state, "if_match", None)
    
    if not if_match:
        # This should be caught by IfMatchMiddleware, but double-check
        return
    
    try:
        requested_version = parse_etag(if_match)
    except ValueError:
        raise ConflictError(
            message="Invalid If-Match header format",
            details={"if_match": if_match}
        )
    
    if requested_version != current_version:
        raise ConflictError(
            message="Resource has been modified by another request",
            details={
                "current_version": current_version,
                "requested_version": requested_version,
                "current_etag": generate_etag(current_version),
                "provided_etag": if_match
            }
        )


def set_etag_header(request: Request, version: int) -> None:
    """
    Set resource version in request state for ETag middleware.
    
    Args:
        request: FastAPI request object
        version: Resource version number
    """
    request.state.resource_version = version
