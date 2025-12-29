"""Tests for PushService."""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.services.push_service import PushService
from app.schemas.push import PushSubscriptionCreate, PushSubscriptionKeys, PushNotificationPayload


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.execute = AsyncMock()
    return db


@pytest.fixture
def push_service(mock_db):
    """Create PushService with mocked db."""
    return PushService(db=mock_db)


@pytest.fixture
def sample_subscription_create():
    """Sample push subscription creation data."""
    return PushSubscriptionCreate(
        endpoint="https://fcm.googleapis.com/fcm/send/test-endpoint-123",
        keys=PushSubscriptionKeys(
            p256dh="test-p256dh-key-base64",
            auth="test-auth-key-base64",
        ),
        device_name="Chrome on Windows",
    )


@pytest.fixture
def mock_push_subscription():
    """Create a mock PushSubscription object."""
    subscription = MagicMock()
    subscription.id = uuid4()
    subscription.user_id = uuid4()
    subscription.endpoint = "https://fcm.googleapis.com/fcm/send/test-endpoint-123"
    subscription.p256dh_key = "test-p256dh-key-base64"
    subscription.auth_key = "test-auth-key-base64"
    subscription.user_agent = "Mozilla/5.0"
    subscription.device_name = "Chrome on Windows"
    subscription.is_active = True
    subscription.failed_attempts = 0
    subscription.last_used_at = None
    subscription.created_at = datetime.now(timezone.utc)
    subscription.updated_at = datetime.now(timezone.utc)
    return subscription


class TestPushServiceCreateSubscription:
    """Tests for subscription creation."""

    @pytest.mark.asyncio
    async def test_create_new_subscription(
        self, push_service, mock_db, sample_subscription_create
    ):
        """Test creating a new push subscription."""
        user_id = uuid4()

        # Mock no existing subscription
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        result = await push_service.create_subscription(
            user_id=user_id,
            subscription=sample_subscription_create,
            user_agent="Mozilla/5.0",
        )

        # Verify add was called
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_existing_subscription(
        self, push_service, mock_db, sample_subscription_create, mock_push_subscription
    ):
        """Test updating an existing push subscription."""
        user_id = uuid4()

        # Mock existing subscription found
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_push_subscription
        mock_db.execute.return_value = mock_result

        result = await push_service.create_subscription(
            user_id=user_id,
            subscription=sample_subscription_create,
            user_agent="Mozilla/5.0 New",
        )

        # Verify existing subscription was updated
        assert mock_push_subscription.user_id == user_id
        assert mock_push_subscription.is_active is True
        assert mock_push_subscription.failed_attempts == 0
        mock_db.commit.assert_called_once()


class TestPushServiceGetSubscriptions:
    """Tests for subscription retrieval."""

    @pytest.mark.asyncio
    async def test_get_user_subscriptions(
        self, push_service, mock_db, mock_push_subscription
    ):
        """Test getting all subscriptions for a user."""
        user_id = uuid4()

        # Mock subscriptions list
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_push_subscription]
        mock_db.execute.return_value = mock_result

        result = await push_service.get_user_subscriptions(user_id)

        assert len(result) == 1
        assert result[0] == mock_push_subscription

    @pytest.mark.asyncio
    async def test_get_user_subscriptions_empty(self, push_service, mock_db):
        """Test getting subscriptions when user has none."""
        user_id = uuid4()

        # Mock empty subscriptions list
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result

        result = await push_service.get_user_subscriptions(user_id)

        assert len(result) == 0


