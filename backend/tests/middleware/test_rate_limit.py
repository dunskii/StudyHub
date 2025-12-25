"""Tests for rate limiting middleware."""
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.middleware.rate_limit import (
    InMemoryRateLimitBackend,
    RateLimitMiddleware,
)


@pytest.fixture
def app_with_rate_limit() -> FastAPI:
    """Create a test app with rate limiting middleware."""
    app = FastAPI()
    app.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=5,
        burst_limit=10,
    )

    @app.get("/api/test")
    async def test_endpoint():
        return {"message": "ok"}

    @app.get("/health")
    async def health_endpoint():
        return {"status": "healthy"}

    return app


class TestInMemoryRateLimitBackend:
    """Tests for InMemoryRateLimitBackend."""

    @pytest.mark.asyncio
    async def test_allows_requests_under_limit(self):
        """Test that requests under the limit are allowed."""
        backend = InMemoryRateLimitBackend(window_size=60)

        for i in range(5):
            is_limited, remaining = await backend.is_rate_limited(
                "client-1", requests_per_minute=10, burst_limit=20
            )
            await backend.record_request("client-1")

            assert is_limited is False
            assert remaining == 10 - i

    @pytest.mark.asyncio
    async def test_blocks_requests_over_limit(self):
        """Test that requests over the limit are blocked."""
        backend = InMemoryRateLimitBackend(window_size=60)

        # Make 10 requests to hit the limit
        for _ in range(10):
            await backend.record_request("client-2")

        is_limited, remaining = await backend.is_rate_limited(
            "client-2", requests_per_minute=10, burst_limit=20
        )

        assert is_limited is True
        assert remaining == 0

    @pytest.mark.asyncio
    async def test_blocks_on_burst_limit(self):
        """Test that burst limit is enforced."""
        backend = InMemoryRateLimitBackend(window_size=60)

        # Make 5 requests (burst limit)
        for _ in range(5):
            await backend.record_request("client-3")

        is_limited, remaining = await backend.is_rate_limited(
            "client-3", requests_per_minute=10, burst_limit=5
        )

        assert is_limited is True
        assert remaining == 0

    @pytest.mark.asyncio
    async def test_separate_clients_tracked_independently(self):
        """Test that different clients are tracked independently."""
        backend = InMemoryRateLimitBackend(window_size=60)

        # Client A makes 5 requests
        for _ in range(5):
            await backend.record_request("client-a")

        # Client B should still have full limit
        is_limited, remaining = await backend.is_rate_limited(
            "client-b", requests_per_minute=10, burst_limit=20
        )

        assert is_limited is False
        assert remaining == 10

    @pytest.mark.asyncio
    async def test_cleanup_stale_clients(self):
        """Test stale client cleanup."""
        backend = InMemoryRateLimitBackend(window_size=60)

        # Record a request
        await backend.record_request("old-client")

        # Manually set the timestamp to be old
        backend._requests["old-client"] = [0.0]  # Very old timestamp

        # Cleanup should remove this client
        removed = await backend.cleanup_stale_clients(max_age_seconds=1)

        assert removed == 1
        assert "old-client" not in backend._requests


class TestRateLimitMiddleware:
    """Tests for RateLimitMiddleware."""

    @pytest.mark.asyncio
    async def test_allows_requests_under_limit(self, app_with_rate_limit: FastAPI):
        """Test that requests under the limit are allowed."""
        async with AsyncClient(
            transport=ASGITransport(app=app_with_rate_limit),
            base_url="http://test",
        ) as client:
            for _ in range(5):
                response = await client.get("/api/test")
                assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_returns_429_when_limited(self, app_with_rate_limit: FastAPI):
        """Test that 429 is returned when rate limited."""
        async with AsyncClient(
            transport=ASGITransport(app=app_with_rate_limit),
            base_url="http://test",
        ) as client:
            # Make 5 requests (the limit)
            for _ in range(5):
                await client.get("/api/test")

            # 6th request should be rate limited
            response = await client.get("/api/test")

            assert response.status_code == 429
            assert response.json()["error_code"] == "RATE_LIMIT_EXCEEDED"

    @pytest.mark.asyncio
    async def test_includes_rate_limit_headers(self, app_with_rate_limit: FastAPI):
        """Test that rate limit headers are included in responses."""
        async with AsyncClient(
            transport=ASGITransport(app=app_with_rate_limit),
            base_url="http://test",
        ) as client:
            response = await client.get("/api/test")

            assert response.status_code == 200
            assert "X-RateLimit-Limit" in response.headers
            assert "X-RateLimit-Remaining" in response.headers

    @pytest.mark.asyncio
    async def test_includes_retry_after_when_limited(self, app_with_rate_limit: FastAPI):
        """Test that Retry-After header is included when rate limited."""
        async with AsyncClient(
            transport=ASGITransport(app=app_with_rate_limit),
            base_url="http://test",
        ) as client:
            # Exhaust the limit
            for _ in range(5):
                await client.get("/api/test")

            # This request should be limited
            response = await client.get("/api/test")

            assert response.status_code == 429
            assert "Retry-After" in response.headers
            assert int(response.headers["Retry-After"]) > 0

    @pytest.mark.asyncio
    async def test_skips_health_endpoint(self, app_with_rate_limit: FastAPI):
        """Test that health endpoint is not rate limited."""
        async with AsyncClient(
            transport=ASGITransport(app=app_with_rate_limit),
            base_url="http://test",
        ) as client:
            # Make many requests to health endpoint
            for _ in range(20):
                response = await client.get("/health")
                assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_uses_x_forwarded_for(self, app_with_rate_limit: FastAPI):
        """Test that X-Forwarded-For header is used for client identification."""
        async with AsyncClient(
            transport=ASGITransport(app=app_with_rate_limit),
            base_url="http://test",
        ) as client:
            # Make requests from "different" clients
            for i in range(5):
                response = await client.get(
                    "/api/test",
                    headers={"X-Forwarded-For": f"192.168.1.{i}"},
                )
                assert response.status_code == 200

            # Same client should still work from "new" IP
            response = await client.get(
                "/api/test",
                headers={"X-Forwarded-For": "10.0.0.1"},
            )
            assert response.status_code == 200
