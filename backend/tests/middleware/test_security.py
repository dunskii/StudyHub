"""Tests for security middleware."""
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from starlette.responses import JSONResponse

from app.middleware.security import (
    CSRFMiddleware,
    SecurityHeadersMiddleware,
    generate_csrf_token,
    validate_csrf_token,
    clear_csrf_token,
)


@pytest.fixture
def app_with_security_headers() -> FastAPI:
    """Create a test app with security headers middleware."""
    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)

    @app.get("/test")
    async def test_endpoint():
        return {"message": "ok"}

    return app


@pytest.fixture
def app_with_csrf() -> FastAPI:
    """Create a test app with CSRF middleware."""
    app = FastAPI()
    app.add_middleware(CSRFMiddleware)

    @app.get("/public")
    async def public_endpoint():
        return {"message": "public"}

    @app.post("/protected")
    async def protected_endpoint():
        return {"message": "protected"}

    @app.post("/api/v1/auth/login")
    async def login_endpoint():
        return {"message": "login"}

    return app


class TestSecurityHeadersMiddleware:
    """Tests for SecurityHeadersMiddleware."""

    @pytest.mark.asyncio
    async def test_adds_security_headers(self, app_with_security_headers: FastAPI):
        """Test that security headers are added to responses."""
        async with AsyncClient(
            transport=ASGITransport(app=app_with_security_headers),
            base_url="http://test",
        ) as client:
            response = await client.get("/test")

            assert response.status_code == 200
            assert response.headers["X-Content-Type-Options"] == "nosniff"
            assert response.headers["X-Frame-Options"] == "DENY"
            assert response.headers["X-XSS-Protection"] == "1; mode=block"
            assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"

    @pytest.mark.asyncio
    async def test_adds_permissions_policy(self, app_with_security_headers: FastAPI):
        """Test that Permissions-Policy header is added."""
        async with AsyncClient(
            transport=ASGITransport(app=app_with_security_headers),
            base_url="http://test",
        ) as client:
            response = await client.get("/test")

            assert "Permissions-Policy" in response.headers
            policy = response.headers["Permissions-Policy"]
            assert "geolocation=()" in policy
            assert "camera=()" in policy
            assert "microphone=()" in policy


class TestCSRFMiddleware:
    """Tests for CSRFMiddleware."""

    @pytest.mark.asyncio
    async def test_allows_get_requests(self, app_with_csrf: FastAPI):
        """Test that GET requests are allowed without CSRF token."""
        async with AsyncClient(
            transport=ASGITransport(app=app_with_csrf),
            base_url="http://test",
        ) as client:
            response = await client.get("/public")

            assert response.status_code == 200
            assert response.json()["message"] == "public"

    @pytest.mark.asyncio
    async def test_allows_exempt_paths(self, app_with_csrf: FastAPI):
        """Test that exempt paths are allowed without CSRF token."""
        async with AsyncClient(
            transport=ASGITransport(app=app_with_csrf),
            base_url="http://test",
        ) as client:
            response = await client.post("/api/v1/auth/login")

            assert response.status_code == 200
            assert response.json()["message"] == "login"

    @pytest.mark.asyncio
    async def test_allows_bearer_auth_without_csrf(self, app_with_csrf: FastAPI):
        """Test that Bearer auth requests are allowed without CSRF token."""
        async with AsyncClient(
            transport=ASGITransport(app=app_with_csrf),
            base_url="http://test",
        ) as client:
            response = await client.post(
                "/protected",
                headers={"Authorization": "Bearer test-token"},
            )

            assert response.status_code == 200
            assert response.json()["message"] == "protected"

    @pytest.mark.asyncio
    async def test_validates_csrf_token(self, app_with_csrf: FastAPI):
        """Test CSRF token validation when provided."""
        session_id = "test-session-123"
        token = await generate_csrf_token(session_id)

        async with AsyncClient(
            transport=ASGITransport(app=app_with_csrf),
            base_url="http://test",
        ) as client:
            # Valid CSRF token should work
            response = await client.post(
                "/protected",
                headers={"X-CSRF-Token": token},
                cookies={"session_id": session_id},
            )

            assert response.status_code == 200

        # Clean up
        await clear_csrf_token(session_id)

    @pytest.mark.asyncio
    async def test_rejects_invalid_csrf_token(self, app_with_csrf: FastAPI):
        """Test that invalid CSRF tokens are rejected."""
        session_id = "test-session-456"
        await generate_csrf_token(session_id)  # Generate valid token

        async with AsyncClient(
            transport=ASGITransport(app=app_with_csrf),
            base_url="http://test",
        ) as client:
            # Invalid token should fail
            response = await client.post(
                "/protected",
                headers={"X-CSRF-Token": "invalid-token"},
                cookies={"session_id": session_id},
            )

            assert response.status_code == 403
            assert response.json()["error_code"] == "CSRF_INVALID"

        # Clean up
        await clear_csrf_token(session_id)


class TestCSRFTokenFunctions:
    """Tests for CSRF token utility functions."""

    @pytest.mark.asyncio
    async def test_generate_csrf_token(self):
        """Test CSRF token generation."""
        session_id = "session-1"
        token = await generate_csrf_token(session_id)

        assert token is not None
        assert len(token) > 20  # Token should be reasonably long

        # Clean up
        await clear_csrf_token(session_id)

    @pytest.mark.asyncio
    async def test_validate_csrf_token_valid(self):
        """Test validation of valid CSRF token."""
        session_id = "session-2"
        token = await generate_csrf_token(session_id)

        assert await validate_csrf_token(session_id, token) is True

        # Clean up
        await clear_csrf_token(session_id)

    @pytest.mark.asyncio
    async def test_validate_csrf_token_invalid(self):
        """Test validation of invalid CSRF token."""
        session_id = "session-3"
        await generate_csrf_token(session_id)

        assert await validate_csrf_token(session_id, "wrong-token") is False

        # Clean up
        await clear_csrf_token(session_id)

    @pytest.mark.asyncio
    async def test_validate_csrf_token_missing_session(self):
        """Test validation with missing session."""
        assert await validate_csrf_token("nonexistent-session", "some-token") is False

    @pytest.mark.asyncio
    async def test_clear_csrf_token(self):
        """Test CSRF token clearing."""
        session_id = "session-4"
        token = await generate_csrf_token(session_id)

        assert await validate_csrf_token(session_id, token) is True

        await clear_csrf_token(session_id)

        assert await validate_csrf_token(session_id, token) is False

    @pytest.mark.asyncio
    async def test_clear_nonexistent_token(self):
        """Test clearing a nonexistent token doesn't raise."""
        # Should not raise
        await clear_csrf_token("nonexistent-session")
