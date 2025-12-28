"""Streak Service for study streak management.

Handles streak calculation, updates, and milestone detection.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.gamification import STREAK_MILESTONES, get_streak_multiplier
from app.models.student import Student
from app.schemas.gamification import StreakInfo

logger = logging.getLogger(__name__)


class StreakService:
    """Service for managing study streaks."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialise with database session.

        Args:
            db: Async database session.
        """
        self.db = db

    async def get_streak_info(self, student_id: UUID) -> StreakInfo:
        """Get streak information for a student.

        Args:
            student_id: The student ID.

        Returns:
            StreakInfo with current streak, multiplier, etc.

        Raises:
            ValueError: If student not found.
        """
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            raise ValueError(f"Student {student_id} not found")

        streaks = student.gamification.get("streaks", {})
        current = streaks.get("current", 0)
        longest = streaks.get("longest", 0)
        last_active = streaks.get("lastActiveDate")

        multiplier = get_streak_multiplier(current)

        # Calculate next milestone
        next_milestone = None
        days_to_milestone = None
        for milestone in STREAK_MILESTONES:
            if current < milestone:
                next_milestone = milestone
                days_to_milestone = milestone - current
                break

        return StreakInfo(
            current=current,
            longest=longest,
            last_active_date=last_active,
            multiplier=multiplier,
            next_milestone=next_milestone,
            days_to_milestone=days_to_milestone,
        )

    async def update_streak(self, student_id: UUID) -> tuple[int, list[int]]:
        """Update streak for a student's daily activity.

        Should be called when a student completes any learning activity.
        Handles incrementing streak or resetting if a day was missed.

        Args:
            student_id: The student ID.

        Returns:
            Tuple of (new_streak, milestones_reached).

        Raises:
            ValueError: If student not found.
        """
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            raise ValueError(f"Student {student_id} not found")

        today = date.today()
        today_str = today.isoformat()

        gamification = dict(student.gamification)
        streaks = dict(gamification.get("streaks", {}))

        current_streak = streaks.get("current", 0)
        longest_streak = streaks.get("longest", 0)
        last_active_str = streaks.get("lastActiveDate")

        milestones_reached: list[int] = []

        if last_active_str:
            last_active = date.fromisoformat(last_active_str)

            if last_active == today:
                # Already logged activity today, no change
                return current_streak, []

            # Calculate days since last activity
            days_since = (today - last_active).days

            if days_since == 1:
                # Consecutive day - increment streak
                current_streak += 1
            elif days_since > 1:
                # Missed at least one day - reset streak
                logger.info(
                    f"Student {student_id} streak reset "
                    f"(missed {days_since - 1} days)"
                )
                current_streak = 1
            # days_since == 0 handled above (same day)
        else:
            # First activity ever
            current_streak = 1

        # Check for milestones
        for milestone in STREAK_MILESTONES:
            if current_streak == milestone:
                milestones_reached.append(milestone)
                logger.info(
                    f"Student {student_id} reached {milestone}-day streak milestone!"
                )

        # Update longest if needed
        if current_streak > longest_streak:
            longest_streak = current_streak

        # Save changes
        streaks["current"] = current_streak
        streaks["longest"] = longest_streak
        streaks["lastActiveDate"] = today_str
        gamification["streaks"] = streaks
        student.gamification = gamification

        # Also update last_active_at timestamp
        student.last_active_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(student)

        return current_streak, milestones_reached

    async def check_streak_status(self, student_id: UUID) -> dict[str, bool]:
        """Check streak status without modifying.

        Args:
            student_id: The student ID.

        Returns:
            Dictionary with:
                - is_active: Whether student is active today
                - at_risk: Whether streak will be lost tomorrow
                - can_extend: Whether activity today would extend streak
        """
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            return {"is_active": False, "at_risk": False, "can_extend": False}

        today = date.today()
        streaks = student.gamification.get("streaks", {})
        last_active_str = streaks.get("lastActiveDate")

        if not last_active_str:
            return {"is_active": False, "at_risk": False, "can_extend": True}

        last_active = date.fromisoformat(last_active_str)
        days_since = (today - last_active).days

        return {
            "is_active": days_since == 0,
            "at_risk": days_since == 1,
            "can_extend": days_since <= 1,
        }

    async def get_streak_multiplier(self, student_id: UUID) -> float:
        """Get current XP multiplier from streak.

        Args:
            student_id: The student ID.

        Returns:
            Multiplier (1.0 to 1.5).
        """
        streak_info = await self.get_streak_info(student_id)
        return streak_info.multiplier

    async def reset_streak(self, student_id: UUID) -> None:
        """Manually reset a student's streak (admin function).

        Args:
            student_id: The student ID.
        """
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            return

        gamification = dict(student.gamification)
        gamification["streaks"] = {
            "current": 0,
            "longest": gamification.get("streaks", {}).get("longest", 0),
            "lastActiveDate": None,
        }
        student.gamification = gamification

        await self.db.commit()
        logger.info(f"Reset streak for student {student_id}")

    def calculate_multiplier(self, streak_days: int) -> float:
        """Calculate XP multiplier for a streak length.

        Args:
            streak_days: Number of consecutive study days.

        Returns:
            XP multiplier (1.0 to 1.5).
        """
        return get_streak_multiplier(streak_days)

    def get_next_milestone(self, current_streak: int) -> int | None:
        """Get the next streak milestone.

        Args:
            current_streak: Current streak count.

        Returns:
            Next milestone or None if all reached.
        """
        for milestone in STREAK_MILESTONES:
            if current_streak < milestone:
                return milestone
        return None
