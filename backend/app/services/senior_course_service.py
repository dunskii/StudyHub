"""Senior course service for HSC/senior course operations."""
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.curriculum_framework import CurriculumFramework
from app.models.senior_course import SeniorCourse
from app.schemas.senior_course import SeniorCourseCreate, SeniorCourseUpdate


class SeniorCourseService:
    """Service for senior course operations.

    CRITICAL: All queries MUST filter by framework_id to ensure
    proper framework isolation. This prevents data leakage between
    different curriculum frameworks (NSW HSC, VIC VCE, etc.).
    """

    def __init__(self, db: AsyncSession):
        """Initialise with database session."""
        self.db = db

    async def get_all(
        self,
        framework_id: UUID | None = None,
        framework_code: str = "NSW",
        subject_id: UUID | None = None,
        active_only: bool = True,
        offset: int = 0,
        limit: int | None = None,
    ) -> list[SeniorCourse]:
        """Get all senior courses with optional filtering.

        Args:
            framework_id: Filter by framework ID (preferred).
            framework_code: Filter by framework code (fallback).
            subject_id: Optional filter by subject.
            active_only: If True, only return active courses.
            offset: Number of records to skip.
            limit: Maximum number of records to return.

        Returns:
            List of senior courses.
        """
        query = select(SeniorCourse).order_by(
            SeniorCourse.display_order, SeniorCourse.name
        )

        if framework_id:
            query = query.where(SeniorCourse.framework_id == framework_id)
        else:
            # Fallback: lookup by framework code
            query = query.join(CurriculumFramework).where(
                CurriculumFramework.code == framework_code.upper()
            )

        if subject_id:
            query = query.where(SeniorCourse.subject_id == subject_id)

        if active_only:
            query = query.where(SeniorCourse.is_active.is_(True))

        if offset > 0:
            query = query.offset(offset)

        if limit is not None:
            query = query.limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(
        self,
        framework_id: UUID | None = None,
        framework_code: str = "NSW",
        subject_id: UUID | None = None,
        active_only: bool = True,
    ) -> int:
        """Count total number of senior courses.

        Args:
            framework_id: Filter by framework ID (preferred).
            framework_code: Filter by framework code (fallback).
            subject_id: Optional filter by subject.
            active_only: If True, only count active courses.

        Returns:
            Total count.
        """
        query = select(func.count()).select_from(SeniorCourse)

        if framework_id:
            query = query.where(SeniorCourse.framework_id == framework_id)
        else:
            # Fallback: lookup by framework code
            subquery = select(CurriculumFramework.id).where(
                CurriculumFramework.code == framework_code.upper()
            )
            query = query.where(SeniorCourse.framework_id.in_(subquery))

        if subject_id:
            query = query.where(SeniorCourse.subject_id == subject_id)

        if active_only:
            query = query.where(SeniorCourse.is_active.is_(True))

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_by_id(self, course_id: UUID) -> SeniorCourse | None:
        """Get a senior course by ID.

        Args:
            course_id: The course UUID.

        Returns:
            The course or None if not found.
        """
        result = await self.db.execute(
            select(SeniorCourse).where(SeniorCourse.id == course_id)
        )
        return result.scalar_one_or_none()

    async def get_by_code(
        self,
        code: str,
        framework_id: UUID | None = None,
        framework_code: str = "NSW",
    ) -> SeniorCourse | None:
        """Get a senior course by code.

        CRITICAL: Must filter by framework to ensure isolation.

        Args:
            code: The course code.
            framework_id: The framework UUID (preferred).
            framework_code: The framework code (fallback, e.g., 'NSW').

        Returns:
            The course or None if not found.
        """
        query = select(SeniorCourse).where(SeniorCourse.code == code)

        if framework_id:
            query = query.where(SeniorCourse.framework_id == framework_id)
        else:
            # Fallback: lookup framework by code
            query = query.join(CurriculumFramework).where(
                CurriculumFramework.code == framework_code.upper()
            )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_subject(
        self,
        subject_id: UUID,
        framework_id: UUID | None = None,
        framework_code: str = "NSW",
        active_only: bool = True,
    ) -> list[SeniorCourse]:
        """Get all senior courses for a subject.

        CRITICAL: Framework isolation is enforced to prevent data leakage.

        Args:
            subject_id: The subject UUID.
            framework_id: Filter by framework ID (preferred).
            framework_code: Filter by framework code (fallback).
            active_only: If True, only return active courses.

        Returns:
            List of senior courses for the subject.
        """
        query = (
            select(SeniorCourse)
            .where(SeniorCourse.subject_id == subject_id)
            .order_by(SeniorCourse.display_order, SeniorCourse.name)
        )

        # Enforce framework isolation
        if framework_id:
            query = query.where(SeniorCourse.framework_id == framework_id)
        else:
            query = query.join(CurriculumFramework).where(
                CurriculumFramework.code == framework_code.upper()
            )

        if active_only:
            query = query.where(SeniorCourse.is_active.is_(True))

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_atar_courses(
        self,
        framework_id: UUID | None = None,
        framework_code: str = "NSW",
        subject_id: UUID | None = None,
    ) -> list[SeniorCourse]:
        """Get all ATAR-eligible senior courses.

        Args:
            framework_id: Filter by framework ID (preferred).
            framework_code: Filter by framework code (fallback).
            subject_id: Optional filter by subject.

        Returns:
            List of ATAR-eligible courses.
        """
        query = (
            select(SeniorCourse)
            .where(SeniorCourse.is_atar.is_(True))
            .where(SeniorCourse.is_active.is_(True))
            .order_by(SeniorCourse.display_order, SeniorCourse.name)
        )

        if framework_id:
            query = query.where(SeniorCourse.framework_id == framework_id)
        else:
            query = query.join(CurriculumFramework).where(
                CurriculumFramework.code == framework_code.upper()
            )

        if subject_id:
            query = query.where(SeniorCourse.subject_id == subject_id)

        result = await self.db.execute(query)
        return list(result.scalars().all())

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

    async def create(self, data: SeniorCourseCreate) -> SeniorCourse:
        """Create a new senior course.

        Args:
            data: The course creation data.

        Returns:
            The created course.
        """
        course = SeniorCourse(
            framework_id=data.framework_id,
            subject_id=data.subject_id,
            code=data.code,
            name=data.name,
            description=data.description,
            course_type=data.course_type,
            units=data.units,
            is_atar=data.is_atar,
            prerequisites=data.prerequisites,
            exclusions=data.exclusions,
            modules=data.modules,
            assessment_components=data.assessment_components,
            display_order=data.display_order,
            is_active=data.is_active,
        )

        self.db.add(course)
        await self.db.commit()
        await self.db.refresh(course)
        return course

    async def update(
        self, course_id: UUID, data: SeniorCourseUpdate
    ) -> SeniorCourse | None:
        """Update a senior course.

        Args:
            course_id: The course UUID.
            data: The update data.

        Returns:
            The updated course or None if not found.
        """
        course = await self.get_by_id(course_id)
        if not course:
            return None

        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(course, field, value)

        await self.db.commit()
        await self.db.refresh(course)
        return course

    async def delete(self, course_id: UUID) -> bool:
        """Delete a senior course.

        Args:
            course_id: The course UUID.

        Returns:
            True if deleted, False if not found.
        """
        course = await self.get_by_id(course_id)
        if not course:
            return False

        await self.db.delete(course)
        await self.db.commit()
        return True
