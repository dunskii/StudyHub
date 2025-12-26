"""Subject service for subject operations."""
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.curriculum_framework import CurriculumFramework
from app.models.curriculum_outcome import CurriculumOutcome
from app.models.subject import Subject
from app.schemas.subject import SubjectCreate, SubjectUpdate


class SubjectService:
    """Service for subject operations."""

    def __init__(self, db: AsyncSession):
        """Initialise with database session."""
        self.db = db

    async def get_all(
        self,
        framework_id: UUID | None = None,
        active_only: bool = True,
        offset: int = 0,
        limit: int | None = None,
    ) -> list[Subject]:
        """Get all subjects with optional filtering.

        Args:
            framework_id: Filter by framework ID.
            active_only: If True, only return active subjects.
            offset: Number of records to skip.
            limit: Maximum number of records to return.

        Returns:
            List of subjects.
        """
        query = select(Subject).order_by(Subject.display_order, Subject.name)

        if framework_id:
            query = query.where(Subject.framework_id == framework_id)

        if active_only:
            query = query.where(Subject.is_active.is_(True))

        if offset > 0:
            query = query.offset(offset)

        if limit is not None:
            query = query.limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(
        self,
        framework_id: UUID | None = None,
        active_only: bool = True,
    ) -> int:
        """Count total number of subjects.

        Args:
            framework_id: Filter by framework ID.
            active_only: If True, only count active subjects.

        Returns:
            Total count.
        """
        query = select(func.count()).select_from(Subject)

        if framework_id:
            query = query.where(Subject.framework_id == framework_id)

        if active_only:
            query = query.where(Subject.is_active.is_(True))

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_by_id(self, subject_id: UUID) -> Subject | None:
        """Get a subject by ID.

        Args:
            subject_id: The subject UUID.

        Returns:
            The subject or None if not found.
        """
        result = await self.db.execute(
            select(Subject).where(Subject.id == subject_id)
        )
        return result.scalar_one_or_none()

    async def get_by_code(
        self,
        code: str,
        framework_id: UUID | None = None,
        framework_code: str = "NSW",
    ) -> Subject | None:
        """Get a subject by code.

        CRITICAL: Must filter by framework to ensure isolation.

        Args:
            code: The subject code (e.g., 'MATH').
            framework_id: The framework UUID (preferred).
            framework_code: The framework code (fallback, e.g., 'NSW').

        Returns:
            The subject or None if not found.
        """
        query = select(Subject).where(Subject.code == code.upper())

        if framework_id:
            query = query.where(Subject.framework_id == framework_id)
        else:
            # Fallback: lookup framework by code
            query = query.join(CurriculumFramework).where(
                CurriculumFramework.code == framework_code.upper()
            )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_framework(
        self,
        framework_id: UUID | None = None,
        framework_code: str = "NSW",
        active_only: bool = True,
    ) -> list[Subject]:
        """Get all subjects for a framework.

        CRITICAL: Framework isolation - subjects are scoped to framework.

        Args:
            framework_id: The framework UUID (preferred).
            framework_code: The framework code (fallback, e.g., 'NSW').
            active_only: If True, only return active subjects.

        Returns:
            List of subjects for the framework.
        """
        query = select(Subject).order_by(Subject.display_order, Subject.name)

        if framework_id:
            query = query.where(Subject.framework_id == framework_id)
        else:
            # Fallback: lookup by framework code
            query = query.join(CurriculumFramework).where(
                CurriculumFramework.code == framework_code.upper()
            )

        if active_only:
            query = query.where(Subject.is_active.is_(True))

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_with_outcomes(
        self,
        subject_id: UUID,
        stage: str | None = None,
        strand: str | None = None,
        pathway: str | None = None,
    ) -> Subject | None:
        """Get a subject with its curriculum outcomes.

        Args:
            subject_id: The subject UUID.
            stage: Optional stage filter for outcomes.
            strand: Optional strand filter for outcomes.
            pathway: Optional pathway filter for outcomes.

        Returns:
            The subject with outcomes loaded, or None if not found.
        """
        # First get the subject
        result = await self.db.execute(
            select(Subject)
            .options(selectinload(Subject.outcomes))
            .where(Subject.id == subject_id)
        )
        subject = result.scalar_one_or_none()

        if not subject:
            return None

        # If filters are applied, we need to filter the outcomes
        if stage or strand or pathway:
            query = (
                select(CurriculumOutcome)
                .where(CurriculumOutcome.subject_id == subject_id)
                .order_by(CurriculumOutcome.display_order)
            )

            if stage:
                query = query.where(CurriculumOutcome.stage == stage)
            if strand:
                query = query.where(CurriculumOutcome.strand == strand)
            if pathway:
                query = query.where(CurriculumOutcome.pathway == pathway)

            outcomes_result = await self.db.execute(query)
            subject.outcomes = list(outcomes_result.scalars().all())

        return subject

    async def get_framework_id_by_code(self, framework_code: str) -> UUID | None:
        """Get framework ID from code.

        Args:
            framework_code: The framework code (e.g., 'NSW').

        Returns:
            The framework UUID or None if not found.
        """
        result = await self.db.execute(
            select(CurriculumFramework.id).where(
                CurriculumFramework.code == framework_code.upper()
            )
        )
        return result.scalar_one_or_none()

    async def create(self, data: SubjectCreate) -> Subject:
        """Create a new subject.

        Args:
            data: The subject creation data.

        Returns:
            The created subject.
        """
        subject = Subject(
            framework_id=data.framework_id,
            code=data.code.upper(),
            name=data.name,
            kla=data.kla,
            description=data.description,
            icon=data.icon,
            color=data.color,
            available_stages=data.available_stages,
            config=data.config.model_dump(),
            display_order=data.display_order,
            is_active=data.is_active,
        )

        self.db.add(subject)
        await self.db.commit()
        await self.db.refresh(subject)
        return subject

    async def update(
        self, subject_id: UUID, data: SubjectUpdate
    ) -> Subject | None:
        """Update a subject.

        Args:
            subject_id: The subject UUID.
            data: The update data.

        Returns:
            The updated subject or None if not found.
        """
        subject = await self.get_by_id(subject_id)
        if not subject:
            return None

        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(subject, field, value)

        await self.db.commit()
        await self.db.refresh(subject)
        return subject

    async def delete(self, subject_id: UUID) -> bool:
        """Delete a subject.

        Args:
            subject_id: The subject UUID.

        Returns:
            True if deleted, False if not found.
        """
        subject = await self.get_by_id(subject_id)
        if not subject:
            return False

        await self.db.delete(subject)
        await self.db.commit()
        return True
