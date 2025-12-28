"""Custom exceptions and error handling."""
from enum import Enum
from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorCode(str, Enum):
    """Standard error codes for API responses."""

    # Authentication errors
    NOT_AUTHENTICATED = "NOT_AUTHENTICATED"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    INVALID_TOKEN = "INVALID_TOKEN"

    # Authorization errors
    FORBIDDEN = "FORBIDDEN"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"

    # Resource errors
    NOT_FOUND = "NOT_FOUND"
    ALREADY_EXISTS = "ALREADY_EXISTS"

    # Validation errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_INPUT = "INVALID_INPUT"

    # Rate limiting
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"

    # Server errors
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"


class ErrorResponse(BaseModel):
    """Standard error response format."""

    error_code: str
    message: str
    details: dict[str, Any] | None = None


class AppException(HTTPException):
    """Application exception with error code."""

    def __init__(
        self,
        status_code: int,
        error_code: ErrorCode,
        message: str,
        details: dict[str, Any] | None = None,
    ):
        self.error_code = error_code
        self.message = message
        self.details = details
        super().__init__(status_code=status_code, detail=message)


class NotFoundError(AppException):
    """Resource not found error."""

    def __init__(
        self,
        resource: str,
        identifier: str | None = None,
        hint: str | None = None,
    ):
        # Sanitize - don't include user-provided identifier in message
        message = f"{resource} not found or not accessible"
        details: dict[str, Any] = {"resource_type": resource}
        if hint:
            details["hint"] = hint
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code=ErrorCode.NOT_FOUND,
            message=message,
            details=details if identifier is None else None,
        )


class AlreadyExistsError(AppException):
    """Resource already exists error."""

    def __init__(self, resource: str, field: str | None = None):
        # Sanitize - don't include user-provided data
        if field:
            message = f"{resource} with this {field} already exists"
        else:
            message = f"{resource} already exists"
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code=ErrorCode.ALREADY_EXISTS,
            message=message,
            details={"resource": resource, "field": field} if field else {"resource": resource},
        )


class ForbiddenError(AppException):
    """Access forbidden error."""

    def __init__(self, message: str = "Access denied"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code=ErrorCode.FORBIDDEN,
            message=message,
        )


class ValidationError(AppException):
    """Validation error."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code=ErrorCode.VALIDATION_ERROR,
            message=message,
            details=details,
        )


async def app_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle AppException and return sanitized response."""
    # Type narrowing for mypy - FastAPI routes specific exceptions here
    app_exc = exc if isinstance(exc, AppException) else AppException(
        status_code=500,
        error_code=ErrorCode.INTERNAL_ERROR,
        message="Internal error",
    )
    return JSONResponse(
        status_code=app_exc.status_code,
        content=ErrorResponse(
            error_code=app_exc.error_code.value,
            message=app_exc.message,
            details=app_exc.details,
        ).model_dump(),
    )


async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle HTTPException and return sanitized response.

    This prevents leaking user input in error messages.
    """
    # Type narrowing for mypy - FastAPI routes specific exceptions here
    http_exc = exc if isinstance(exc, HTTPException) else HTTPException(
        status_code=500, detail="Internal error"
    )

    # If the detail is a dict with error_code and message, preserve it
    # This supports custom validation errors from services
    if isinstance(http_exc.detail, dict) and "error_code" in http_exc.detail:
        return JSONResponse(
            status_code=http_exc.status_code,
            content=ErrorResponse(
                error_code=http_exc.detail["error_code"],
                message=http_exc.detail.get("message", "Validation error"),
                details=http_exc.detail.get("details"),
            ).model_dump(),
        )

    # Map status codes to generic error messages
    status_messages = {
        400: ("Bad request", ErrorCode.INVALID_INPUT),
        401: ("Authentication required", ErrorCode.NOT_AUTHENTICATED),
        403: ("Access denied", ErrorCode.FORBIDDEN),
        404: ("Resource not found", ErrorCode.NOT_FOUND),
        409: ("Resource conflict", ErrorCode.ALREADY_EXISTS),
        422: ("Validation error", ErrorCode.VALIDATION_ERROR),
        429: ("Rate limit exceeded", ErrorCode.RATE_LIMIT_EXCEEDED),
        500: ("Internal server error", ErrorCode.INTERNAL_ERROR),
        503: ("Service unavailable", ErrorCode.SERVICE_UNAVAILABLE),
    }

    message, error_code = status_messages.get(
        http_exc.status_code,
        ("An error occurred", ErrorCode.INTERNAL_ERROR),
    )

    # In development, include more detail (but still sanitized)
    from app.core.config import get_settings

    settings = get_settings()
    details = None
    if settings.debug and isinstance(http_exc.detail, str):
        # Only include detail if it doesn't contain user input patterns
        # This is a basic check - in production, be more restrictive
        if not any(char in str(http_exc.detail) for char in ["'", '"', "<", ">"]):
            details = {"debug": http_exc.detail}

    return JSONResponse(
        status_code=http_exc.status_code,
        content=ErrorResponse(
            error_code=error_code.value,
            message=message,
            details=details,
        ).model_dump(),
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions without leaking sensitive info."""
    import logging

    logger = logging.getLogger(__name__)
    logger.exception("Unexpected error occurred")

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error_code=ErrorCode.INTERNAL_ERROR.value,
            message="An unexpected error occurred",
        ).model_dump(),
    )
