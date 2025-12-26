"""Tests for User API endpoints."""
import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_user(client: AsyncClient):
    """Test creating a new user."""
    data = {
        "supabase_auth_id": str(uuid.uuid4()),
        "email": "newuser@example.com",
        "display_name": "New User",
    }

    response = await client.post("/api/v1/users", json=data)

    assert response.status_code == 201
    result = response.json()
    assert result["email"] == "newuser@example.com"
    assert result["display_name"] == "New User"
    assert result["subscription_tier"] == "free"


@pytest.mark.asyncio
async def test_create_user_duplicate_email(client: AsyncClient, sample_user):
    """Test creating a user with duplicate email fails."""
    data = {
        "supabase_auth_id": str(uuid.uuid4()),
        "email": sample_user.email,  # Same email as existing user
        "display_name": "Duplicate User",
    }

    response = await client.post("/api/v1/users", json=data)

    assert response.status_code == 409
    result = response.json()
    assert result["error_code"] == "ALREADY_EXISTS"


@pytest.mark.asyncio
async def test_get_current_user_unauthenticated(client: AsyncClient):
    """Test getting current user without auth returns 401."""
    response = await client.get("/api/v1/users/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_authenticated(
    authenticated_client: AsyncClient,
    sample_user,
):
    """Test getting current user profile when authenticated."""
    response = await authenticated_client.get("/api/v1/users/me")

    assert response.status_code == 200
    result = response.json()
    assert result["email"] == sample_user.email
    assert result["display_name"] == sample_user.display_name


@pytest.mark.asyncio
async def test_update_current_user(authenticated_client: AsyncClient, sample_user):
    """Test updating current user profile."""
    data = {
        "display_name": "Updated Name",
        "phone_number": "+61400000001",
    }

    response = await authenticated_client.put("/api/v1/users/me", json=data)

    assert response.status_code == 200
    result = response.json()
    assert result["display_name"] == "Updated Name"
    assert result["phone_number"] == "+61400000001"


@pytest.mark.asyncio
async def test_get_current_user_students(
    authenticated_client: AsyncClient,
    sample_student,
):
    """Test getting current user's students."""
    response = await authenticated_client.get("/api/v1/users/me/students")

    assert response.status_code == 200
    result = response.json()
    assert result["total"] == 1
    assert len(result["students"]) == 1
    assert result["students"][0]["display_name"] == sample_student.display_name


@pytest.mark.asyncio
async def test_get_current_user_students_empty(authenticated_client: AsyncClient):
    """Test getting students when user has none."""
    response = await authenticated_client.get("/api/v1/users/me/students")

    assert response.status_code == 200
    result = response.json()
    assert result["total"] == 0
    assert len(result["students"]) == 0


@pytest.mark.asyncio
async def test_accept_privacy_policy(authenticated_client: AsyncClient):
    """Test accepting privacy policy."""
    response = await authenticated_client.post("/api/v1/users/me/accept-privacy-policy")

    assert response.status_code == 200
    result = response.json()
    assert result["privacy_policy_accepted_at"] is not None


@pytest.mark.asyncio
async def test_accept_terms(authenticated_client: AsyncClient):
    """Test accepting terms of service."""
    response = await authenticated_client.post("/api/v1/users/me/accept-terms")

    assert response.status_code == 200
    result = response.json()
    assert result["terms_accepted_at"] is not None
