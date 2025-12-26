"""Tests for SubjectService."""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.subject_service import SubjectService


class TestSubjectServiceGetAll:
    """Tests for SubjectService.get_all method."""

    @pytest.mark.asyncio
    async def test_get_all_returns_subjects(
        self, db_session: AsyncSession, sample_subjects: list
    ) -> None:
        """Test get_all returns all subjects."""
        service = SubjectService(db_session)
        subjects = await service.get_all()

        assert len(subjects) == 3

    @pytest.mark.asyncio
    async def test_get_all_filters_by_framework(
        self, db_session: AsyncSession, sample_framework, sample_subjects: list
    ) -> None:
        """Test get_all filters by framework_id."""
        service = SubjectService(db_session)
        subjects = await service.get_all(framework_id=sample_framework.id)

        assert len(subjects) == 3
        for subject in subjects:
            assert subject.framework_id == sample_framework.id

    @pytest.mark.asyncio
    async def test_get_all_respects_limit(
        self, db_session: AsyncSession, sample_subjects: list
    ) -> None:
        """Test get_all respects limit parameter."""
        service = SubjectService(db_session)
        subjects = await service.get_all(limit=2)

        assert len(subjects) == 2

    @pytest.mark.asyncio
    async def test_get_all_respects_offset(
        self, db_session: AsyncSession, sample_subjects: list
    ) -> None:
        """Test get_all respects offset parameter."""
        service = SubjectService(db_session)
        subjects = await service.get_all(offset=1)

        assert len(subjects) == 2


class TestSubjectServiceGetById:
    """Tests for SubjectService.get_by_id method."""

    @pytest.mark.asyncio
    async def test_get_by_id_found(
        self, db_session: AsyncSession, sample_subject
    ) -> None:
        """Test get_by_id returns subject when found."""
        service = SubjectService(db_session)
        subject = await service.get_by_id(sample_subject.id)

        assert subject is not None
        assert subject.id == sample_subject.id

    @pytest.mark.asyncio
    async def test_get_by_id_not_found(
        self, db_session: AsyncSession, sample_framework
    ) -> None:
        """Test get_by_id returns None when not found."""
        import uuid
        service = SubjectService(db_session)
        subject = await service.get_by_id(uuid.uuid4())

        assert subject is None


class TestSubjectServiceGetByCode:
    """Tests for SubjectService.get_by_code method."""

    @pytest.mark.asyncio
    async def test_get_by_code_found(
        self, db_session: AsyncSession, sample_subject
    ) -> None:
        """Test get_by_code returns subject when found."""
        service = SubjectService(db_session)
        subject = await service.get_by_code(code="MATH", framework_code="NSW")

        assert subject is not None
        assert subject.code == "MATH"

    @pytest.mark.asyncio
    async def test_get_by_code_case_insensitive(
        self, db_session: AsyncSession, sample_subject
    ) -> None:
        """Test get_by_code is case insensitive."""
        service = SubjectService(db_session)
        subject = await service.get_by_code(code="math", framework_code="nsw")

        assert subject is not None
        assert subject.code == "MATH"

    @pytest.mark.asyncio
    async def test_get_by_code_not_found(
        self, db_session: AsyncSession, sample_framework
    ) -> None:
        """Test get_by_code returns None when not found."""
        service = SubjectService(db_session)
        subject = await service.get_by_code(code="INVALID", framework_code="NSW")

        assert subject is None


class TestSubjectServiceCount:
    """Tests for SubjectService.count method."""

    @pytest.mark.asyncio
    async def test_count_all(
        self, db_session: AsyncSession, sample_subjects: list
    ) -> None:
        """Test count returns correct total."""
        service = SubjectService(db_session)
        count = await service.count()

        assert count == 3

    @pytest.mark.asyncio
    async def test_count_by_framework(
        self, db_session: AsyncSession, sample_framework, sample_subjects: list
    ) -> None:
        """Test count filters by framework."""
        service = SubjectService(db_session)
        count = await service.count(framework_id=sample_framework.id)

        assert count == 3


class TestSubjectServiceGetByFramework:
    """Tests for SubjectService.get_by_framework method."""

    @pytest.mark.asyncio
    async def test_get_by_framework_code(
        self, db_session: AsyncSession, sample_subjects: list
    ) -> None:
        """Test get_by_framework using framework code."""
        service = SubjectService(db_session)
        subjects = await service.get_by_framework(framework_code="NSW")

        assert len(subjects) == 3

    @pytest.mark.asyncio
    async def test_get_by_framework_id(
        self, db_session: AsyncSession, sample_framework, sample_subjects: list
    ) -> None:
        """Test get_by_framework using framework ID."""
        service = SubjectService(db_session)
        subjects = await service.get_by_framework(framework_id=sample_framework.id)

        assert len(subjects) == 3


class TestSubjectServiceGetWithOutcomes:
    """Tests for SubjectService.get_with_outcomes method."""

    @pytest.mark.asyncio
    async def test_get_with_outcomes(
        self, db_session: AsyncSession, sample_subject, sample_outcomes: list
    ) -> None:
        """Test get_with_outcomes loads outcomes."""
        service = SubjectService(db_session)
        subject = await service.get_with_outcomes(sample_subject.id)

        assert subject is not None
        assert len(subject.outcomes) == 5

    @pytest.mark.asyncio
    async def test_get_with_outcomes_filters_by_stage(
        self, db_session: AsyncSession, sample_subject, sample_outcomes: list
    ) -> None:
        """Test get_with_outcomes filters outcomes by stage."""
        service = SubjectService(db_session)
        subject = await service.get_with_outcomes(sample_subject.id, stage="S3")

        assert subject is not None
        assert len(subject.outcomes) == 2
        for outcome in subject.outcomes:
            assert outcome.stage == "S3"
