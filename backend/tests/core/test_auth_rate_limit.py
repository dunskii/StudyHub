"""Tests for auth-specific rate limiting."""
import time
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.core.security import AuthRateLimiter


class TestAuthRateLimiter:
    """Tests for AuthRateLimiter class."""

    def test_allows_requests_under_limit(self):
        """Test that requests under the limit are allowed."""
        limiter = AuthRateLimiter(max_attempts=5, window_seconds=60, lockout_seconds=300)
        request = MagicMock()
        request.client.host = "192.168.1.1"
        request.headers = {}

        # Should not raise for first 5 attempts
        for _ in range(5):
            limiter.check_rate_limit(request)
            limiter.record_attempt(request)

    def test_blocks_requests_over_limit(self):
        """Test that requests over the limit are blocked."""
        limiter = AuthRateLimiter(max_attempts=3, window_seconds=60, lockout_seconds=300)
        request = MagicMock()
        request.client.host = "192.168.1.2"
        request.headers = {}

        # Make 3 attempts
        for _ in range(3):
            limiter.check_rate_limit(request)
            limiter.record_attempt(request)

        # 4th attempt should be blocked
        with pytest.raises(HTTPException) as exc_info:
            limiter.check_rate_limit(request)

        assert exc_info.value.status_code == 429
        assert "Too many login attempts" in exc_info.value.detail
        assert "Retry-After" in exc_info.value.headers

    def test_lockout_period(self):
        """Test that lockout period works correctly."""
        limiter = AuthRateLimiter(max_attempts=2, window_seconds=60, lockout_seconds=1)
        request = MagicMock()
        request.client.host = "192.168.1.3"
        request.headers = {}

        # Exceed limit
        for _ in range(2):
            limiter.check_rate_limit(request)
            limiter.record_attempt(request)

        # Should be blocked
        with pytest.raises(HTTPException) as exc_info:
            limiter.check_rate_limit(request)
        assert exc_info.value.status_code == 429

        # Wait for lockout to expire
        time.sleep(1.1)

        # Should be allowed again
        limiter.check_rate_limit(request)  # Should not raise

    def test_clear_attempts_on_success(self):
        """Test that clearing attempts allows new requests."""
        limiter = AuthRateLimiter(max_attempts=2, window_seconds=60, lockout_seconds=300)
        request = MagicMock()
        request.client.host = "192.168.1.4"
        request.headers = {}

        # Make 2 attempts
        for _ in range(2):
            limiter.check_rate_limit(request)
            limiter.record_attempt(request)

        # Clear attempts (simulating successful login)
        limiter.clear_attempts(request)

        # Should be allowed again
        limiter.check_rate_limit(request)  # Should not raise

    def test_uses_forwarded_header_for_ip(self):
        """Test that X-Forwarded-For header is used for client identification."""
        limiter = AuthRateLimiter(max_attempts=2, window_seconds=60, lockout_seconds=300)

        request1 = MagicMock()
        request1.headers = {"X-Forwarded-For": "10.0.0.1, 192.168.1.1"}
        request1.client.host = "127.0.0.1"

        request2 = MagicMock()
        request2.headers = {"X-Forwarded-For": "10.0.0.2, 192.168.1.1"}
        request2.client.host = "127.0.0.1"

        # Each IP should have its own limit
        for _ in range(2):
            limiter.check_rate_limit(request1)
            limiter.record_attempt(request1)

        # request1 IP (10.0.0.1) should be blocked
        with pytest.raises(HTTPException):
            limiter.check_rate_limit(request1)

        # request2 IP (10.0.0.2) should still be allowed
        limiter.check_rate_limit(request2)  # Should not raise

    def test_different_ips_independent(self):
        """Test that different IPs are tracked independently."""
        limiter = AuthRateLimiter(max_attempts=2, window_seconds=60, lockout_seconds=300)

        request1 = MagicMock()
        request1.client.host = "192.168.1.100"
        request1.headers = {}

        request2 = MagicMock()
        request2.client.host = "192.168.1.101"
        request2.headers = {}

        # Exceed limit for request1
        for _ in range(2):
            limiter.check_rate_limit(request1)
            limiter.record_attempt(request1)

        with pytest.raises(HTTPException):
            limiter.check_rate_limit(request1)

        # request2 should still work
        limiter.check_rate_limit(request2)  # Should not raise

    def test_window_expiration(self):
        """Test that old attempts outside the window are cleaned up."""
        limiter = AuthRateLimiter(max_attempts=2, window_seconds=1, lockout_seconds=300)
        request = MagicMock()
        request.client.host = "192.168.1.200"
        request.headers = {}

        # Make 1 attempt
        limiter.check_rate_limit(request)
        limiter.record_attempt(request)

        # Wait for window to expire
        time.sleep(1.1)

        # Make another attempt - should work because old one expired
        limiter.check_rate_limit(request)
        limiter.record_attempt(request)

        # Make another - should also work
        limiter.check_rate_limit(request)  # Should not raise

    def test_handles_missing_client(self):
        """Test handling of requests without client info."""
        limiter = AuthRateLimiter(max_attempts=2, window_seconds=60, lockout_seconds=300)
        request = MagicMock()
        request.client = None
        request.headers = {}

        # Should use "unknown" as key and still work
        limiter.check_rate_limit(request)
        limiter.record_attempt(request)

    def test_lockout_message_shows_remaining_time(self):
        """Test that lockout message shows remaining seconds."""
        limiter = AuthRateLimiter(max_attempts=1, window_seconds=60, lockout_seconds=120)
        request = MagicMock()
        request.client.host = "192.168.1.250"
        request.headers = {}

        # Exceed limit
        limiter.check_rate_limit(request)
        limiter.record_attempt(request)

        # Trigger lockout
        with pytest.raises(HTTPException) as exc_info:
            limiter.check_rate_limit(request)

        assert "120 seconds" in exc_info.value.detail
        assert exc_info.value.headers["Retry-After"] == "120"

        # Wait a bit and check remaining time decreased
        time.sleep(0.5)

        with pytest.raises(HTTPException) as exc_info:
            limiter.check_rate_limit(request)

        # Remaining time should be less now (119 or 120 depending on timing)
        remaining = int(exc_info.value.headers["Retry-After"])
        assert remaining < 120
