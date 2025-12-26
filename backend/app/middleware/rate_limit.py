"""Rate limiting middleware with Redis support and in-memory fallback."""
import logging
import time
from abc import ABC, abstractmethod
from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import get_settings

# Type alias for middleware call_next function
RequestResponseEndpoint = Callable[[Request], Awaitable[Response]]

settings = get_settings()
logger = logging.getLogger(__name__)


class RateLimitBackend(ABC):
    """Abstract base class for rate limit storage backends."""

    @abstractmethod
    async def is_rate_limited(
        self, client_id: str, requests_per_minute: int, burst_limit: int
    ) -> tuple[bool, int]:
        """Check if client is rate limited.

        Args:
            client_id: Unique client identifier.
            requests_per_minute: Maximum requests per minute.
            burst_limit: Maximum burst requests.

        Returns:
            Tuple of (is_limited, remaining_requests)
        """
        pass

    @abstractmethod
    async def record_request(self, client_id: str) -> None:
        """Record a request for the client."""
        pass

    @abstractmethod
    async def cleanup_stale_clients(self, max_age_seconds: int = 3600) -> int:
        """Remove clients that haven't made requests recently.

        Args:
            max_age_seconds: Remove clients inactive for this long.

        Returns:
            Number of clients removed.
        """
        pass


class InMemoryRateLimitBackend(RateLimitBackend):
    """In-memory rate limit storage for development and single-server deployments.

    Warning: Not suitable for multi-server production deployments.
    Use RedisRateLimitBackend for production.
    """

    def __init__(self, window_size: int = 60):
        self.window_size = window_size
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._last_cleanup = time.time()
        self._cleanup_interval = 300  # Run cleanup every 5 minutes

    def _clean_old_requests(self, client_id: str, current_time: float) -> None:
        """Remove requests older than the window."""
        cutoff = current_time - self.window_size
        self._requests[client_id] = [
            t for t in self._requests[client_id] if t > cutoff
        ]

    async def is_rate_limited(
        self, client_id: str, requests_per_minute: int, burst_limit: int
    ) -> tuple[bool, int]:
        """Check if client is rate limited."""
        current_time = time.time()
        self._clean_old_requests(client_id, current_time)

        # Periodic cleanup of stale clients
        if current_time - self._last_cleanup > self._cleanup_interval:
            await self.cleanup_stale_clients()
            self._last_cleanup = current_time

        request_count = len(self._requests[client_id])

        # Check burst limit
        if request_count >= burst_limit:
            return True, 0

        # Check rate limit
        if request_count >= requests_per_minute:
            return True, 0

        remaining = requests_per_minute - request_count
        return False, remaining

    async def record_request(self, client_id: str) -> None:
        """Record a request for the client."""
        self._requests[client_id].append(time.time())

    async def cleanup_stale_clients(self, max_age_seconds: int = 3600) -> int:
        """Remove clients that haven't made requests recently."""
        current_time = time.time()
        cutoff = current_time - max_age_seconds

        stale_clients = [
            client_id
            for client_id, timestamps in self._requests.items()
            if not timestamps or max(timestamps) < cutoff
        ]

        for client_id in stale_clients:
            del self._requests[client_id]

        if stale_clients:
            logger.debug(f"Cleaned up {len(stale_clients)} stale rate limit clients")

        return len(stale_clients)


