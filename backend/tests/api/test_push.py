"""Tests for push notification API endpoints."""

import pytest
from uuid import uuid4
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.push_subscription import PushSubscription


class TestPushSubscribeEndpoint:
    """Tests for POST /api/v1/push/subscribe."""

    @pytest.mark.asyncio
    async def test_subscribe_requires_auth(self, client: AsyncClient):
        """Push subscribe endpoint requires authentication."""
        response = await client.post(
            "/api/v1/push/subscribe",
            json={
                "endpoint": "https://fcm.googleapis.com/fcm/send/test",
                "keys": {
                    "p256dh": "test-p256dh-key",
                    "auth": "test-auth-key",
                },
            },
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_subscribe_success(
        self,
        authenticated_client: AsyncClient,
        sample_user,
    ):
        """Successfully create a push subscription."""
        response = await authenticated_client.post(
            "/api/v1/push/subscribe",
            json={
                "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-123",
                "keys": {
                    "p256dh": "test-p256dh-key-base64",
                    "auth": "test-auth-key-base64",
                },
                "device_name": "Chrome on Windows",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["endpoint"] == "https://fcm.googleapis.com/fcm/send/test-endpoint-123"
        assert data["device_name"] == "Chrome on Windows"
        assert data["is_active"] is True

    @pytest.mark.asyncio
    async def test_subscribe_invalid_endpoint_http(
        self,
        authenticated_client: AsyncClient,
        sample_user,
    ):
        """Push endpoint must use HTTPS."""
        response = await authenticated_client.post(
            "/api/v1/push/subscribe",
            json={
                "endpoint": "http://insecure.example.com/push",
                "keys": {
                    "p256dh": "test-key",
                    "auth": "test-auth",
                },
            },
        )

        assert response.status_code == 422
        assert "HTTPS" in response.json()["detail"][0]["msg"]

    @pytest.mark.asyncio
    async def test_subscribe_empty_keys(
        self,
        authenticated_client: AsyncClient,
        sample_user,
    ):
        """Push subscription keys cannot be empty."""
        response = await authenticated_client.post(
            "/api/v1/push/subscribe",
            json={
                "endpoint": "https://fcm.googleapis.com/fcm/send/test",
                "keys": {
                    "p256dh": "",
                    "auth": "",
                },
            },
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_subscribe_duplicate_updates(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        sample_user,
    ):
        """Subscribing with same endpoint updates the subscription."""
        endpoint = "https://fcm.googleapis.com/fcm/send/duplicate-test"

        # First subscription
        response1 = await authenticated_client.post(
            "/api/v1/push/subscribe",
            json={
                "endpoint": endpoint,
                "keys": {"p256dh": "key1", "auth": "auth1"},
                "device_name": "First Device",
            },
        )
        assert response1.status_code == 201
        first_id = response1.json()["id"]

        # Second subscription with same endpoint - should update
        response2 = await authenticated_client.post(
            "/api/v1/push/subscribe",
            json={
                "endpoint": endpoint,
                "keys": {"p256dh": "key2", "auth": "auth2"},
                "device_name": "Updated Device",
            },
        )
        assert response2.status_code == 201
        second_id = response2.json()["id"]

        # Should be the same subscription (updated, not duplicated)
        assert first_id == second_id
        assert response2.json()["device_name"] == "Updated Device"


class TestPushUnsubscribeEndpoint:
    """Tests for DELETE /api/v1/push/unsubscribe."""

    @pytest.mark.asyncio
    async def test_unsubscribe_requires_auth(self, client: AsyncClient):
        """Push unsubscribe endpoint requires authentication."""
        response = await client.delete(
            "/api/v1/push/unsubscribe",
            params={"endpoint": "https://example.com/push"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_unsubscribe_success(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        sample_user,
    ):
        """Successfully unsubscribe from push notifications."""
        endpoint = "https://fcm.googleapis.com/fcm/send/to-delete"

        # First create a subscription
        await authenticated_client.post(
            "/api/v1/push/subscribe",
            json={
                "endpoint": endpoint,
                "keys": {"p256dh": "key", "auth": "auth"},
            },
        )

        # Then delete it
        response = await authenticated_client.delete(
            "/api/v1/push/unsubscribe",
            params={"endpoint": endpoint},
        )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_unsubscribe_not_found(
        self,
        authenticated_client: AsyncClient,
        sample_user,
    ):
        """Unsubscribe returns 404 for non-existent subscription."""
        response = await authenticated_client.delete(
            "/api/v1/push/unsubscribe",
            params={"endpoint": "https://example.com/non-existent"},
        )

        assert response.status_code == 404
        data = response.json()
        # Handle both possible response formats
        detail = data.get("detail") or data.get("message") or str(data)
        assert "Subscription not found" in detail or "not found" in detail.lower()


class TestPushDeleteByIdEndpoint:
    """Tests for DELETE /api/v1/push/subscriptions/{id}."""

    @pytest.mark.asyncio
    async def test_delete_by_id_requires_auth(self, client: AsyncClient):
        """Delete by ID requires authentication."""
        subscription_id = uuid4()
        response = await client.delete(
            f"/api/v1/push/subscriptions/{subscription_id}",
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_by_id_success(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        sample_user,
    ):
        """Successfully delete subscription by ID."""
        # Create a subscription
        create_response = await authenticated_client.post(
            "/api/v1/push/subscribe",
            json={
                "endpoint": "https://fcm.googleapis.com/fcm/send/to-delete-by-id",
                "keys": {"p256dh": "key", "auth": "auth"},
            },
        )
        subscription_id = create_response.json()["id"]

        # Delete by ID
        response = await authenticated_client.delete(
            f"/api/v1/push/subscriptions/{subscription_id}",
        )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_by_id_not_found(
        self,
        authenticated_client: AsyncClient,
        sample_user,
    ):
        """Delete by ID returns 404 for non-existent subscription."""
        fake_id = uuid4()
        response = await authenticated_client.delete(
            f"/api/v1/push/subscriptions/{fake_id}",
        )

        assert response.status_code == 404


class TestPushListEndpoint:
    """Tests for GET /api/v1/push/subscriptions."""

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, client: AsyncClient):
        """List subscriptions requires authentication."""
        response = await client.get("/api/v1/push/subscriptions")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_empty(
        self,
        authenticated_client: AsyncClient,
        sample_user,
    ):
        """List returns empty when user has no subscriptions."""
        response = await authenticated_client.get("/api/v1/push/subscriptions")

        assert response.status_code == 200
        data = response.json()
        assert data["subscriptions"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_list_with_subscriptions(
        self,
        authenticated_client: AsyncClient,
        sample_user,
    ):
        """List returns user's subscriptions."""
        # Create subscriptions
        for i in range(3):
            await authenticated_client.post(
                "/api/v1/push/subscribe",
                json={
                    "endpoint": f"https://fcm.googleapis.com/fcm/send/sub-{i}",
                    "keys": {"p256dh": f"key{i}", "auth": f"auth{i}"},
                    "device_name": f"Device {i}",
                },
            )

        response = await authenticated_client.get("/api/v1/push/subscriptions")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["subscriptions"]) == 3


class TestPushTestEndpoint:
    """Tests for POST /api/v1/push/test."""

    @pytest.mark.asyncio
    async def test_test_requires_auth(self, client: AsyncClient):
        """Test notification requires authentication."""
        response = await client.post(
            "/api/v1/push/test",
            json={"title": "Test", "body": "Test body"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_test_no_subscriptions(
        self,
        authenticated_client: AsyncClient,
        sample_user,
    ):
        """Test notification fails when user has no subscriptions."""
        response = await authenticated_client.post(
            "/api/v1/push/test",
            json={"title": "Test", "body": "Test body"},
        )

        assert response.status_code == 404
        data = response.json()
        # Handle both possible response formats
        detail = data.get("detail") or data.get("message") or str(data)
        assert "No active push subscriptions" in detail or "not found" in detail.lower()

    @pytest.mark.asyncio
    async def test_test_success(
        self,
        authenticated_client: AsyncClient,
        sample_user,
    ):
        """Successfully send test notification."""
        # Create a subscription first
        await authenticated_client.post(
            "/api/v1/push/subscribe",
            json={
                "endpoint": "https://fcm.googleapis.com/fcm/send/test-notif",
                "keys": {"p256dh": "key", "auth": "auth"},
            },
        )

        response = await authenticated_client.post(
            "/api/v1/push/test",
            json={"title": "Test Title", "body": "Test notification body"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["sent"] == 1
        assert data["failed"] == 0
        assert data["total"] == 1


class TestPushOwnership:
    """Tests for subscription ownership verification."""

    @pytest.mark.asyncio
    async def test_cannot_delete_other_users_subscription(
        self,
        db_session: AsyncSession,
        authenticated_client: AsyncClient,
        sample_user,
    ):
        """Users cannot delete subscriptions belonging to others."""
        from app.models.user import User

        # Create another user
        other_user = User(
            id=uuid4(),
            supabase_auth_id=uuid4(),
            email="other@example.com",
            display_name="Other User",
            subscription_tier="free",
        )
        db_session.add(other_user)
        await db_session.commit()

        # Create subscription for other user
        other_subscription = PushSubscription(
            id=uuid4(),
            user_id=other_user.id,
            endpoint="https://fcm.googleapis.com/fcm/send/other-user-sub",
            p256dh_key="other-key",
            auth_key="other-auth",
        )
        db_session.add(other_subscription)
        await db_session.commit()

        # Try to delete as authenticated user (not the owner)
        response = await authenticated_client.delete(
            f"/api/v1/push/subscriptions/{other_subscription.id}",
        )

        # Should fail - not found (ownership check)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_list_only_shows_own_subscriptions(
        self,
        db_session: AsyncSession,
        authenticated_client: AsyncClient,
        sample_user,
    ):
        """Users only see their own subscriptions in list."""
        from app.models.user import User

        # Create another user with a subscription
        other_user = User(
            id=uuid4(),
            supabase_auth_id=uuid4(),
            email="other2@example.com",
            display_name="Other User 2",
            subscription_tier="free",
        )
        db_session.add(other_user)

        other_subscription = PushSubscription(
            id=uuid4(),
            user_id=other_user.id,
            endpoint="https://fcm.googleapis.com/fcm/send/other-list-sub",
            p256dh_key="other-key",
            auth_key="other-auth",
        )
        db_session.add(other_subscription)
        await db_session.commit()

        # Create subscription for authenticated user
        await authenticated_client.post(
            "/api/v1/push/subscribe",
            json={
                "endpoint": "https://fcm.googleapis.com/fcm/send/my-sub",
                "keys": {"p256dh": "key", "auth": "auth"},
            },
        )

        # List should only show authenticated user's subscription
        response = await authenticated_client.get("/api/v1/push/subscriptions")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["subscriptions"][0]["endpoint"] == "https://fcm.googleapis.com/fcm/send/my-sub"
