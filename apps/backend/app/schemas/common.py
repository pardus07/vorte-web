"""Common schemas used across the application."""
from typing import Any, Optional
from pydantic import BaseModel, Field


class SuccessResponse(BaseModel):
    """Standard success response following API standards."""
    code: str = Field(default="SUCCESS", description="Response code")
    message: str = Field(description="Human-readable message")
    data: Optional[Any] = Field(default=None, description="Response data")
    traceId: Optional[str] = Field(default=None, description="Request trace ID")


class ErrorResponse(BaseModel):
    """RFC 9457 Problem Details for HTTP APIs."""
    type: str = Field(description="URI reference identifying the problem type")
    title: str = Field(description="Short, human-readable summary")
    status: int = Field(description="HTTP status code")
    detail: str = Field(description="Human-readable explanation")
    instance: str = Field(description="URI reference identifying the specific occurrence")
    traceId: Optional[str] = Field(default=None, description="Request trace ID")
    code: Optional[str] = Field(default=None, description="Application-specific error code")
    errors: Optional[dict[str, Any]] = Field(default=None, description="Validation errors or additional details")


class PaginationParams(BaseModel):
    """Common pagination parameters."""
    page: int = Field(default=1, ge=1, description="Page number")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page")


class PaginationMeta(BaseModel):
    """Pagination metadata in responses."""
    page: int = Field(description="Current page number")
    limit: int = Field(description="Items per page")
    total: int = Field(description="Total number of items")
    pages: int = Field(description="Total number of pages")