class TestPushServiceDeleteSubscription:
    """Tests for subscription deletion."""

    @pytest.mark.asyncio
    async def test_delete_subscription_by_endpoint_success(self, push_service, mock_db):
        """Test deleting a subscription by endpoint."""
        user_id = uuid4()
        endpoint = "https://fcm.googleapis.com/fcm/send/test-endpoint"

        # Mock successful deletion (1 row affected)
        mock_result = MagicMock()
        mock_result.rowcount = 1
        mock_db.execute.return_value = mock_result

        result = await push_service.delete_subscription(user_id, endpoint)

        assert result is True
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_subscription_by_endpoint_not_found(self, push_service, mock_db):
        """Test deleting a non-existent subscription by endpoint."""
        user_id = uuid4()
        endpoint = "https://fcm.googleapis.com/fcm/send/non-existent"

        # Mock no rows deleted
        mock_result = MagicMock()
        mock_result.rowcount = 0
        mock_db.execute.return_value = mock_result

        result = await push_service.delete_subscription(user_id, endpoint)

        assert result is False

    @pytest.mark.asyncio
    async def test_delete_subscription_by_id_success(self, push_service, mock_db):
        """Test deleting a subscription by ID."""
        user_id = uuid4()
        subscription_id = uuid4()

        # Mock successful deletion
        mock_result = MagicMock()
        mock_result.rowcount = 1
        mock_db.execute.return_value = mock_result

        result = await push_service.delete_subscription_by_id(user_id, subscription_id)

        assert result is True

    @pytest.mark.asyncio
    async def test_delete_subscription_by_id_not_found(self, push_service, mock_db):
        """Test deleting a non-existent subscription by ID."""
        user_id = uuid4()
        subscription_id = uuid4()

        # Mock no rows deleted
        mock_result = MagicMock()
        mock_result.rowcount = 0
        mock_db.execute.return_value = mock_result

        result = await push_service.delete_subscription_by_id(user_id, subscription_id)

        assert result is False


class TestPushServiceFailureTracking:
    """Tests for subscription failure tracking."""

    @pytest.mark.asyncio
    async def test_mark_subscription_failed_increments_count(
        self, push_service, mock_db, mock_push_subscription
    ):
        """Test that marking as failed increments the counter."""
        mock_push_subscription.failed_attempts = 1

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_push_subscription
        mock_db.execute.return_value = mock_result

        await push_service.mark_subscription_failed(mock_push_subscription.id)

        assert mock_push_subscription.failed_attempts == 2
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_mark_subscription_failed_deactivates_after_threshold(
        self, push_service, mock_db, mock_push_subscription
    ):
        """Test that subscription is deactivated after 3 failures."""
        mock_push_subscription.failed_attempts = 2

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_push_subscription
        mock_db.execute.return_value = mock_result

        await push_service.mark_subscription_failed(mock_push_subscription.id)

        assert mock_push_subscription.failed_attempts == 3
        assert mock_push_subscription.is_active is False

    @pytest.mark.asyncio
    async def test_mark_subscription_used_resets_failures(
        self, push_service, mock_db, mock_push_subscription
    ):
        """Test that marking as used resets failure count."""
        mock_push_subscription.failed_attempts = 2

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_push_subscription
        mock_db.execute.return_value = mock_result

        await push_service.mark_subscription_used(mock_push_subscription.id)

        assert mock_push_subscription.failed_attempts == 0
        assert mock_push_subscription.last_used_at is not None
        mock_db.commit.assert_called_once()


class TestPushServiceSendNotification:
    """Tests for sending notifications."""

    @pytest.mark.asyncio
    async def test_send_notification_placeholder_success(
        self, push_service, mock_db, mock_push_subscription
    ):
        """Test that placeholder send notification works."""
        payload = PushNotificationPayload(
            title="Test Notification",
            body="This is a test",
        )

        # Mock mark_subscription_used
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_push_subscription
        mock_db.execute.return_value = mock_result

        result = await push_service.send_notification(mock_push_subscription, payload)

        # Placeholder always returns True
        assert result is True


class TestPushServiceGetAllActive:
    """Tests for getting all active subscriptions."""

    @pytest.mark.asyncio
    async def test_get_all_active_subscriptions(
        self, push_service, mock_db, mock_push_subscription
    ):
        """Test getting all active subscriptions."""
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_push_subscription]
        mock_db.execute.return_value = mock_result

        result = await push_service.get_all_active_subscriptions()

        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_all_active_subscriptions_with_user_filter(
        self, push_service, mock_db, mock_push_subscription
    ):
        """Test getting active subscriptions filtered by user IDs."""
        user_ids = [uuid4(), uuid4()]

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_push_subscription]
        mock_db.execute.return_value = mock_result

        result = await push_service.get_all_active_subscriptions(user_ids=user_ids)

        assert len(result) == 1
