"""StudyHub API main application."""
import logging
import uuid
from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.responses import Response

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import engine
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    generic_exception_handler,
    http_exception_handler,
)
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.security import CSRFMiddleware, SecurityHeadersMiddleware

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler."""
    # Startup
    logger.info("Starting StudyHub API...")
    yield
    # Shutdown
    logger.info("Shutting down StudyHub API...")
    # Dispose database engine
    await engine.dispose()
    logger.info("Database connections closed.")


app = FastAPI(
    title="StudyHub API",
    description="AI-powered study assistant with curriculum integration",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# Exception handlers (order matters - most specific first)
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Middleware (order matters - first added is outermost)
# 1. Security headers (outermost)
app.add_middleware(SecurityHeadersMiddleware)

# 2. CSRF protection (after security headers)
app.add_middleware(CSRFMiddleware)

# 3. Rate limiting
app.add_middleware(RateLimitMiddleware)

# 4. GZip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 5. CORS (must be after other middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-Request-ID"],
)


# Request ID middleware for tracing
@app.middleware("http")
async def add_request_id(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """Add a unique request ID to each request for tracing."""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id

    return response


# API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {
        "message": "Welcome to StudyHub API",
        "docs": "/docs" if settings.debug else "Disabled in production",
        "health": "/health",
    }
