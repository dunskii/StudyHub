"""Tests for CurriculumService."""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.curriculum_service import CurriculumService


class TestCurriculumServiceQueryOutcomes:
    """Tests for CurriculumService.query_outcomes method."""

    @pytest.mark.asyncio
    async def test_query_outcomes_by_framework(
        self, db_session: AsyncSession, sample_framework, sample_outcomes: list
    ) -> None:
        """Test query_outcomes filters by framework (CRITICAL)."""
        service = CurriculumService(db_session)
        outcomes = await service.query_outcomes(framework_id=sample_framework.id)

        assert len(outcomes) == 5
        for outcome in outcomes:
            assert outcome.framework_id == sample_framework.id

    @pytest.mark.asyncio
    async def test_query_outcomes_by_subject(
        self, db_session: AsyncSession, sample_framework, sample_subject, sample_outcomes: list
    ) -> None:
        """Test query_outcomes filters by subject."""
        service = CurriculumService(db_session)
        outcomes = await service.query_outcomes(
            framework_id=sample_framework.id,
            subject_id=sample_subject.id,
        )

        assert len(outcomes) == 5
        for outcome in outcomes:
            assert outcome.subject_id == sample_subject.id

    @pytest.mark.asyncio
    async def test_query_outcomes_by_stage(
        self, db_session: AsyncSession, sample_framework, sample_outcomes: list
    ) -> None:
        """Test query_outcomes filters by stage."""
        service = CurriculumService(db_session)
        outcomes = await service.query_outcomes(
            framework_id=sample_framework.id,
            stage="S3",
        )

        assert len(outcomes) == 2
        for outcome in outcomes:
            assert outcome.stage == "S3"

    @pytest.mark.asyncio
    async def test_query_outcomes_by_pathway(
        self, db_session: AsyncSession, sample_framework, sample_outcomes: list
    ) -> None:
        """Test query_outcomes filters by pathway."""
        service = CurriculumService(db_session)
        outcomes = await service.query_outcomes(
            framework_id=sample_framework.id,
            pathway="5.1",
        )

        assert len(outcomes) == 1
        assert outcomes[0].pathway == "5.1"

    @pytest.mark.asyncio
    async def test_query_outcomes_search(
        self, db_session: AsyncSession, sample_framework, sample_outcomes: list
    ) -> None:
        """Test query_outcomes search functionality."""
        service = CurriculumService(db_session)
        outcomes = await service.query_outcomes(
            framework_id=sample_framework.id,
            search="multiplication",
        )

        assert len(outcomes) == 1
        assert "multiplication" in outcomes[0].description.lower()

    @pytest.mark.asyncio
    async def test_query_outcomes_pagination(
        self, db_session: AsyncSession, sample_framework, sample_outcomes: list
    ) -> None:
        """Test query_outcomes pagination."""
        service = CurriculumService(db_session)
        outcomes = await service.query_outcomes(
            framework_id=sample_framework.id,
            offset=2,
            limit=2,
        )

        assert len(outcomes) == 2


class TestCurriculumServiceCountOutcomes:
    """Tests for CurriculumService.count_outcomes method."""

    @pytest.mark.asyncio
    async def test_count_outcomes(
        self, db_session: AsyncSession, sample_framework, sample_outcomes: list
    ) -> None:
        """Test count_outcomes returns correct total."""
        service = CurriculumService(db_session)
        count = await service.count_outcomes(framework_id=sample_framework.id)

        assert count == 5

    @pytest.mark.asyncio
    async def test_count_outcomes_with_filters(
        self, db_session: AsyncSession, sample_framework, sample_outcomes: list
    ) -> None:
        """Test count_outcomes with stage filter."""
        service = CurriculumService(db_session)
        count = await service.count_outcomes(
            framework_id=sample_framework.id,
            stage="S3",
        )

        assert count == 2


class TestCurriculumServiceGetByCode:
    """Tests for CurriculumService.get_by_code method."""

    @pytest.mark.asyncio
    async def test_get_by_code_found(
        self, db_session: AsyncSession, sample_outcomes: list
    ) -> None:
        """Test get_by_code returns outcome when found."""
        service = CurriculumService(db_session)
        outcome = await service.get_by_code(
            outcome_code="MA3-RN-01",
            framework_code="NSW",
        )

        assert outcome is not None
        assert outcome.outcome_code == "MA3-RN-01"

    @pytest.mark.asyncio
    async def test_get_by_code_not_found(
        self, db_session: AsyncSession, sample_framework
    ) -> None:
        """Test get_by_code returns None when not found."""
        service = CurriculumService(db_session)
        outcome = await service.get_by_code(
            outcome_code="INVALID",
            framework_code="NSW",
        )

        assert outcome is None


class TestCurriculumServiceGetStrands:
    """Tests for CurriculumService.get_strands method."""

    @pytest.mark.asyncio
    async def test_get_strands(
        self, db_session: AsyncSession, sample_framework, sample_outcomes: list
    ) -> None:
        """Test get_strands returns distinct strands."""
        service = CurriculumService(db_session)
        strands = await service.get_strands(framework_id=sample_framework.id)

        assert "Number and Algebra" in strands

    @pytest.mark.asyncio
    async def test_get_strands_by_subject(
        self, db_session: AsyncSession, sample_framework, sample_subject, sample_outcomes: list
    ) -> None:
        """Test get_strands filters by subject."""
        service = CurriculumService(db_session)
        strands = await service.get_strands(
            framework_id=sample_framework.id,
            subject_id=sample_subject.id,
        )

        assert len(strands) >= 1


class TestCurriculumServiceGetStages:
    """Tests for CurriculumService.get_stages method."""

    @pytest.mark.asyncio
    async def test_get_stages(
        self, db_session: AsyncSession, sample_framework, sample_outcomes: list
    ) -> None:
        """Test get_stages returns distinct stages."""
        service = CurriculumService(db_session)
        stages = await service.get_stages(framework_id=sample_framework.id)

        assert "S3" in stages
        assert "S4" in stages
        assert "S5" in stages


class TestFrameworkIsolation:
    """Tests to verify framework isolation is properly enforced."""

    @pytest.mark.asyncio
    async def test_query_outcomes_requires_framework_id(
        self, db_session: AsyncSession, sample_framework, sample_outcomes: list
    ) -> None:
        """Test that framework_id is required for querying outcomes."""
        service = CurriculumService(db_session)

        # With framework_id, should find outcomes
        outcomes = await service.query_outcomes(framework_id=sample_framework.id)
        assert len(outcomes) == 5

        # Different framework ID should return empty
        import uuid
        outcomes = await service.query_outcomes(framework_id=uuid.uuid4())
        assert len(outcomes) == 0
