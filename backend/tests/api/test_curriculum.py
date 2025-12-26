"""Tests for curriculum API endpoints."""
import pytest
from httpx import AsyncClient


class TestGetOutcomes:
    """Tests for GET /api/v1/curriculum/outcomes endpoint."""

    @pytest.mark.asyncio
    async def test_get_outcomes_success(
        self, client: AsyncClient, sample_outcomes: list
    ) -> None:
        """Test successful retrieval of curriculum outcomes."""
        response = await client.get("/api/v1/curriculum/outcomes")

        assert response.status_code == 200
        data = response.json()
        assert "outcomes" in data
        assert len(data["outcomes"]) == 5
        assert data["total"] == 5

    @pytest.mark.asyncio
    async def test_get_outcomes_empty(
        self, client: AsyncClient, sample_framework
    ) -> None:
        """Test retrieval with no outcomes returns empty list."""
        response = await client.get("/api/v1/curriculum/outcomes")

        assert response.status_code == 200
        data = response.json()
        assert data["outcomes"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_get_outcomes_invalid_framework(
        self, client: AsyncClient
    ) -> None:
        """Test retrieval with invalid framework returns 404."""
        response = await client.get(
            "/api/v1/curriculum/outcomes?framework_code=INVALID"
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_outcomes_filter_by_stage(
        self, client: AsyncClient, sample_outcomes: list
    ) -> None:
        """Test filtering outcomes by stage."""
        response = await client.get("/api/v1/curriculum/outcomes?stage=S3")

        assert response.status_code == 200
        data = response.json()
        assert len(data["outcomes"]) == 2
        for outcome in data["outcomes"]:
            assert outcome["stage"] == "S3"

    @pytest.mark.asyncio
    async def test_get_outcomes_filter_by_subject(
        self, client: AsyncClient, sample_subject, sample_outcomes: list
    ) -> None:
        """Test filtering outcomes by subject ID."""
        response = await client.get(
            f"/api/v1/curriculum/outcomes?subject_id={sample_subject.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["outcomes"]) == 5
        for outcome in data["outcomes"]:
            assert outcome["subject_id"] == str(sample_subject.id)

    @pytest.mark.asyncio
    async def test_get_outcomes_filter_by_pathway(
        self, client: AsyncClient, sample_outcomes: list
    ) -> None:
        """Test filtering outcomes by pathway."""
        response = await client.get("/api/v1/curriculum/outcomes?pathway=5.2")

        assert response.status_code == 200
        data = response.json()
        assert len(data["outcomes"]) == 1
        assert data["outcomes"][0]["pathway"] == "5.2"

    @pytest.mark.asyncio
    async def test_get_outcomes_search(
        self, client: AsyncClient, sample_outcomes: list
    ) -> None:
        """Test searching outcomes by description."""
        response = await client.get(
            "/api/v1/curriculum/outcomes?search=integers"
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["outcomes"]) == 1
        assert "integers" in data["outcomes"][0]["description"].lower()

    @pytest.mark.asyncio
    async def test_get_outcomes_pagination(
        self, client: AsyncClient, sample_outcomes: list
    ) -> None:
        """Test pagination works correctly."""
        response = await client.get(
            "/api/v1/curriculum/outcomes?page=1&page_size=2"
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["outcomes"]) == 2
        assert data["total"] == 5
        assert data["has_next"] is True


class TestGetOutcomeByCode:
    """Tests for GET /api/v1/curriculum/outcomes/{outcome_code} endpoint."""

    @pytest.mark.asyncio
    async def test_get_outcome_by_code_success(
        self, client: AsyncClient, sample_outcomes: list
    ) -> None:
        """Test successful retrieval of outcome by code."""
        response = await client.get("/api/v1/curriculum/outcomes/MA3-RN-01")

        assert response.status_code == 200
        data = response.json()
        assert data["outcome_code"] == "MA3-RN-01"
        assert data["stage"] == "S3"

    @pytest.mark.asyncio
    async def test_get_outcome_by_code_not_found(
        self, client: AsyncClient, sample_framework
    ) -> None:
        """Test 404 when outcome code not found."""
        response = await client.get("/api/v1/curriculum/outcomes/INVALID-CODE")

        assert response.status_code == 404


class TestGetOutcomeById:
    """Tests for GET /api/v1/curriculum/outcomes/id/{outcome_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_outcome_by_id_success(
        self, client: AsyncClient, sample_outcomes: list
    ) -> None:
        """Test successful retrieval of outcome by ID."""
        outcome = sample_outcomes[0]
        response = await client.get(f"/api/v1/curriculum/outcomes/id/{outcome.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(outcome.id)
        assert data["outcome_code"] == outcome.outcome_code

    @pytest.mark.asyncio
    async def test_get_outcome_by_id_not_found(
        self, client: AsyncClient, sample_framework
    ) -> None:
        """Test 404 when outcome ID not found."""
        import uuid
        fake_id = uuid.uuid4()
        response = await client.get(f"/api/v1/curriculum/outcomes/id/{fake_id}")

        assert response.status_code == 404


class TestGetStrands:
    """Tests for GET /api/v1/curriculum/strands endpoint."""

    @pytest.mark.asyncio
    async def test_get_strands_success(
        self, client: AsyncClient, sample_outcomes: list
    ) -> None:
        """Test successful retrieval of strands."""
        response = await client.get("/api/v1/curriculum/strands")

        assert response.status_code == 200
        data = response.json()
        assert "strands" in data
        assert "Number and Algebra" in data["strands"]

    @pytest.mark.asyncio
    async def test_get_strands_empty(
        self, client: AsyncClient, sample_framework
    ) -> None:
        """Test retrieval with no outcomes returns empty strands."""
        response = await client.get("/api/v1/curriculum/strands")

        assert response.status_code == 200
        data = response.json()
        assert data["strands"] == []

    @pytest.mark.asyncio
    async def test_get_strands_by_subject(
        self, client: AsyncClient, sample_subject, sample_outcomes: list
    ) -> None:
        """Test filtering strands by subject."""
        response = await client.get(
            f"/api/v1/curriculum/strands?subject_id={sample_subject.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["subject_id"] == str(sample_subject.id)


class TestGetStages:
    """Tests for GET /api/v1/curriculum/stages endpoint."""

    @pytest.mark.asyncio
    async def test_get_stages_success(
        self, client: AsyncClient, sample_outcomes: list
    ) -> None:
        """Test successful retrieval of stages."""
        response = await client.get("/api/v1/curriculum/stages")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert "S3" in data
        assert "S4" in data
        assert "S5" in data

    @pytest.mark.asyncio
    async def test_get_stages_empty(
        self, client: AsyncClient, sample_framework
    ) -> None:
        """Test retrieval with no outcomes returns empty stages."""
        response = await client.get("/api/v1/curriculum/stages")

        assert response.status_code == 200
        data = response.json()
        assert data == []


class TestFrameworkIsolation:
    """Tests to verify framework isolation is enforced."""

    @pytest.mark.asyncio
    async def test_outcomes_require_valid_framework(
        self, client: AsyncClient
    ) -> None:
        """Test that outcomes endpoint requires valid framework."""
        response = await client.get(
            "/api/v1/curriculum/outcomes?framework_code=NONEXISTENT"
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_strands_require_valid_framework(
        self, client: AsyncClient
    ) -> None:
        """Test that strands endpoint requires valid framework."""
        response = await client.get(
            "/api/v1/curriculum/strands?framework_code=NONEXISTENT"
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_stages_require_valid_framework(
        self, client: AsyncClient
    ) -> None:
        """Test that stages endpoint requires valid framework."""
        response = await client.get(
            "/api/v1/curriculum/stages?framework_code=NONEXISTENT"
        )
        assert response.status_code == 404
