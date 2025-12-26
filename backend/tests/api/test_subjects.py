"""Tests for subject API endpoints."""
import pytest
from httpx import AsyncClient


class TestGetSubjects:
    """Tests for GET /api/v1/subjects endpoint."""

    @pytest.mark.asyncio
    async def test_get_subjects_success(
        self, client: AsyncClient, sample_subjects: list
    ) -> None:
        """Test successful retrieval of subjects."""
        response = await client.get("/api/v1/subjects")

        assert response.status_code == 200
        data = response.json()
        assert "subjects" in data
        assert len(data["subjects"]) == 3
        assert data["total"] == 3

    @pytest.mark.asyncio
    async def test_get_subjects_empty(
        self, client: AsyncClient, sample_framework
    ) -> None:
        """Test retrieval with no subjects returns empty list."""
        response = await client.get("/api/v1/subjects")

        assert response.status_code == 200
        data = response.json()
        assert data["subjects"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_get_subjects_invalid_framework(
        self, client: AsyncClient
    ) -> None:
        """Test retrieval with invalid framework returns 404."""
        response = await client.get("/api/v1/subjects?framework_code=INVALID")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_subjects_pagination(
        self, client: AsyncClient, sample_subjects: list
    ) -> None:
        """Test pagination works correctly."""
        response = await client.get("/api/v1/subjects?page=1&page_size=2")

        assert response.status_code == 200
        data = response.json()
        assert len(data["subjects"]) == 2
        assert data["total"] == 3
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert data["has_next"] is True

    @pytest.mark.asyncio
    async def test_get_subjects_sorted_by_display_order(
        self, client: AsyncClient, sample_subjects: list
    ) -> None:
        """Test subjects are sorted by display order."""
        response = await client.get("/api/v1/subjects")

        assert response.status_code == 200
        data = response.json()
        subjects = data["subjects"]
        # Should be sorted by display_order: MATH(1), ENG(2), SCI(3)
        assert subjects[0]["code"] == "MATH"
        assert subjects[1]["code"] == "ENG"
        assert subjects[2]["code"] == "SCI"


class TestGetSubjectById:
    """Tests for GET /api/v1/subjects/{subject_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_subject_by_id_success(
        self, client: AsyncClient, sample_subject
    ) -> None:
        """Test successful retrieval of subject by ID."""
        response = await client.get(f"/api/v1/subjects/{sample_subject.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_subject.id)
        assert data["code"] == "MATH"
        assert data["name"] == "Mathematics"

    @pytest.mark.asyncio
    async def test_get_subject_by_id_not_found(
        self, client: AsyncClient, sample_framework
    ) -> None:
        """Test 404 when subject not found."""
        import uuid
        fake_id = uuid.uuid4()
        response = await client.get(f"/api/v1/subjects/{fake_id}")

        assert response.status_code == 404


class TestGetSubjectByCode:
    """Tests for GET /api/v1/subjects/code/{code} endpoint."""

    @pytest.mark.asyncio
    async def test_get_subject_by_code_success(
        self, client: AsyncClient, sample_subject
    ) -> None:
        """Test successful retrieval of subject by code."""
        response = await client.get("/api/v1/subjects/code/MATH")

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "MATH"
        assert data["name"] == "Mathematics"

    @pytest.mark.asyncio
    async def test_get_subject_by_code_case_insensitive(
        self, client: AsyncClient, sample_subject
    ) -> None:
        """Test subject code lookup is case insensitive."""
        response = await client.get("/api/v1/subjects/code/math")

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "MATH"

    @pytest.mark.asyncio
    async def test_get_subject_by_code_not_found(
        self, client: AsyncClient, sample_framework
    ) -> None:
        """Test 404 when subject code not found."""
        response = await client.get("/api/v1/subjects/code/INVALID")

        assert response.status_code == 404


class TestGetSubjectOutcomes:
    """Tests for GET /api/v1/subjects/{subject_id}/outcomes endpoint."""

    @pytest.mark.asyncio
    async def test_get_subject_outcomes_success(
        self, client: AsyncClient, sample_subject, sample_outcomes: list
    ) -> None:
        """Test successful retrieval of subject outcomes."""
        response = await client.get(f"/api/v1/subjects/{sample_subject.id}/outcomes")

        assert response.status_code == 200
        data = response.json()
        assert "outcomes" in data
        assert len(data["outcomes"]) == 5
        assert data["total"] == 5

    @pytest.mark.asyncio
    async def test_get_subject_outcomes_filter_by_stage(
        self, client: AsyncClient, sample_subject, sample_outcomes: list
    ) -> None:
        """Test filtering outcomes by stage."""
        response = await client.get(
            f"/api/v1/subjects/{sample_subject.id}/outcomes?stage=S3"
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["outcomes"]) == 2  # MA3-RN-01 and MA3-MR-01
        for outcome in data["outcomes"]:
            assert outcome["stage"] == "S3"

    @pytest.mark.asyncio
    async def test_get_subject_outcomes_filter_by_pathway(
        self, client: AsyncClient, sample_subject, sample_outcomes: list
    ) -> None:
        """Test filtering outcomes by pathway."""
        response = await client.get(
            f"/api/v1/subjects/{sample_subject.id}/outcomes?pathway=5.1"
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["outcomes"]) == 1
        assert data["outcomes"][0]["pathway"] == "5.1"

    @pytest.mark.asyncio
    async def test_get_subject_outcomes_not_found(
        self, client: AsyncClient, sample_framework
    ) -> None:
        """Test 404 when subject not found."""
        import uuid
        fake_id = uuid.uuid4()
        response = await client.get(f"/api/v1/subjects/{fake_id}/outcomes")

        assert response.status_code == 404
