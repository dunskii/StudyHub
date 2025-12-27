"""Tests for chat rate limiter.

Tests the ChatRateLimiter class used to prevent AI abuse.
"""
import pytest
from unittest.mock import patch
import time
from uuid import uuid4

from fastapi import HTTPException

from app.api.v1.endpoints.socratic import chat_rate_limiter, ChatRateLimiter


class TestChatRateLimiter:
    """Tests for ChatRateLimiter class."""

    def setup_method(self):
        """Clear rate limiter state between tests."""
        chat_rate_limiter._messages.clear()

    def test_allows_messages_under_limit(self):
        """Test that messages under the limit are allowed."""
        student_id = uuid4()

        # Should allow up to max_messages - 1 without raising
        for _ in range(chat_rate_limiter.max_messages - 1):
            chat_rate_limiter.check_limit(student_id)
            chat_rate_limiter.record_message(student_id)

        # One more check should still pass (at limit - 1 recorded)
        chat_rate_limiter.check_limit(student_id)

    def test_blocks_messages_at_limit(self):
        """Test that messages at the limit are blocked."""
        student_id = uuid4()

        # Fill up to limit
        for _ in range(chat_rate_limiter.max_messages):
            chat_rate_limiter.record_message(student_id)

        # Next check should fail
        with pytest.raises(HTTPException) as exc_info:
            chat_rate_limiter.check_limit(student_id)

        assert exc_info.value.status_code == 429
        assert "Too many messages" in exc_info.value.detail
        assert "Retry-After" in exc_info.value.headers

    def test_per_student_isolation(self):
        """Test that rate limits are per-student."""
        student_a = uuid4()
        student_b = uuid4()

        # Fill up student A's limit
        for _ in range(chat_rate_limiter.max_messages):
            chat_rate_limiter.record_message(student_a)

        # Student B should still be allowed
        chat_rate_limiter.check_limit(student_b)  # Should not raise

        # Student A should be blocked
        with pytest.raises(HTTPException) as exc_info:
            chat_rate_limiter.check_limit(student_a)

        assert exc_info.value.status_code == 429

    def test_sliding_window_cleanup(self):
        """Test that old messages are cleaned up."""
        student_id = uuid4()
        limiter = ChatRateLimiter(max_messages=5, window_seconds=60)

        # Record messages
        for _ in range(5):
            limiter.record_message(student_id)

        # Should be blocked now
        with pytest.raises(HTTPException):
            limiter.check_limit(student_id)

        # Simulate time passing beyond window
        with patch('time.time', return_value=time.time() + 61):
            # Should be allowed after window expires
            limiter.check_limit(student_id)  # Should not raise

            # Messages should be cleaned up
            key = str(student_id)
            assert len(limiter._messages[key]) == 0

    def test_retry_after_header_calculation(self):
        """Test that Retry-After header is calculated correctly."""
        student_id = uuid4()
        limiter = ChatRateLimiter(max_messages=3, window_seconds=60)

        # Record messages with known timestamps
        base_time = time.time()
        with patch('time.time', return_value=base_time):
            for _ in range(3):
                limiter.record_message(student_id)

        # Check limit 30 seconds later
        with patch('time.time', return_value=base_time + 30):
            with pytest.raises(HTTPException) as exc_info:
                limiter.check_limit(student_id)

            retry_after = int(exc_info.value.headers["Retry-After"])
            # Should be ~30 seconds remaining (60 - 30)
            assert 25 <= retry_after <= 35

    def test_check_does_not_record(self):
        """Test that check_limit does not auto-record messages.

        This ensures failed requests are not counted against the limit.
        """
        student_id = uuid4()

        # Check limit multiple times without recording
        for _ in range(100):
            chat_rate_limiter.check_limit(student_id)

        # Should still be empty since we didn't record
        key = str(student_id)
        assert len(chat_rate_limiter._messages[key]) == 0

    def test_custom_limits(self):
        """Test that custom limits work correctly."""
        limiter = ChatRateLimiter(max_messages=5, window_seconds=30)
        student_id = uuid4()

        # Should allow exactly 5 messages
        for _ in range(5):
            limiter.check_limit(student_id)
            limiter.record_message(student_id)

        # 6th should fail
        with pytest.raises(HTTPException) as exc_info:
            limiter.check_limit(student_id)

        assert exc_info.value.status_code == 429

    def test_multiple_students_independent(self):
        """Test multiple students can all hit their limits independently."""
        students = [uuid4() for _ in range(5)]
        limiter = ChatRateLimiter(max_messages=3, window_seconds=60)

        # Each student uses 2 messages
        for student_id in students:
            limiter.record_message(student_id)
            limiter.record_message(student_id)

        # All students should still be able to send one more
        for student_id in students:
            limiter.check_limit(student_id)  # Should not raise

        # Fill up all limits
        for student_id in students:
            limiter.record_message(student_id)

        # Now all should be blocked
        for student_id in students:
            with pytest.raises(HTTPException):
                limiter.check_limit(student_id)

    def test_partial_window_expiry(self):
        """Test that only old messages expire, not all."""
        student_id = uuid4()
        limiter = ChatRateLimiter(max_messages=3, window_seconds=60)

        base_time = time.time()

        # Record 2 messages at base time
        with patch('time.time', return_value=base_time):
            limiter.record_message(student_id)
            limiter.record_message(student_id)

        # Record 1 message at base + 40 seconds
        with patch('time.time', return_value=base_time + 40):
            limiter.record_message(student_id)

        # At base + 70 seconds, first 2 should expire but 3rd should remain
        with patch('time.time', return_value=base_time + 70):
            limiter.check_limit(student_id)  # Should pass (only 1 message in window)

            key = str(student_id)
            # After cleanup, only the message from +40s should remain
            assert len(limiter._messages[key]) == 1
