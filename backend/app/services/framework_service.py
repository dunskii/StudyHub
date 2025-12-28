"""Framework service for curriculum framework operations."""
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.curriculum_framework import CurriculumFramework
from app.schemas.framework import FrameworkCreate, FrameworkUpdate


class FrameworkService:
    """Service for curriculum framework operations."""

    def __init__(self, db: AsyncSession):
        """Initialise with database session."""
        self.db = db

    async def get_all(
        self,
        active_only: bool = True,
        offset: int = 0,
        limit: int | None = None,
    ) -> list[CurriculumFramework]:
        """Get all curriculum frameworks with optional pagination.

        Args:
            active_only: If True, only return active frameworks.
            offset: Number of records to skip.
            limit: Maximum number of records to return.

        Returns:
            List of curriculum frameworks.
        """
        query = select(CurriculumFramework).order_by(CurriculumFramework.display_order)

        if active_only:
            query = query.where(CurriculumFramework.is_active.is_(True))

        if offset > 0:
            query = query.offset(offset)

        if limit is not None:
            query = query.limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(self, active_only: bool = True) -> int:
        """Count total number of frameworks.

        Args:
            active_only: If True, only count active frameworks.

        Returns:
            Total count.
        """
        query = select(func.count()).select_from(CurriculumFramework)

        if active_only:
            query = query.where(CurriculumFramework.is_active.is_(True))

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_by_id(self, framework_id: UUID) -> CurriculumFramework | None:
        """Get a framework by ID.

        Args:
            framework_id: The framework UUID.

        Returns:
            The framework or None if not found.
        """
        result = await self.db.execute(
            select(CurriculumFramework).where(CurriculumFramework.id == framework_id)
        )
        return result.scalar_one_or_none()

    async def get_by_code(self, code: str) -> CurriculumFramework | None:
        """Get a framework by code.

        Args:
            code: The framework code (e.g., 'NSW').

        Returns:
            The framework or None if not found.
        """
        result = await self.db.execute(
            select(CurriculumFramework).where(CurriculumFramework.code == code.upper())
        )
        return result.scalar_one_or_none()

    async def get_default(self) -> CurriculumFramework | None:
        """Get the default curriculum framework.

        Returns:
            The default framework or None if not found.
        """
        result = await self.db.execute(
            select(CurriculumFramework).where(CurriculumFramework.is_default.is_(True))
        )
        return result.scalar_one_or_none()

    async def create(self, data: FrameworkCreate) -> CurriculumFramework:
        """Create a new curriculum framework.

        Args:
            data: The framework creation data.

        Returns:
            The created framework.
        """
        framework = CurriculumFramework(
            code=data.code.upper(),
            name=data.name,
            country=data.country,
            region_type=data.region_type,
            syllabus_authority=data.syllabus_authority,
            syllabus_url=data.syllabus_url,
            structure=data.structure,
            is_active=data.is_active,
            is_default=data.is_default,
            display_order=data.display_order,
        )

        # If this is set as default, unset any existing default
        if data.is_default:
            await self._unset_other_defaults(exclude_id=None)

        self.db.add(framework)
        await self.db.commit()
        await self.db.refresh(framework)
        return framework

    async def update(
        self, framework_id: UUID, data: FrameworkUpdate
    ) -> CurriculumFramework | None:
        """Update a curriculum framework.

        Args:
            framework_id: The framework UUID.
            data: The update data.

        Returns:
            The updated framework or None if not found.
        """
        framework = await self.get_by_id(framework_id)
        if not framework:
            return None

        update_data = data.model_dump(exclude_unset=True)

        # Handle default flag
        if update_data.get("is_default"):
            await self._unset_other_defaults(exclude_id=framework_id)

        for field, value in update_data.items():
            setattr(framework, field, value)

        await self.db.commit()
        await self.db.refresh(framework)
        return framework

    async def _unset_other_defaults(self, exclude_id: UUID | None) -> None:
        """Unset is_default on all frameworks except the specified one.

        Args:
            exclude_id: The framework ID to exclude from unsetting.
        """
        query = select(CurriculumFramework).where(
            CurriculumFramework.is_default.is_(True)
        )
        if exclude_id:
            query = query.where(CurriculumFramework.id != exclude_id)

        result = await self.db.execute(query)
        for framework in result.scalars().all():
            framework.is_default = False
