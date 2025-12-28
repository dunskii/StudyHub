"""Level Service for level progression management.

Handles level calculations, titles, and level-up detection.
"""
from __future__ import annotations

import logging
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.gamification import (
    LEVEL_THRESHOLDS,
    MAX_LEVEL,
    get_level_for_xp,
    get_level_title,
    get_xp_for_next_level,
)
from app.models.student import Student
from app.models.student_subject import StudentSubject
from app.models.subject import Subject
from app.schemas.gamification import LevelInfo, SubjectLevelInfo

logger = logging.getLogger(__name__)


class LevelService:
    """Service for managing level progression."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialise with database session.

        Args:
            db: Async database session.
        """
        self.db = db

    async def get_level_info(self, student_id: UUID) -> LevelInfo:
        """Get complete level information for a student.

        Args:
            student_id: The student ID.

        Returns:
            LevelInfo with current level, title, progress, etc.

        Raises:
            ValueError: If student not found.
        """
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            raise ValueError(f"Student {student_id} not found")

        total_xp = student.gamification.get("totalXP", 0)
        level = get_level_for_xp(total_xp)
        title = get_level_title(level)

        # Calculate progress to next level
        level_start_xp = LEVEL_THRESHOLDS[level - 1]
        next_level_xp = get_xp_for_next_level(level)
        is_max = level >= MAX_LEVEL

        if is_max:
            progress_percent = Decimal("100")
        else:
            xp_in_level = total_xp - level_start_xp
            xp_needed = next_level_xp - level_start_xp if next_level_xp else 1
            progress_percent = Decimal(str(xp_in_level * 100 / xp_needed)).quantize(
                Decimal("0.1")
            )

        return LevelInfo(
            level=level,
            title=title,
            current_xp=total_xp,
            level_start_xp=level_start_xp,
            next_level_xp=next_level_xp,
            progress_percent=min(progress_percent, Decimal("100")),
            is_max_level=is_max,
        )

    async def get_subject_level_info(
        self, student_id: UUID, subject_id: UUID
    ) -> SubjectLevelInfo | None:
        """Get level information for a specific subject.

        Args:
            student_id: The student ID.
            subject_id: The subject ID.

        Returns:
            SubjectLevelInfo or None if not enrolled.
        """
        result = await self.db.execute(
            select(StudentSubject, Subject)
            .join(Subject, StudentSubject.subject_id == Subject.id)
            .where(StudentSubject.student_id == student_id)
            .where(StudentSubject.subject_id == subject_id)
        )
        row = result.first()
        if not row:
            return None

        student_subject, subject = row
        xp_earned = student_subject.xp_earned
        level = get_level_for_xp(xp_earned)
        title = get_level_title(level, subject.code)

        # Calculate progress
        level_start_xp = LEVEL_THRESHOLDS[level - 1]
        next_level_xp = get_xp_for_next_level(level)

        if level >= MAX_LEVEL:
            progress_percent = Decimal("100")
        else:
            xp_in_level = xp_earned - level_start_xp
            xp_needed = next_level_xp - level_start_xp if next_level_xp else 1
            progress_percent = Decimal(str(xp_in_level * 100 / xp_needed)).quantize(
                Decimal("0.1")
            )

        return SubjectLevelInfo(
            subject_id=subject_id,
            subject_code=subject.code,
            subject_name=subject.name,
            xp_earned=xp_earned,
            level=level,
            title=title,
            progress_percent=min(progress_percent, Decimal("100")),
        )

    async def get_all_subject_levels(
        self, student_id: UUID
    ) -> list[SubjectLevelInfo]:
        """Get level information for all enrolled subjects.

        Args:
            student_id: The student ID.

        Returns:
            List of SubjectLevelInfo for each enrolled subject.
        """
        result = await self.db.execute(
            select(StudentSubject, Subject)
            .join(Subject, StudentSubject.subject_id == Subject.id)
            .where(StudentSubject.student_id == student_id)
        )
        rows = result.all()

        levels = []
        for student_subject, subject in rows:
            xp_earned = student_subject.xp_earned
            level = get_level_for_xp(xp_earned)
            title = get_level_title(level, subject.code)

            # Calculate progress
            level_start_xp = LEVEL_THRESHOLDS[level - 1]
            next_level_xp = get_xp_for_next_level(level)

            if level >= MAX_LEVEL:
                progress_percent = Decimal("100")
            else:
                xp_in_level = xp_earned - level_start_xp
                xp_needed = next_level_xp - level_start_xp if next_level_xp else 1
                progress_percent = Decimal(str(xp_in_level * 100 / xp_needed)).quantize(
                    Decimal("0.1")
                )

            levels.append(
                SubjectLevelInfo(
                    subject_id=subject.id,
                    subject_code=subject.code,
                    subject_name=subject.name,
                    xp_earned=xp_earned,
                    level=level,
                    title=title,
                    progress_percent=min(progress_percent, Decimal("100")),
                )
            )

        return levels

    async def check_level_up(
        self, student_id: UUID, old_xp: int, new_xp: int
    ) -> tuple[bool, int | None, str | None]:
        """Check if XP change resulted in a level up.

        Args:
            student_id: The student ID.
            old_xp: XP before the change.
            new_xp: XP after the change.

        Returns:
            Tuple of (levelled_up, new_level, new_title).
        """
        old_level = get_level_for_xp(old_xp)
        new_level = get_level_for_xp(new_xp)

        if new_level > old_level:
            title = get_level_title(new_level)
            logger.info(
                f"Student {student_id} levelled up from {old_level} to {new_level}"
            )
            return True, new_level, title

        return False, None, None

    def calculate_level(self, xp: int) -> int:
        """Calculate level for given XP.

        Args:
            xp: Total XP.

        Returns:
            Level number.
        """
        return get_level_for_xp(xp)

    def get_title(self, level: int, subject_code: str | None = None) -> str:
        """Get title for a level.

        Args:
            level: Level number.
            subject_code: Optional subject for subject-specific title.

        Returns:
            Level title string.
        """
        return get_level_title(level, subject_code)

    def get_xp_to_next_level(self, current_xp: int) -> int | None:
        """Calculate XP needed for next level.

        Args:
            current_xp: Current total XP.

        Returns:
            XP needed, or None if at max level.
        """
        level = get_level_for_xp(current_xp)
        next_threshold = get_xp_for_next_level(level)
        if next_threshold is None:
            return None
        return next_threshold - current_xp

    def get_level_progress_percent(self, current_xp: int) -> Decimal:
        """Calculate progress percentage within current level.

        Args:
            current_xp: Current total XP.

        Returns:
            Progress as percentage (0-100).
        """
        level = get_level_for_xp(current_xp)
        if level >= MAX_LEVEL:
            return Decimal("100")

        level_start = LEVEL_THRESHOLDS[level - 1]
        level_end = LEVEL_THRESHOLDS[level]
        xp_in_level = current_xp - level_start
        xp_needed = level_end - level_start

        if xp_needed <= 0:
            return Decimal("100")

        percent = Decimal(str(xp_in_level * 100 / xp_needed))
        return min(percent.quantize(Decimal("0.1")), Decimal("100"))
