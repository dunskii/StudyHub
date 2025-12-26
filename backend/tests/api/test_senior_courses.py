"""Tests for senior course API endpoints."""
import pytest
from httpx import AsyncClient


class TestGetSeniorCourses:
    """Tests for GET /api/v1/senior-courses endpoint."""

    @pytest.mark.asyncio
    async def test_get_senior_courses_success(
        self, client: AsyncClient, sample_senior_courses: list
    ) -> None:
        """Test successful retrieval of senior courses."""
        response = await client.get("/api/v1/senior-courses")

        assert response.status_code == 200
        data = response.json()
        assert "courses" in data
        assert len(data["courses"]) == 4
        assert data["total"] == 4

    @pytest.mark.asyncio
    async def test_get_senior_courses_empty(
        self, client: AsyncClient, sample_framework
    ) -> None:
        """Test retrieval with no courses returns empty list."""
        response = await client.get("/api/v1/senior-courses")

        assert response.status_code == 200
        data = response.json()
        assert data["courses"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_get_senior_courses_invalid_framework(
        self, client: AsyncClient
    ) -> None:
        """Test retrieval with invalid framework returns 404."""
        response = await client.get(
            "/api/v1/senior-courses?framework_code=INVALID"
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_senior_courses_filter_by_subject(
        self, client: AsyncClient, sample_subject, sample_senior_courses: list
    ) -> None:
        """Test filtering courses by subject ID."""
        response = await client.get(
            f"/api/v1/senior-courses?subject_id={sample_subject.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["courses"]) == 4

    @pytest.mark.asyncio
    async def test_get_senior_courses_pagination(
        self, client: AsyncClient, sample_senior_courses: list
    ) -> None:
        """Test pagination works correctly."""
        response = await client.get("/api/v1/senior-courses?page=1&page_size=2")

        assert response.status_code == 200
        data = response.json()
        assert len(data["courses"]) == 2
        assert data["total"] == 4
        assert data["has_next"] is True


class TestGetAtarCourses:
    """Tests for GET /api/v1/senior-courses/atar endpoint."""

    @pytest.mark.asyncio
    async def test_get_atar_courses_success(
        self, client: AsyncClient, sample_senior_courses: list
    ) -> None:
        """Test successful retrieval of ATAR-eligible courses."""
        response = await client.get("/api/v1/senior-courses/atar")

        assert response.status_code == 200
        data = response.json()
        assert "courses" in data
        # 3 ATAR courses: Standard 2, Advanced, Extension 1
        assert len(data["courses"]) == 3
        for course in data["courses"]:
            assert course["is_atar"] is True

    @pytest.mark.asyncio
    async def test_get_atar_courses_invalid_framework(
        self, client: AsyncClient
    ) -> None:
        """Test retrieval with invalid framework returns 404."""
        response = await client.get(
            "/api/v1/senior-courses/atar?framework_code=INVALID"
        )

        assert response.status_code == 404


class TestGetSeniorCourseById:
    """Tests for GET /api/v1/senior-courses/{course_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_senior_course_by_id_success(
        self, client: AsyncClient, sample_senior_course
    ) -> None:
        """Test successful retrieval of course by ID."""
        response = await client.get(
            f"/api/v1/senior-courses/{sample_senior_course.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_senior_course.id)
        assert data["code"] == "HSC_MATH_ADV"

    @pytest.mark.asyncio
    async def test_get_senior_course_by_id_not_found(
        self, client: AsyncClient, sample_framework
    ) -> None:
        """Test 404 when course not found."""
        import uuid
        fake_id = uuid.uuid4()
        response = await client.get(f"/api/v1/senior-courses/{fake_id}")

        assert response.status_code == 404


class TestGetSeniorCourseByCode:
    """Tests for GET /api/v1/senior-courses/code/{code} endpoint."""

    @pytest.mark.asyncio
    async def test_get_senior_course_by_code_success(
        self, client: AsyncClient, sample_senior_course
    ) -> None:
        """Test successful retrieval of course by code."""
        response = await client.get("/api/v1/senior-courses/code/HSC_MATH_ADV")

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "HSC_MATH_ADV"
        assert data["name"] == "Mathematics Advanced"

    @pytest.mark.asyncio
    async def test_get_senior_course_by_code_not_found(
        self, client: AsyncClient, sample_framework
    ) -> None:
        """Test 404 when course code not found."""
        response = await client.get("/api/v1/senior-courses/code/INVALID")

        assert response.status_code == 404


class TestGetCoursesBySubject:
    """Tests for GET /api/v1/senior-courses/subject/{subject_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_courses_by_subject_success(
        self, client: AsyncClient, sample_subject, sample_senior_courses: list
    ) -> None:
        """Test successful retrieval of courses by subject."""
        response = await client.get(
            f"/api/v1/senior-courses/subject/{sample_subject.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 4

    @pytest.mark.asyncio
    async def test_get_courses_by_subject_empty(
        self, client: AsyncClient, sample_subject
    ) -> None:
        """Test empty list when subject has no courses."""
        response = await client.get(
            f"/api/v1/senior-courses/subject/{sample_subject.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data == []


class TestSeniorCourseFrameworkIsolation:
    """Tests to verify framework isolation is enforced."""

    @pytest.mark.asyncio
    async def test_courses_require_valid_framework(
        self, client: AsyncClient
    ) -> None:
        """Test that courses endpoint requires valid framework."""
        response = await client.get(
            "/api/v1/senior-courses?framework_code=NONEXISTENT"
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_course_by_code_respects_framework(
        self, client: AsyncClient, sample_senior_course
    ) -> None:
        """Test that course lookup respects framework isolation."""
        # Should find course in NSW framework
        response = await client.get(
            "/api/v1/senior-courses/code/HSC_MATH_ADV?framework_code=NSW"
        )
        assert response.status_code == 200

        # Should not find course in different framework
        response = await client.get(
            "/api/v1/senior-courses/code/HSC_MATH_ADV?framework_code=VIC"
        )
        assert response.status_code == 404
