"""Framework endpoint tests."""
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.curriculum_framework import CurriculumFramework


@pytest.mark.asyncio
async def test_get_frameworks_returns_empty_list(client: AsyncClient) -> None:
    """Test that frameworks endpoint returns empty list when no frameworks exist."""
    response = await client.get("/api/v1/frameworks")
    assert response.status_code == 200

    data = response.json()
    assert "frameworks" in data
    assert "total" in data
    assert data["total"] == 0
    assert data["frameworks"] == []


@pytest.mark.asyncio
async def test_get_frameworks_returns_frameworks(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_framework_data: dict[str, Any],
) -> None:
    """Test that frameworks endpoint returns created frameworks."""
    # Create a framework directly in the database
    framework = CurriculumFramework(**sample_framework_data)
    db_session.add(framework)
    await db_session.commit()

    response = await client.get("/api/v1/frameworks")
    assert response.status_code == 200

    data = response.json()
    assert data["total"] == 1
    assert len(data["frameworks"]) == 1
    assert data["frameworks"][0]["code"] == "TEST"
    assert data["frameworks"][0]["name"] == "Test Framework"


@pytest.mark.asyncio
async def test_get_framework_by_code(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_framework_data: dict[str, Any],
) -> None:
    """Test getting a specific framework by code."""
    framework = CurriculumFramework(**sample_framework_data)
    db_session.add(framework)
    await db_session.commit()

    response = await client.get("/api/v1/frameworks/TEST")
    assert response.status_code == 200

    data = response.json()
    assert data["code"] == "TEST"
    assert data["name"] == "Test Framework"
    assert data["country"] == "Australia"
    assert data["region_type"] == "state"


@pytest.mark.asyncio
async def test_get_framework_by_code_case_insensitive(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_framework_data: dict[str, Any],
) -> None:
    """Test that framework code lookup is case-insensitive."""
    framework = CurriculumFramework(**sample_framework_data)
    db_session.add(framework)
    await db_session.commit()

    response = await client.get("/api/v1/frameworks/test")
    assert response.status_code == 200
    assert response.json()["code"] == "TEST"


@pytest.mark.asyncio
async def test_get_framework_not_found(client: AsyncClient) -> None:
    """Test that 404 is returned for non-existent framework."""
    response = await client.get("/api/v1/frameworks/NONEXISTENT")
    assert response.status_code == 404

    data = response.json()
    # Updated to match new sanitized error format
    assert "error_code" in data
    assert data["error_code"] == "NOT_FOUND"
    assert "message" in data


@pytest.mark.asyncio
async def test_create_framework(
    authenticated_client: AsyncClient,
    sample_framework_data: dict[str, Any],
) -> None:
    """Test creating a new framework (requires authentication)."""
    response = await authenticated_client.post("/api/v1/frameworks", json=sample_framework_data)
    assert response.status_code == 201

    data = response.json()
    assert data["code"] == "TEST"
    assert data["name"] == "Test Framework"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_framework_unauthorized(
    client: AsyncClient,
    sample_framework_data: dict[str, Any],
) -> None:
    """Test that creating a framework without authentication fails."""
    response = await client.post("/api/v1/frameworks", json=sample_framework_data)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_framework_duplicate_code(
    authenticated_client: AsyncClient,
    db_session: AsyncSession,
    sample_framework_data: dict[str, Any],
) -> None:
    """Test that creating a framework with duplicate code fails."""
    framework = CurriculumFramework(**sample_framework_data)
    db_session.add(framework)
    await db_session.commit()

    response = await authenticated_client.post("/api/v1/frameworks", json=sample_framework_data)
    assert response.status_code == 409

    data = response.json()
    # Updated to match new sanitized error format
    assert "error_code" in data
    assert data["error_code"] == "ALREADY_EXISTS"


@pytest.mark.asyncio
async def test_update_framework(
    authenticated_client: AsyncClient,
    db_session: AsyncSession,
    sample_framework_data: dict[str, Any],
) -> None:
    """Test updating a framework (requires authentication)."""
    framework = CurriculumFramework(**sample_framework_data)
    db_session.add(framework)
    await db_session.commit()

    update_data = {"name": "Updated Framework Name"}
    response = await authenticated_client.patch("/api/v1/frameworks/TEST", json=update_data)
    assert response.status_code == 200

    data = response.json()
    assert data["name"] == "Updated Framework Name"
    assert data["code"] == "TEST"  # Code should not change


@pytest.mark.asyncio
async def test_update_framework_unauthorized(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_framework_data: dict[str, Any],
) -> None:
    """Test that updating a framework without authentication fails."""
    framework = CurriculumFramework(**sample_framework_data)
    db_session.add(framework)
    await db_session.commit()

    update_data = {"name": "Updated Framework Name"}
    response = await client.patch("/api/v1/frameworks/TEST", json=update_data)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_frameworks_active_only(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_framework_data: dict[str, Any],
) -> None:
    """Test that inactive frameworks are excluded by default."""
    # Create active framework
    active_framework = CurriculumFramework(**sample_framework_data)
    db_session.add(active_framework)

    # Create inactive framework
    inactive_data = sample_framework_data.copy()
    inactive_data["code"] = "INACTIVE"
    inactive_data["name"] = "Inactive Framework"
    inactive_data["is_active"] = False
    inactive_framework = CurriculumFramework(**inactive_data)
    db_session.add(inactive_framework)

    await db_session.commit()

    # Default should only return active
    response = await client.get("/api/v1/frameworks")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["frameworks"][0]["code"] == "TEST"

    # With active_only=false, should return both
    response = await client.get("/api/v1/frameworks?active_only=false")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2


@pytest.mark.asyncio
async def test_get_frameworks_pagination(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_framework_data: dict[str, Any],
) -> None:
    """Test pagination on frameworks endpoint."""
    # Create 3 frameworks
    for i in range(3):
        data = sample_framework_data.copy()
        data["code"] = f"TEST{i}"
        data["name"] = f"Test Framework {i}"
        data["display_order"] = i
        framework = CurriculumFramework(**data)
        db_session.add(framework)
    await db_session.commit()

    # Get first page with page_size=2
    response = await client.get("/api/v1/frameworks?page=1&page_size=2")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["frameworks"]) == 2
    assert data["page"] == 1
    assert data["page_size"] == 2
    assert data["total_pages"] == 2
    assert data["has_next"] is True
    assert data["has_previous"] is False

    # Get second page
    response = await client.get("/api/v1/frameworks?page=2&page_size=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["frameworks"]) == 1
    assert data["has_next"] is False
    assert data["has_previous"] is True
