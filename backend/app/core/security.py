"""Security utilities for authentication and authorization."""
import time
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


class TokenPayload(BaseModel):
    """JWT token payload."""

    sub: str  # Supabase auth ID
    exp: datetime
    iat: datetime | None = None
    email: str | None = None


class CurrentUser(BaseModel):
    """Current authenticated user context."""

    id: uuid.UUID
    supabase_auth_id: uuid.UUID
    email: str
    display_name: str
    subscription_tier: str


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt: str = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> TokenPayload:
    """Verify and decode a JWT token.

    Args:
        token: The JWT token to verify.

    Returns:
        The decoded token payload.

    Raises:
        HTTPException: If the token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        token_data = TokenPayload(**payload)

        # Check expiration
        if token_data.exp < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return token_data
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CurrentUser:
    """Get the current authenticated user.

    Args:
        credentials: The HTTP Bearer token credentials.
        db: Database session.

    Returns:
        The current user context.

    Raises:
        HTTPException: If not authenticated or user not found.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = verify_token(credentials.credentials)

    # Import here to avoid circular imports
    from app.models.user import User

    # Find user by Supabase auth ID
    result = await db.execute(
        select(User).where(User.supabase_auth_id == uuid.UUID(token_data.sub))
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return CurrentUser(
        id=user.id,
        supabase_auth_id=user.supabase_auth_id,
        email=user.email,
        display_name=user.display_name,
        subscription_tier=user.subscription_tier,
    )


async def get_current_user_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CurrentUser | None:
    """Get the current user if authenticated, otherwise None.

    Use this for endpoints that work with or without authentication.
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    result: bool = pwd_context.verify(plain_password, hashed_password)
    return result


def get_password_hash(password: str) -> str:
    """Hash a password."""
    hashed: str = pwd_context.hash(password)
    return hashed


# Type aliases for dependency injection
AuthenticatedUser = Annotated[CurrentUser, Depends(get_current_user)]
OptionalUser = Annotated[CurrentUser | None, Depends(get_current_user_optional)]


# Auth-specific rate limiting for brute force protection
class AuthRateLimiter:
    """Rate limiter specifically for authentication endpoints.

    Uses stricter limits than general API rate limiting to prevent
    brute force attacks on login/signup endpoints.
    """

    def __init__(
        self,
        max_attempts: int = 5,
        window_seconds: int = 60,
        lockout_seconds: int = 300,
    ):
        """Initialise the auth rate limiter.

        Args:
            max_attempts: Maximum login attempts per window.
            window_seconds: Time window for counting attempts (default 60s).
            lockout_seconds: Lockout duration after exceeding limit (default 5min).
        """
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.lockout_seconds = lockout_seconds
        self._attempts: dict[str, list[float]] = defaultdict(list)
        self._lockouts: dict[str, float] = {}

    def _get_client_key(self, request: Request) -> str:
        """Get a unique key for the client (IP-based)."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _cleanup_old_attempts(self, key: str, now: float) -> None:
        """Remove attempts outside the current window."""
        cutoff = now - self.window_seconds
        self._attempts[key] = [t for t in self._attempts[key] if t > cutoff]

    def check_rate_limit(self, request: Request) -> None:
        """Check if the client is rate limited.

        Args:
            request: The FastAPI request object.

        Raises:
            HTTPException: If the client is rate limited.
        """
        key = self._get_client_key(request)
        now = time.time()

        # Check if locked out
        if key in self._lockouts:
            lockout_end = self._lockouts[key]
            if now < lockout_end:
                remaining = int(lockout_end - now)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many login attempts. Please try again in {remaining} seconds.",
                    headers={"Retry-After": str(remaining)},
                )
            else:
                # Lockout expired
                del self._lockouts[key]
                self._attempts[key] = []

        # Cleanup and check attempts
        self._cleanup_old_attempts(key, now)

        if len(self._attempts[key]) >= self.max_attempts:
            # Trigger lockout
            self._lockouts[key] = now + self.lockout_seconds
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many login attempts. Please try again in {self.lockout_seconds} seconds.",
                headers={"Retry-After": str(self.lockout_seconds)},
            )

    def record_attempt(self, request: Request) -> None:
        """Record an authentication attempt.

        Args:
            request: The FastAPI request object.
        """
        key = self._get_client_key(request)
        self._attempts[key].append(time.time())

    def clear_attempts(self, request: Request) -> None:
        """Clear attempts for a client after successful login.

        Args:
            request: The FastAPI request object.
        """
        key = self._get_client_key(request)
        self._attempts.pop(key, None)
        self._lockouts.pop(key, None)


# Global auth rate limiter instance
auth_rate_limiter = AuthRateLimiter(
    max_attempts=5,      # 5 attempts
    window_seconds=60,   # per minute
    lockout_seconds=300, # 5 minute lockout
)


async def require_auth_rate_limit(request: Request) -> None:
    """Dependency to check auth rate limiting.

    Use this on login/signup endpoints to prevent brute force attacks.

    Example:
        @router.post("/login")
        async def login(
            request: Request,
            _: None = Depends(require_auth_rate_limit),
            ...
        ):
            auth_rate_limiter.record_attempt(request)
            # On success: auth_rate_limiter.clear_attempts(request)
    """
    auth_rate_limiter.check_rate_limit(request)
