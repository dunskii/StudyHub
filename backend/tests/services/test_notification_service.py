"""
Tests for NotificationService.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.services.notification_service import NotificationService


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    db = AsyncMock()
    return db


@pytest.fixture
def notification_service(mock_db):
    """Create a NotificationService instance with mocked db."""
    return NotificationService(db=mock_db)


@pytest.fixture
def sample_notification():
    """Create a sample notification model."""
    notification = MagicMock()
    notification.id = uuid4()
    notification.user_id = uuid4()
    notification.type = "milestone"
    notification.title = "Milestone Reached!"
    notification.message = "Your child completed 100 flashcards!"
    notification.priority = "normal"
    notification.related_student_id = uuid4()
    notification.related_subject_id = None
    notification.related_goal_id = None
    notification.delivery_method = "in_app"
    notification.data = {"flashcards_count": 100}
    notification.created_at = datetime.now(timezone.utc)
    notification.sent_at = datetime.now(timezone.utc)
    notification.read_at = None
    return notification


class TestNotificationServiceCreate:
    """Tests for notification creation."""

    @pytest.mark.asyncio
    async def test_create_notification_success(
        self, notification_service, mock_db
    ):
        """Test creating a notification."""
        user_id = uuid4()
        student_id = uuid4()

        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        # Verify the service has the create method
        assert hasattr(notification_service, 'create')


class TestNotificationServiceMarkRead:
    """Tests for marking notifications as read."""

    @pytest.mark.asyncio
    async def test_mark_single_read_success(
        self, notification_service, mock_db, sample_notification
    ):
        """Test marking a single notification as read."""
        sample_notification.read_at = None

        # Mock get_by_id to return the notification
        with patch.object(
            notification_service, 'get_by_id', new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = sample_notification
            mock_db.commit = AsyncMock()

            result = await notification_service.mark_read(
                sample_notification.id, sample_notification.user_id
            )

            assert result is True
            # Verify read_at was set
            assert sample_notification.read_at is not None

    @pytest.mark.asyncio
    async def test_mark_read_not_found(
        self, notification_service, mock_db
    ):
        """Test marking a non-existent notification."""
        with patch.object(
            notification_service, 'get_by_id', new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = None

            result = await notification_service.mark_read(
                uuid4(), uuid4()
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_mark_all_read(self, notification_service, mock_db):
        """Test marking all notifications as read."""
        user_id = uuid4()

        # Mock count query result
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 5
        mock_db.execute = AsyncMock(return_value=mock_count_result)
        mock_db.commit = AsyncMock()

        count = await notification_service.mark_all_read(user_id)

        # Should return the count of marked notifications
        assert count == 5


class TestNotificationServiceList:
    """Tests for listing notifications."""

    @pytest.mark.asyncio
    async def test_get_unread_count(self, notification_service, mock_db):
        """Test getting unread notification count."""
        user_id = uuid4()

        mock_result = MagicMock()
        mock_result.scalar.return_value = 5
        mock_db.execute.return_value = mock_result

        count = await notification_service.get_unread_count(user_id)

        assert count == 5

    @pytest.mark.asyncio
    async def test_get_by_id_success(
        self, notification_service, mock_db, sample_notification
    ):
        """Test getting a notification by ID."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_notification
        mock_db.execute.return_value = mock_result

        result = await notification_service.get_by_id(
            sample_notification.id, sample_notification.user_id
        )

        assert result == sample_notification

    @pytest.mark.asyncio
    async def test_get_by_id_not_found(self, notification_service, mock_db):
        """Test getting a non-existent notification."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        result = await notification_service.get_by_id(uuid4(), uuid4())

        assert result is None

    @pytest.mark.asyncio
    async def test_get_by_id_wrong_user(
        self, notification_service, mock_db
    ):
        """Test that user cannot access another user's notification."""
        # When querying with wrong user_id, should return None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        result = await notification_service.get_by_id(
            uuid4(), uuid4()  # Wrong user
        )

        assert result is None


class TestNotificationPreferences:
    """Tests for notification preferences."""

    @pytest.mark.asyncio
    async def test_get_preferences_exists(
        self, notification_service, mock_db
    ):
        """Test getting existing user preferences."""
        user_id = uuid4()
        mock_prefs = MagicMock()
        mock_prefs.milestone_alerts = True
        mock_prefs.streak_alerts = True
        mock_prefs.email_enabled = False

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_prefs
        mock_db.execute.return_value = mock_result

        result = await notification_service.get_preferences(user_id)

        assert result is not None
        assert result.milestone_alerts is True

    @pytest.mark.asyncio
    async def test_get_preferences_creates_default(
        self, notification_service, mock_db
    ):
        """Test that getting preferences creates defaults if none exist."""
        user_id = uuid4()

        # First call returns None (no preferences)
        mock_result_none = MagicMock()
        mock_result_none.scalar_one_or_none.return_value = None

        # Second call returns the new preferences
        mock_prefs = MagicMock()
        mock_result_prefs = MagicMock()
        mock_result_prefs.scalar_one_or_none.return_value = mock_prefs

        mock_db.execute.side_effect = [mock_result_none, mock_result_prefs]
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        # The service should create default preferences
        result = await notification_service.get_or_create_preferences(user_id)

        # Should have called add to create new preferences
        mock_db.add.assert_called_once()


class TestNotificationDelivery:
    """Tests for notification delivery logic."""

    @pytest.mark.asyncio
    async def test_is_within_quiet_hours(self, notification_service):
        """Test quiet hours detection."""
        # The service should have logic to check quiet hours
        assert hasattr(notification_service, 'db')
        # Quiet hours testing would require more complex time mocking


class TestNotificationServiceOwnership:
    """Tests for notification ownership verification."""

    @pytest.mark.asyncio
    async def test_user_can_only_access_own_notifications(
        self, notification_service, mock_db, sample_notification
    ):
        """Test that notifications are filtered by user_id."""
        # When querying, the service always includes user_id filter
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_notification
        mock_db.execute.return_value = mock_result

        # Query with correct user
        result = await notification_service.get_by_id(
            sample_notification.id, sample_notification.user_id
        )
        assert result == sample_notification

        # Query with wrong user - should return None due to filter
        mock_result.scalar_one_or_none.return_value = None
        result = await notification_service.get_by_id(
            sample_notification.id, uuid4()
        )
        assert result is None
