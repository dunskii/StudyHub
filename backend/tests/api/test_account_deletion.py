"""Tests for account deletion API endpoints."""
import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_request_deletion_authenticated(authenticated_client: AsyncClient):
    """Test requesting account deletion when authenticated."""
    data = {
        "reason": "Testing the deletion flow",
        "export_data": True,
    }

    response = await authenticated_client.post(
        "/api/v1/users/me/request-deletion",
        json=data,
    )

    assert response.status_code == 200
    result = response.json()
    assert "deletion request initiated" in result["message"].lower()
    assert result["grace_period_days"] == 7
    assert result["confirmation_email_sent"] is True
    assert "deletion_request_id" in result
    assert "scheduled_deletion_at" in result


@pytest.mark.asyncio
async def test_request_deletion_unauthenticated(client: AsyncClient):
    """Test requesting deletion without authentication."""
    data = {"reason": "Test"}

    response = await client.post(
        "/api/v1/users/me/request-deletion",
        json=data,
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_request_deletion_no_reason(authenticated_client: AsyncClient):
    """Test requesting deletion without providing a reason."""
    response = await authenticated_client.post(
        "/api/v1/users/me/request-deletion",
        json={},
    )

    assert response.status_code == 200
    result = response.json()
    assert "deletion_request_id" in result


@pytest.mark.asyncio
async def test_request_deletion_duplicate(authenticated_client: AsyncClient):
    """Test requesting deletion when one already exists."""
    # First request
    response1 = await authenticated_client.post(
        "/api/v1/users/me/request-deletion",
        json={},
    )
    assert response1.status_code == 200

    # Second request should fail
    response2 = await authenticated_client.post(
        "/api/v1/users/me/request-deletion",
        json={},
    )
    assert response2.status_code == 409
    # The exception handler sanitizes messages, check for error_code
    result = response2.json()
    assert result.get("error_code") == "ALREADY_EXISTS" or "conflict" in result.get("message", "").lower()


@pytest.mark.asyncio
async def test_confirm_deletion_success(
    authenticated_client: AsyncClient,
    db_session,
    sample_user,
):
    """Test confirming a deletion request."""
    # First create a request
    response = await authenticated_client.post(
        "/api/v1/users/me/request-deletion",
        json={},
    )
    assert response.status_code == 200

    # Get the confirmation token from the database
    from sqlalchemy import select
    from app.models.deletion_request import DeletionRequest

    result = await db_session.execute(
        select(DeletionRequest).where(DeletionRequest.user_id == sample_user.id)
    )
    deletion_request = result.scalar_one()

    # Confirm with password and token
    confirm_data = {
        "password": "testpassword123",  # In real app, would need actual password validation
        "confirmation_token": str(deletion_request.confirmation_token),
    }

    response = await authenticated_client.post(
        "/api/v1/users/me/confirm-deletion",
        json=confirm_data,
    )

    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "confirmed"
    assert "deletion confirmed" in result["message"].lower()


@pytest.mark.asyncio
async def test_confirm_deletion_invalid_token(authenticated_client: AsyncClient):
    """Test confirming with invalid token."""
    # First create a request
    response = await authenticated_client.post(
        "/api/v1/users/me/request-deletion",
        json={},
    )
    assert response.status_code == 200

    # Try to confirm with wrong token
    confirm_data = {
        "password": "testpassword123",
        "confirmation_token": str(uuid.uuid4()),  # Wrong token
    }

    response = await authenticated_client.post(
        "/api/v1/users/me/confirm-deletion",
        json=confirm_data,
    )

    assert response.status_code == 400
    # Exception handler sanitizes - check error_code or message
    result = response.json()
    assert result.get("error_code") == "INVALID_INPUT" or "bad request" in result.get("message", "").lower()


@pytest.mark.asyncio
async def test_cancel_deletion_success(authenticated_client: AsyncClient):
    """Test cancelling a deletion request."""
    # First create a request
    response = await authenticated_client.post(
        "/api/v1/users/me/request-deletion",
        json={},
    )
    assert response.status_code == 200

    # Cancel it
    response = await authenticated_client.delete(
        "/api/v1/users/me/cancel-deletion"
    )

    assert response.status_code == 200
    result = response.json()
    assert "cancelled" in result["message"].lower()
    assert "cancelled_at" in result


@pytest.mark.asyncio
async def test_cancel_deletion_no_request(authenticated_client: AsyncClient):
    """Test cancelling when no request exists."""
    response = await authenticated_client.delete(
        "/api/v1/users/me/cancel-deletion"
    )

    assert response.status_code == 404
    # Exception handler sanitizes - check error_code or message
    result = response.json()
    assert result.get("error_code") == "NOT_FOUND" or "not found" in result.get("message", "").lower()


@pytest.mark.asyncio
async def test_get_deletion_status_with_pending(authenticated_client: AsyncClient):
    """Test getting deletion status when request exists."""
    # First create a request
    response = await authenticated_client.post(
        "/api/v1/users/me/request-deletion",
        json={},
    )
    assert response.status_code == 200

    # Get status
    response = await authenticated_client.get(
        "/api/v1/users/me/deletion-status"
    )

    assert response.status_code == 200
    result = response.json()
    assert result["has_pending_deletion"] is True
    assert "deletion_request" in result
    assert result["deletion_request"]["status"] == "pending"
    # Days remaining can be 6 or 7 depending on time of day
    assert result["deletion_request"]["days_remaining"] in [6, 7]
    assert result["deletion_request"]["can_cancel"] is True


@pytest.mark.asyncio
async def test_get_deletion_status_no_request(authenticated_client: AsyncClient):
    """Test getting deletion status when no request exists."""
    response = await authenticated_client.get(
        "/api/v1/users/me/deletion-status"
    )

    assert response.status_code == 200
    result = response.json()
    assert result["has_pending_deletion"] is False
    assert result["deletion_request"] is None


@pytest.mark.asyncio
async def test_deletion_flow_complete(
    authenticated_client: AsyncClient,
    db_session,
    sample_user,
):
    """Test the complete deletion flow: request -> confirm -> cancel."""
    from sqlalchemy import select
    from app.models.deletion_request import DeletionRequest

    # Step 1: Request deletion
    response = await authenticated_client.post(
        "/api/v1/users/me/request-deletion",
        json={"reason": "Moving to another platform"},
    )
    assert response.status_code == 200
    request_id = response.json()["deletion_request_id"]

    # Step 2: Check status
    response = await authenticated_client.get("/api/v1/users/me/deletion-status")
    assert response.status_code == 200
    assert response.json()["has_pending_deletion"] is True
    assert response.json()["deletion_request"]["status"] == "pending"

    # Step 3: Get token from DB and confirm
    result = await db_session.execute(
        select(DeletionRequest).where(DeletionRequest.id == uuid.UUID(request_id))
    )
    deletion_request = result.scalar_one()

    response = await authenticated_client.post(
        "/api/v1/users/me/confirm-deletion",
        json={
            "password": "test123",
            "confirmation_token": str(deletion_request.confirmation_token),
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"

    # Step 4: Check status is now confirmed
    response = await authenticated_client.get("/api/v1/users/me/deletion-status")
    assert response.status_code == 200
    assert response.json()["deletion_request"]["status"] == "confirmed"

    # Step 5: Cancel (even though confirmed)
    response = await authenticated_client.delete("/api/v1/users/me/cancel-deletion")
    assert response.status_code == 200

    # Step 6: Verify status shows no pending deletion
    response = await authenticated_client.get("/api/v1/users/me/deletion-status")
    assert response.status_code == 200
    assert response.json()["has_pending_deletion"] is False


@pytest.mark.asyncio
async def test_can_create_new_request_after_cancel(authenticated_client: AsyncClient):
    """Test creating a new deletion request after cancelling."""
    # Create first request
    response = await authenticated_client.post(
        "/api/v1/users/me/request-deletion",
        json={"reason": "First attempt"},
    )
    assert response.status_code == 200

    # Cancel it
    response = await authenticated_client.delete("/api/v1/users/me/cancel-deletion")
    assert response.status_code == 200

    # Create new request
    response = await authenticated_client.post(
        "/api/v1/users/me/request-deletion",
        json={"reason": "Second attempt"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_deletion_status_unauthenticated(client: AsyncClient):
    """Test getting deletion status without authentication."""
    response = await client.get("/api/v1/users/me/deletion-status")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_cancel_deletion_unauthenticated(client: AsyncClient):
    """Test cancelling deletion without authentication."""
    response = await client.delete("/api/v1/users/me/cancel-deletion")
    assert response.status_code == 401


# =============================================================================
# Admin Endpoint Tests (for scheduled tasks)
# =============================================================================


@pytest.mark.asyncio
async def test_admin_deletion_reminders_no_auth(client: AsyncClient):
    """Test admin endpoint without API key."""
    response = await client.post(
        "/api/v1/users/admin/scheduled-tasks/deletion-reminders"
    )

    # Should fail without X-Admin-Key header
    assert response.status_code == 422  # Missing required header


@pytest.mark.asyncio
async def test_admin_deletion_reminders_invalid_key(client: AsyncClient, monkeypatch):
    """Test admin endpoint with invalid API key."""
    # Configure a valid admin key so we can test invalid key rejection
    monkeypatch.setenv("ADMIN_API_KEY", "correct-admin-key")

    # Clear settings cache
    from app.core.config import get_settings
    get_settings.cache_clear()

    response = await client.post(
        "/api/v1/users/admin/scheduled-tasks/deletion-reminders",
        headers={"X-Admin-Key": "wrong-key"},
    )

    assert response.status_code == 403
    # Exception handler sanitizes - check error_code or message
    result = response.json()
    assert result.get("error_code") == "FORBIDDEN" or "denied" in result.get("message", "").lower()

    # Clear cache again for other tests
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_admin_deletion_reminders_success(client: AsyncClient, monkeypatch):
    """Test admin endpoint with valid API key."""
    # Set up test admin key
    monkeypatch.setenv("ADMIN_API_KEY", "test-admin-key-12345")

    # Clear settings cache to pick up new env var
    from app.core.config import get_settings
    get_settings.cache_clear()

    response = await client.post(
        "/api/v1/users/admin/scheduled-tasks/deletion-reminders",
        headers={"X-Admin-Key": "test-admin-key-12345"},
    )

    assert response.status_code == 200
    result = response.json()
    assert "reminders_sent" in result
    assert isinstance(result["reminders_sent"], int)

    # Clear cache for other tests
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_confirm_deletion_expired_token(
    authenticated_client: AsyncClient,
    db_session,
    sample_user,
):
    """Test confirming with an expired token."""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import select
    from app.models.deletion_request import DeletionRequest

    # First create a request
    response = await authenticated_client.post(
        "/api/v1/users/me/request-deletion",
        json={},
    )
    assert response.status_code == 200

    # Get the deletion request and expire the token
    result = await db_session.execute(
        select(DeletionRequest).where(DeletionRequest.user_id == sample_user.id)
    )
    deletion_request = result.scalar_one()

    # Set token to expired (25 hours ago)
    deletion_request.token_expires_at = datetime.now(timezone.utc) - timedelta(hours=25)
    await db_session.commit()

    # Try to confirm with expired token
    confirm_data = {
        "password": "testpassword123",
        "confirmation_token": str(deletion_request.confirmation_token),
    }

    response = await authenticated_client.post(
        "/api/v1/users/me/confirm-deletion",
        json=confirm_data,
    )

    assert response.status_code == 400
    # Exception handler sanitizes - just check the status code (400 confirms rejection)
    # The service raises ValueError with "expired" message but it gets sanitized
