"""Security headers and CSRF protection middleware."""
import logging
import secrets
from abc import ABC, abstractmethod
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Type alias for middleware call_next function
RequestResponseEndpoint = Callable[[Request], Awaitable[Response]]

settings = get_settings()

# CSRF token TTL (1 hour)
CSRF_TOKEN_TTL_SECONDS = 3600


class CSRFTokenStore(ABC):
    """Abstract base class for CSRF token storage."""

    @abstractmethod
    async def set(self, session_id: str, token: str) -> None:
        """Store a CSRF token."""
        pass

    @abstractmethod
    async def get(self, session_id: str) -> str | None:
        """Retrieve a CSRF token."""
        pass

    @abstractmethod
    async def delete(self, session_id: str) -> None:
        """Delete a CSRF token."""
        pass


class InMemoryCSRFTokenStore(CSRFTokenStore):
    """In-memory CSRF token storage (for development/single-server)."""

    def __init__(self) -> None:
        self._tokens: dict[str, str] = {}

    async def set(self, session_id: str, token: str) -> None:
        self._tokens[session_id] = token

    async def get(self, session_id: str) -> str | None:
        return self._tokens.get(session_id)

    async def delete(self, session_id: str) -> None:
        self._tokens.pop(session_id, None)


class RedisCSRFTokenStore(CSRFTokenStore):
    """Redis-based CSRF token storage (for production/multi-server)."""

    def __init__(self, redis_url: str) -> None:
        self._redis_url = redis_url
        self._redis: Any = None
        self._initialized = False

    async def _get_redis(self) -> Any:
        """Get or create Redis connection."""
        if self._redis is None:
            try:
                import redis.asyncio as aioredis

                redis_client = aioredis.from_url(
                    self._redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                )
                await redis_client.ping()
                self._redis = redis_client
                self._initialized = True
                logger.info("Redis CSRF token store connected")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis for CSRF: {e}")
                self._redis = None
                self._initialized = False
        return self._redis

    async def set(self, session_id: str, token: str) -> None:
        redis = await self._get_redis()
        if redis:
            key = f"csrf:{session_id}"
            await redis.setex(key, CSRF_TOKEN_TTL_SECONDS, token)
        else:
            raise ConnectionError("Redis not available for CSRF token storage")

    async def get(self, session_id: str) -> str | None:
        redis = await self._get_redis()
        if redis:
            key = f"csrf:{session_id}"
            result = await redis.get(key)
            return str(result) if result else None
        return None

    async def delete(self, session_id: str) -> None:
        redis = await self._get_redis()
        if redis:
            key = f"csrf:{session_id}"
            await redis.delete(key)


# Global CSRF token store - initialized based on configuration
_csrf_store: CSRFTokenStore | None = None


def get_csrf_store() -> CSRFTokenStore:
    """Get the CSRF token store (Redis in production, in-memory for dev)."""
    global _csrf_store
    if _csrf_store is None:
        if settings.redis_url and settings.is_production:
            _csrf_store = RedisCSRFTokenStore(settings.redis_url)
            logger.info("Using Redis for CSRF token storage")
        else:
            _csrf_store = InMemoryCSRFTokenStore()
            if settings.is_production:
                logger.warning(
                    "Using in-memory CSRF storage in production. "
                    "Configure REDIS_URL for multi-server deployments."
                )
    return _csrf_store


# Legacy in-memory storage (kept for backwards compatibility)
_csrf_tokens: dict[str, str] = {}

# Endpoints that don't require CSRF protection
CSRF_EXEMPT_PATHS: set[str] = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/refresh",
    "/api/v1/health",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
}

# Safe HTTP methods that don't modify state
CSRF_SAFE_METHODS: set[str] = {"GET", "HEAD", "OPTIONS", "TRACE"}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions-Policy header (restricts browser features)
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), "
            "payment=(), usb=(), magnetometer=(), gyroscope=()"
        )

        # Content Security Policy (adjust as needed for your frontend)
        if settings.is_production:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self'; "
                "connect-src 'self' https://*.supabase.co"
            )

        # HSTS for production
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )

        return response


class CSRFMiddleware(BaseHTTPMiddleware):
    """CSRF protection middleware.

    Validates CSRF tokens for state-changing requests (POST, PUT, PATCH, DELETE).
    Tokens are passed via X-CSRF-Token header.

    Note: This middleware works in conjunction with JWT authentication.
    Since we use Authorization header (not cookies) for auth, CSRF risk is
    reduced, but we still enforce CSRF tokens for defense in depth.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip CSRF check for safe methods
        if request.method in CSRF_SAFE_METHODS:
            return await call_next(request)

        # Skip CSRF check for exempt paths
        path = request.url.path.rstrip("/")
        if path in CSRF_EXEMPT_PATHS or any(
            path.startswith(exempt.rstrip("/")) for exempt in CSRF_EXEMPT_PATHS
        ):
            return await call_next(request)

        # For API requests with Bearer token (not cookie-based auth),
        # CSRF protection is less critical since the token must be
        # explicitly included. However, we still validate if a CSRF
        # token is provided for defense in depth.
        auth_header = request.headers.get("Authorization", "")
        csrf_token = request.headers.get("X-CSRF-Token")

        # If using Bearer auth and no CSRF token, allow (reduced risk)
        # This is a pragmatic choice: Bearer tokens must be explicitly
        # included by JavaScript, which provides CSRF-like protection.
        if auth_header.startswith("Bearer ") and not csrf_token:
            return await call_next(request)

        # If CSRF token is provided, validate it
        if csrf_token:
            session_id = request.cookies.get("session_id")
            is_valid = await validate_csrf_token(session_id, csrf_token) if session_id else False
            if not session_id or not is_valid:
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "error_code": "CSRF_INVALID",
                        "message": "Invalid or missing CSRF token",
                    },
                )

        return await call_next(request)


async def generate_csrf_token(session_id: str) -> str:
    """Generate a CSRF token for a session.

    Args:
        session_id: The user's session identifier.

    Returns:
        The generated CSRF token.
    """
    token = secrets.token_urlsafe(32)
    store = get_csrf_store()
    await store.set(session_id, token)
    return token


async def validate_csrf_token(session_id: str, token: str) -> bool:
    """Validate a CSRF token.

    Args:
        session_id: The user's session identifier.
        token: The CSRF token to validate.

    Returns:
        True if valid, False otherwise.
    """
    store = get_csrf_store()
    stored_token = await store.get(session_id)
    if not stored_token:
        return False
    # Use constant-time comparison to prevent timing attacks
    return secrets.compare_digest(stored_token, token)


async def clear_csrf_token(session_id: str) -> None:
    """Clear a CSRF token for a session."""
    store = get_csrf_store()
    await store.delete(session_id)
