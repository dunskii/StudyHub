"""Tests for Student API endpoints."""
import uuid

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_list_students(authenticated_client: AsyncClient, sample_student):
    """Test listing students for current user."""
    response = await authenticated_client.get("/api/v1/students")

    assert response.status_code == 200
    result = response.json()
    assert result["total"] == 1
    assert len(result["students"]) == 1


@pytest.mark.asyncio
async def test_list_students_empty(authenticated_client: AsyncClient):
    """Test listing students when user has none."""
    response = await authenticated_client.get("/api/v1/students")

    assert response.status_code == 200
    result = response.json()
    assert result["total"] == 0


@pytest.mark.asyncio
async def test_list_students_unauthenticated(client: AsyncClient):
    """Test listing students without auth returns 401."""
    response = await client.get("/api/v1/students")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_student(
    authenticated_client: AsyncClient,
    sample_user,
    sample_framework,
):
    """Test creating a new student."""
    data = {
        "parent_id": str(sample_user.id),
        "display_name": "New Student",
        "grade_level": 7,
        "school_stage": "S4",
        "framework_id": str(sample_framework.id),
    }

    response = await authenticated_client.post("/api/v1/students", json=data)

    assert response.status_code == 201
    result = response.json()
    assert result["display_name"] == "New Student"
    assert result["grade_level"] == 7
    assert result["school_stage"] == "S4"


@pytest.mark.asyncio
async def test_create_student_for_other_user_fails(
    authenticated_client: AsyncClient,
    another_user,
    sample_framework,
):
    """Test creating a student for another user is forbidden."""
    data = {
        "parent_id": str(another_user.id),  # Different user
        "display_name": "Should Fail",
        "grade_level": 5,
        "school_stage": "S3",
        "framework_id": str(sample_framework.id),
    }

    response = await authenticated_client.post("/api/v1/students", json=data)

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_student(authenticated_client: AsyncClient, sample_student):
    """Test getting a student by ID."""
    response = await authenticated_client.get(f"/api/v1/students/{sample_student.id}")

    assert response.status_code == 200
    result = response.json()
    assert result["id"] == str(sample_student.id)
    assert result["display_name"] == sample_student.display_name


@pytest.mark.asyncio
async def test_get_student_not_found(authenticated_client: AsyncClient):
    """Test getting a non-existent student returns 404."""
    response = await authenticated_client.get(f"/api/v1/students/{uuid.uuid4()}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_student_wrong_parent(
    db_session,
    another_user,
    sample_student,
):
    """Test getting another user's student returns 403."""
    from httpx import ASGITransport, AsyncClient

    from app.core.database import get_db
    from app.main import app

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Create token for another user
    token = create_access_token(data={"sub": str(another_user.supabase_auth_id)})

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as client:
        response = await client.get(f"/api/v1/students/{sample_student.id}")

    app.dependency_overrides.clear()

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_student(authenticated_client: AsyncClient, sample_student):
    """Test updating a student."""
    data = {
        "display_name": "Updated Student Name",
    }

    response = await authenticated_client.put(
        f"/api/v1/students/{sample_student.id}",
        json=data,
    )

    assert response.status_code == 200
    result = response.json()
    assert result["display_name"] == "Updated Student Name"


@pytest.mark.asyncio
async def test_delete_student(
    authenticated_client: AsyncClient,
    sample_user,
    sample_framework,
    db_session,
):
    """Test deleting a student."""
    # Create a student to delete
    from app.models.student import Student

    student = Student(
        id=uuid.uuid4(),
        parent_id=sample_user.id,
        display_name="To Delete",
        grade_level=5,
        school_stage="S3",
        framework_id=sample_framework.id,
    )
    db_session.add(student)
    await db_session.commit()

    response = await authenticated_client.delete(f"/api/v1/students/{student.id}")

    assert response.status_code == 204

    # Verify deleted
    get_response = await authenticated_client.get(f"/api/v1/students/{student.id}")
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_complete_onboarding(authenticated_client: AsyncClient, sample_student):
    """Test marking onboarding as complete."""
    response = await authenticated_client.post(
        f"/api/v1/students/{sample_student.id}/onboarding/complete"
    )

    assert response.status_code == 200
    result = response.json()
    assert result["onboarding_completed"] is True


@pytest.mark.asyncio
async def test_record_activity(authenticated_client: AsyncClient, sample_student):
    """Test recording student activity."""
    response = await authenticated_client.post(
        f"/api/v1/students/{sample_student.id}/activity"
    )

    assert response.status_code == 200
    result = response.json()
    assert result["last_active_at"] is not None