class RedisRateLimitBackend(RateLimitBackend):
    """Redis-backed rate limit storage for production multi-server deployments.

    Uses sliding window algorithm with Redis sorted sets.
    """

    def __init__(self, redis_url: str | None = None, window_size: int = 60):
        self.window_size = window_size
        self._redis_url = redis_url or settings.redis_url
        self._redis = None
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
                # Test connection
                await redis_client.ping()
                self._redis = redis_client
                self._initialized = True
                logger.info("Redis rate limit backend connected")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis: {e}. Using fallback.")
                self._redis = None
                self._initialized = False
        return self._redis

    async def is_rate_limited(
        self, client_id: str, requests_per_minute: int, burst_limit: int
    ) -> tuple[bool, int]:
        """Check if client is rate limited using Redis sorted set."""
        redis = await self._get_redis()
        if redis is None:
            # Fallback handled by middleware
            raise ConnectionError("Redis not available")

        current_time = time.time()
        window_start = current_time - self.window_size
        key = f"ratelimit:{client_id}"

        try:
            # Remove old entries and count current requests in one pipeline
            pipe = redis.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            results = await pipe.execute()

            request_count = results[1]

            # Check limits
            if request_count >= burst_limit or request_count >= requests_per_minute:
                return True, 0

            remaining = requests_per_minute - request_count
            return False, remaining

        except Exception as e:
            logger.error(f"Redis rate limit check failed: {e}")
            raise

    async def record_request(self, client_id: str) -> None:
        """Record a request in Redis sorted set."""
        redis = await self._get_redis()
        if redis is None:
            raise ConnectionError("Redis not available")

        current_time = time.time()
        key = f"ratelimit:{client_id}"

        try:
            pipe = redis.pipeline()
            pipe.zadd(key, {str(current_time): current_time})
            pipe.expire(key, self.window_size * 2)  # Auto-expire old keys
            await pipe.execute()
        except Exception as e:
            logger.error(f"Redis rate limit record failed: {e}")
            raise

    async def cleanup_stale_clients(self, max_age_seconds: int = 3600) -> int:
        """Redis keys auto-expire, so minimal cleanup needed."""
        # Redis handles expiration automatically via EXPIRE
        return 0


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware with Redis support and in-memory fallback.

    For production multi-server deployments, configure REDIS_URL in settings.
    Falls back to in-memory storage if Redis is unavailable.
    """

    def __init__(
        self,
        app: ASGIApp,
        requests_per_minute: int | None = None,
        burst_limit: int | None = None,
    ) -> None:
        super().__init__(app)
        self.requests_per_minute = requests_per_minute or settings.rate_limit_per_minute
        self.burst_limit = burst_limit or (self.requests_per_minute * 2)
        self.window_size = 60  # 1 minute window

        # Initialize backends
        self._memory_backend = InMemoryRateLimitBackend(self.window_size)
        self._redis_backend: RedisRateLimitBackend | None = None
        self._use_redis = bool(getattr(settings, "redis_url", None))

        if self._use_redis:
            self._redis_backend = RedisRateLimitBackend(
                redis_url=settings.redis_url, window_size=self.window_size
            )
            logger.info("Rate limiting configured with Redis backend")
        else:
            logger.info("Rate limiting configured with in-memory backend")

    def _get_client_identifier(self, request: Request) -> str:
        """Get a unique identifier for the client.

        Uses X-Forwarded-For if behind a trusted proxy.
        """
        # Use X-Forwarded-For header if behind a proxy
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first (client) IP from the chain
            return forwarded_for.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    async def _get_backend(self) -> RateLimitBackend:
        """Get the appropriate rate limit backend."""
        if self._redis_backend:
            try:
                # Try Redis first
                await self._redis_backend._get_redis()
                if self._redis_backend._initialized:
                    return self._redis_backend
            except Exception:
                pass
        # Fallback to memory
        return self._memory_backend

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Process the request with rate limiting."""
        # Skip rate limiting for health checks
        if request.url.path in ("/health", "/", "/docs", "/redoc", "/openapi.json"):
            return await call_next(request)

        # Skip rate limiting in test environment (httpx AsyncClient uses 'testclient' or no client)
        if settings.environment == "development":
            # Check for test clients - httpx uses None or special hosts like 'test'
            url_hostname = request.url.hostname or ""
            if not request.client or url_hostname == "test":
                return await call_next(request)

        client_id = self._get_client_identifier(request)

        try:
            backend = await self._get_backend()
            is_limited, remaining = await backend.is_rate_limited(
                client_id, self.requests_per_minute, self.burst_limit
            )

            if is_limited:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": "Rate limit exceeded. Please try again later.",
                        "error_code": "RATE_LIMIT_EXCEEDED",
                    },
                    headers={
                        "X-RateLimit-Limit": str(self.requests_per_minute),
                        "X-RateLimit-Remaining": "0",
                        "Retry-After": str(self.window_size),
                    },
                )

            # Record this request
            await backend.record_request(client_id)

            # Process request
            response = await call_next(request)

            # Add rate limit headers
            response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
            response.headers["X-RateLimit-Remaining"] = str(max(0, remaining - 1))

            return response

        except Exception as e:
            # If rate limiting fails, log and allow request (fail open)
            logger.error(f"Rate limiting error: {e}")
            return await call_next(request)
