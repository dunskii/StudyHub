"""Curriculum service for curriculum outcome operations."""
from uuid import UUID

from sqlalchemy import distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.curriculum_framework import CurriculumFramework
from app.models.curriculum_outcome import CurriculumOutcome
from app.schemas.curriculum import OutcomeCreate, OutcomeUpdate


class CurriculumService:
    """Service for curriculum outcome operations.

    CRITICAL: All queries MUST filter by framework_id to ensure
    proper framework isolation. This prevents data leakage between
    different curriculum frameworks (NSW, VIC, etc.).
    """

    def __init__(self, db: AsyncSession):
        """Initialise with database session."""
        self.db = db

    @staticmethod
    def _escape_search_term(search: str) -> str:
        """Escape SQL LIKE wildcards in search terms.

        Prevents users from using % and _ as wildcards in search,
        ensuring literal matching of these characters.

        Args:
            search: The raw search term.

        Returns:
            Escaped search term safe for ILIKE queries.
        """
        # Escape backslash first, then wildcards
        escaped = search.replace("\\", "\\\\")
        escaped = escaped.replace("%", "\\%")
        escaped = escaped.replace("_", "\\_")
        return f"%{escaped}%"

    async def query_outcomes(
        self,
        framework_id: UUID,
        subject_id: UUID | None = None,
        stage: str | None = None,
        strand: str | None = None,
        pathway: str | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> list[CurriculumOutcome]:
        """Query curriculum outcomes with filtering.

        CRITICAL: framework_id is REQUIRED for framework isolation.

        Args:
            framework_id: The framework UUID (REQUIRED).
            subject_id: Optional filter by subject.
            stage: Optional filter by stage (e.g., 'S3', 'S4').
            strand: Optional filter by strand.
            pathway: Optional filter by pathway (e.g., '5.1', '5.2').
            search: Optional search term for code/description.
            offset: Number of records to skip.
            limit: Maximum number of records to return.

        Returns:
            List of curriculum outcomes.
        """
        query = (
            select(CurriculumOutcome)
            .where(CurriculumOutcome.framework_id == framework_id)
            .order_by(
                CurriculumOutcome.stage,
                CurriculumOutcome.strand,
                CurriculumOutcome.display_order,
            )
        )

        if subject_id:
            query = query.where(CurriculumOutcome.subject_id == subject_id)

        if stage:
            query = query.where(CurriculumOutcome.stage == stage)

        if strand:
            query = query.where(CurriculumOutcome.strand == strand)

        if pathway:
            query = query.where(CurriculumOutcome.pathway == pathway)

        if search:
            search_term = self._escape_search_term(search)
            query = query.where(
                or_(
                    CurriculumOutcome.outcome_code.ilike(search_term, escape="\\"),
                    CurriculumOutcome.description.ilike(search_term, escape="\\"),
                )
            )

        if offset > 0:
            query = query.offset(offset)

        query = query.limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_outcomes(
        self,
        framework_id: UUID,
        subject_id: UUID | None = None,
        stage: str | None = None,
        strand: str | None = None,
        pathway: str | None = None,
        search: str | None = None,
    ) -> int:
        """Count curriculum outcomes with filtering.

        CRITICAL: framework_id is REQUIRED for framework isolation.

        Args:
            framework_id: The framework UUID (REQUIRED).
            subject_id: Optional filter by subject.
            stage: Optional filter by stage.
            strand: Optional filter by strand.
            pathway: Optional filter by pathway.
            search: Optional search term.

        Returns:
            Total count.
        """
        query = (
            select(func.count())
            .select_from(CurriculumOutcome)
            .where(CurriculumOutcome.framework_id == framework_id)
        )

        if subject_id:
            query = query.where(CurriculumOutcome.subject_id == subject_id)

        if stage:
            query = query.where(CurriculumOutcome.stage == stage)

        if strand:
            query = query.where(CurriculumOutcome.strand == strand)

        if pathway:
            query = query.where(CurriculumOutcome.pathway == pathway)

        if search:
            search_term = self._escape_search_term(search)
            query = query.where(
                or_(
                    CurriculumOutcome.outcome_code.ilike(search_term, escape="\\"),
                    CurriculumOutcome.description.ilike(search_term, escape="\\"),
                )
            )

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_by_id(self, outcome_id: UUID) -> CurriculumOutcome | None:
        """Get an outcome by ID.

        Args:
            outcome_id: The outcome UUID.

        Returns:
            The outcome or None if not found.
        """
        result = await self.db.execute(
            select(CurriculumOutcome).where(CurriculumOutcome.id == outcome_id)
        )
        return result.scalar_one_or_none()

    async def get_by_code(
        self,
        outcome_code: str,
        framework_id: UUID | None = None,
        framework_code: str = "NSW",
    ) -> CurriculumOutcome | None:
        """Get an outcome by code.

        CRITICAL: Must filter by framework to ensure isolation.

        Args:
            outcome_code: The outcome code (e.g., 'MA3-RN-01').
            framework_id: The framework UUID (preferred).
            framework_code: The framework code (fallback, e.g., 'NSW').

        Returns:
            The outcome or None if not found.
        """
        query = select(CurriculumOutcome).where(
            CurriculumOutcome.outcome_code == outcome_code
        )

        if framework_id:
            query = query.where(CurriculumOutcome.framework_id == framework_id)
        else:
            # Fallback: lookup framework by code
            query = query.join(CurriculumFramework).where(
                CurriculumFramework.code == framework_code.upper()
            )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_subject_outcomes(
        self,
        subject_id: UUID,
        stage: str | None = None,
        strand: str | None = None,
        pathway: str | None = None,
    ) -> list[CurriculumOutcome]:
        """Get all outcomes for a subject.

        Args:
            subject_id: The subject UUID.
            stage: Optional filter by stage.
            strand: Optional filter by strand.
            pathway: Optional filter by pathway.

        Returns:
            List of outcomes for the subject.
        """
        query = (
            select(CurriculumOutcome)
            .where(CurriculumOutcome.subject_id == subject_id)
            .order_by(
                CurriculumOutcome.stage,
                CurriculumOutcome.strand,
                CurriculumOutcome.display_order,
            )
        )

        if stage:
            query = query.where(CurriculumOutcome.stage == stage)

        if strand:
            query = query.where(CurriculumOutcome.strand == strand)

        if pathway:
            query = query.where(CurriculumOutcome.pathway == pathway)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_strands(
        self,
        framework_id: UUID,
        subject_id: UUID | None = None,
    ) -> list[str]:
        """Get distinct strands for a framework/subject.

        CRITICAL: framework_id is REQUIRED for framework isolation.

        Args:
            framework_id: The framework UUID (REQUIRED).
            subject_id: Optional filter by subject.

        Returns:
            List of distinct strand names.
        """
        query = (
            select(distinct(CurriculumOutcome.strand))
            .where(CurriculumOutcome.framework_id == framework_id)
            .where(CurriculumOutcome.strand.is_not(None))
            .order_by(CurriculumOutcome.strand)
        )

        if subject_id:
            query = query.where(CurriculumOutcome.subject_id == subject_id)

        result = await self.db.execute(query)
        return [row[0] for row in result.all() if row[0]]

    async def get_stages(
        self,
        framework_id: UUID,
        subject_id: UUID | None = None,
    ) -> list[str]:
        """Get distinct stages for a framework/subject.

        CRITICAL: framework_id is REQUIRED for framework isolation.

        Args:
            framework_id: The framework UUID (REQUIRED).
            subject_id: Optional filter by subject.

        Returns:
            List of distinct stage names.
        """
        query = (
            select(distinct(CurriculumOutcome.stage))
            .where(CurriculumOutcome.framework_id == framework_id)
            .order_by(CurriculumOutcome.stage)
        )

        if subject_id:
            query = query.where(CurriculumOutcome.subject_id == subject_id)

        result = await self.db.execute(query)
        return [row[0] for row in result.all()]

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

    async def create(self, data: OutcomeCreate) -> CurriculumOutcome:
        """Create a new curriculum outcome.

        Args:
            data: The outcome creation data.

        Returns:
            The created outcome.
        """
        outcome = CurriculumOutcome(
            framework_id=data.framework_id,
            subject_id=data.subject_id,
            outcome_code=data.outcome_code,
            description=data.description,
            stage=data.stage,
            strand=data.strand,
            substrand=data.substrand,
            pathway=data.pathway,
            content_descriptors=data.content_descriptors,
            elaborations=data.elaborations,
            prerequisites=data.prerequisites,
            display_order=data.display_order,
        )

        self.db.add(outcome)
        await self.db.commit()
        await self.db.refresh(outcome)
        return outcome

    async def update(
        self, outcome_id: UUID, data: OutcomeUpdate
    ) -> CurriculumOutcome | None:
        """Update a curriculum outcome.

        Args:
            outcome_id: The outcome UUID.
            data: The update data.

        Returns:
            The updated outcome or None if not found.
        """
        outcome = await self.get_by_id(outcome_id)
        if not outcome:
            return None

        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(outcome, field, value)

        await self.db.commit()
        await self.db.refresh(outcome)
        return outcome

    async def delete(self, outcome_id: UUID) -> bool:
        """Delete a curriculum outcome.

        Args:
            outcome_id: The outcome UUID.

        Returns:
            True if deleted, False if not found.
        """
        outcome = await self.get_by_id(outcome_id)
        if not outcome:
            return False

        await self.db.delete(outcome)
        await self.db.commit()
        return True
