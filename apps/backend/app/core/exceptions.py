"""Application-specific exceptions."""
from typing import Any, Optional


class AppException(Exception):
    """Base application exception with RFC 9457 problem+json support."""
    
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Optional[dict[str, Any]] = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class ValidationError(AppException):
    """Validation error exception."""
    
    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=400,
            details=details
        )


class NotFoundError(AppException):
    """Resource not found exception."""
    
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            code=f"{resource.upper()}_NOT_FOUND",
            message=f"{resource} with identifier '{identifier}' not found",
            status_code=404
        )


class UnauthorizedError(AppException):
    """Unauthorized access exception."""
    
    def __init__(self, message: str = "Unauthorized access"):
        super().__init__(
            code="UNAUTHORIZED_ACCESS",
            message=message,
            status_code=401
        )


class ForbiddenError(AppException):
    """Forbidden access exception."""
    
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            code="FORBIDDEN",
            message=message,
            status_code=403
        )


class ConflictError(AppException):
    """Conflict exception (e.g., duplicate resource)."""
    
    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(
            code="CONFLICT",
            message=message,
            status_code=409,
            details=details
        )


class InsufficientStockError(AppException):
    """Insufficient stock exception."""
    
    def __init__(self, product_id: str, variant_id: str, available: int, requested: int):
        super().__init__(
            code="INSUFFICIENT_STOCK",
            message=f"Insufficient stock for product variant",
            status_code=409,
            details={
                "product_id": product_id,
                "variant_id": variant_id,
                "available": available,
                "requested": requested
            }
        )


class PaymentError(AppException):
    """Payment processing exception."""
    
    def __init__(self, code: str, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(
            code=code,
            message=message,
            status_code=402,
            details=details
        )


class PreconditionRequiredError(AppException):
    """HTTP 428 Precondition Required - missing If-Match or Idempotency-Key."""
    
    def __init__(self, header_name: str, message: Optional[str] = None):
        super().__init__(
            code="PRECONDITION_REQUIRED",
            message=message or f"Required header '{header_name}' is missing",
            status_code=428,
            details={"required_header": header_name}
        )


class PreconditionFailedError(AppException):
    """HTTP 412 Precondition Failed - If-Match validation failed."""
    
    def __init__(self, message: str = "Precondition failed", details: Optional[dict[str, Any]] = None):
        super().__init__(
            code="PRECONDITION_FAILED",
            message=message,
            status_code=412,
            details=details
        )
