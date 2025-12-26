"""Tests for Student Subject API endpoints."""
import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_student_subjects_empty(
    authenticated_client: AsyncClient,
    sample_student,
):
    """Test getting enrolled subjects when none enrolled."""
    response = await authenticated_client.get(
        f"/api/v1/students/{sample_student.id}/subjects"
    )

    assert response.status_code == 200
    result = response.json()
    assert result["total"] == 0
    assert len(result["enrolments"]) == 0


@pytest.mark.asyncio
async def test_enrol_in_subject(
    authenticated_client: AsyncClient,
    sample_student,
    sample_subject,
):
    """Test enrolling a student in a subject."""
    data = {
        "subject_id": str(sample_subject.id),
    }

    response = await authenticated_client.post(
        f"/api/v1/students/{sample_student.id}/subjects",
        json=data,
    )

    assert response.status_code == 201
    result = response.json()
    assert result["subject_id"] == str(sample_subject.id)
    assert result["student_id"] == str(sample_student.id)


@pytest.mark.asyncio
async def test_enrol_in_subject_unauthenticated(
    client: AsyncClient,
    sample_student,
    sample_subject,
):
    """Test enrolling without auth returns 401."""
    data = {
        "subject_id": str(sample_subject.id),
    }

    response = await client.post(
        f"/api/v1/students/{sample_student.id}/subjects",
        json=data,
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_enrol_duplicate_fails(
    authenticated_client: AsyncClient,
    sample_student,
    sample_subject,
):
    """Test enrolling twice in same subject fails."""
    data = {
        "subject_id": str(sample_subject.id),
    }

    # First enrolment
    await authenticated_client.post(
        f"/api/v1/students/{sample_student.id}/subjects",
        json=data,
    )

    # Second enrolment should fail
    response = await authenticated_client.post(
        f"/api/v1/students/{sample_student.id}/subjects",
        json=data,
    )

    assert response.status_code == 422
    result = response.json()
    assert result["error_code"] == "ALREADY_ENROLLED"


@pytest.mark.asyncio
async def test_enrol_stage5_requires_pathway(
    authenticated_client: AsyncClient,
    sample_stage5_student,
    sample_subject,
):
    """Test Stage 5 student must provide pathway for subject with pathways."""
    data = {
        "subject_id": str(sample_subject.id),
        # No pathway provided
    }

    response = await authenticated_client.post(
        f"/api/v1/students/{sample_stage5_student.id}/subjects",
        json=data,
    )

    assert response.status_code == 422
    result = response.json()
    assert result["error_code"] == "PATHWAY_REQUIRED"


@pytest.mark.asyncio
async def test_enrol_stage5_with_pathway(
    authenticated_client: AsyncClient,
    sample_stage5_student,
    sample_subject,
):
    """Test Stage 5 student can enrol with valid pathway."""
    data = {
        "subject_id": str(sample_subject.id),
        "pathway": "5.2",
    }

    response = await authenticated_client.post(
        f"/api/v1/students/{sample_stage5_student.id}/subjects",
        json=data,
    )

    assert response.status_code == 201
    result = response.json()
    assert result["pathway"] == "5.2"


@pytest.mark.asyncio
async def test_bulk_enrol(
    authenticated_client: AsyncClient,
    sample_student,
    sample_subjects,
):
    """Test bulk enrolling in multiple subjects."""
    data = {
        "enrolments": [
            {"subject_id": str(sample_subjects[0].id)},
            {"subject_id": str(sample_subjects[1].id)},
        ],
    }

    response = await authenticated_client.post(
        f"/api/v1/students/{sample_student.id}/subjects/bulk",
        json=data,
    )

    assert response.status_code == 201
    result = response.json()
    assert len(result["successful"]) == 2
    assert len(result["failed"]) == 0


@pytest.mark.asyncio
async def test_bulk_enrol_partial_failure(
    authenticated_client: AsyncClient,
    sample_student,
    sample_subject,
):
    """Test bulk enrolment with some failures."""
    # First enrol in one subject
    await authenticated_client.post(
        f"/api/v1/students/{sample_student.id}/subjects",
        json={"subject_id": str(sample_subject.id)},
    )

    # Try to bulk enrol including the already enrolled subject
    data = {
        "enrolments": [
            {"subject_id": str(sample_subject.id)},  # Already enrolled
            {"subject_id": str(uuid.uuid4())},  # Non-existent
        ],
    }

    response = await authenticated_client.post(
        f"/api/v1/students/{sample_student.id}/subjects/bulk",
        json=data,
    )

    assert response.status_code == 201
    result = response.json()
    assert len(result["successful"]) == 0
    assert len(result["failed"]) == 2


@pytest.mark.asyncio
async def test_unenrol_from_subject(
    authenticated_client: AsyncClient,
    sample_student,
    sample_subject,
):
    """Test unenrolling from a subject."""
    # First enrol
    await authenticated_client.post(
        f"/api/v1/students/{sample_student.id}/subjects",
        json={"subject_id": str(sample_subject.id)},
    )

    # Then unenrol
    response = await authenticated_client.delete(
        f"/api/v1/students/{sample_student.id}/subjects/{sample_subject.id}"
    )

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_unenrol_not_enrolled(
    authenticated_client: AsyncClient,
    sample_student,
    sample_subject,
):
    """Test unenrolling when not enrolled returns 404."""
    response = await authenticated_client.delete(
        f"/api/v1/students/{sample_student.id}/subjects/{sample_subject.id}"
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_enrolment_pathway(
    authenticated_client: AsyncClient,
    sample_stage5_student,
    sample_subject,
):
    """Test updating an enrolment's pathway."""
    # First enrol with 5.1
    await authenticated_client.post(
        f"/api/v1/students/{sample_stage5_student.id}/subjects",
        json={"subject_id": str(sample_subject.id), "pathway": "5.1"},
    )

    # Update to 5.3
    response = await authenticated_client.put(
        f"/api/v1/students/{sample_stage5_student.id}/subjects/{sample_subject.id}",
        json={"pathway": "5.3"},
    )

    assert response.status_code == 200
    result = response.json()
    assert result["pathway"] == "5.3"


@pytest.mark.asyncio
async def test_update_progress(
    authenticated_client: AsyncClient,
    sample_student,
    sample_subject,
):
    """Test updating subject progress."""
    # First enrol
    await authenticated_client.post(
        f"/api/v1/students/{sample_student.id}/subjects",
        json={"subject_id": str(sample_subject.id)},
    )

    # Update progress
    response = await authenticated_client.put(
        f"/api/v1/students/{sample_student.id}/subjects/{sample_subject.id}/progress",
        json={
            "outcomesCompleted": ["MA3-RN-01"],
            "overallPercentage": 25,
            "xpEarned": 50,
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["progress"]["overallPercentage"] == 25
    assert result["progress"]["xpEarned"] == 50


@pytest.mark.asyncio
async def test_complete_outcome(
    authenticated_client: AsyncClient,
    sample_student,
    sample_subject,
):
    """Test completing an outcome."""
    # First enrol
    await authenticated_client.post(
        f"/api/v1/students/{sample_student.id}/subjects",
        json={"subject_id": str(sample_subject.id)},
    )

    # Complete an outcome
    response = await authenticated_client.post(
        f"/api/v1/students/{sample_student.id}/subjects/{sample_subject.id}/outcomes/MA3-RN-01/complete"
    )

    assert response.status_code == 200
    result = response.json()
    assert "MA3-RN-01" in result["progress"]["outcomesCompleted"]
    assert result["progress"]["xpEarned"] == 10  # Default XP award


@pytest.mark.asyncio
async def test_get_enrolled_subjects_with_details(
    authenticated_client: AsyncClient,
    sample_student,
    sample_subject,
):
    """Test getting enrolled subjects includes subject details."""
    # Enrol in subject
    await authenticated_client.post(
        f"/api/v1/students/{sample_student.id}/subjects",
        json={"subject_id": str(sample_subject.id)},
    )

    # Get subjects
    response = await authenticated_client.get(
        f"/api/v1/students/{sample_student.id}/subjects"
    )

    assert response.status_code == 200
    result = response.json()
    assert result["total"] == 1
    assert result["enrolments"][0]["subject"]["code"] == "MATH"
    assert result["enrolments"][0]["subject"]["name"] == "Mathematics"
