"""XP Service for experience point management.

Handles XP awarding, multipliers, and activity-based XP calculations.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.gamification import (
    ActivityType,
    XP_RULES,
    get_streak_multiplier,
    get_level_for_xp,
    get_xp_for_activity,
)
from app.models.session import Session
from app.models.student import Student
from app.models.student_subject import StudentSubject

logger = logging.getLogger(__name__)


class XPService:
    """Service for managing experience points."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialise with database session.

        Args:
            db: Async database session.
        """
        self.db = db

    async def award_xp(
        self,
        student_id: UUID,
        amount: int,
        source: ActivityType,
        session_id: UUID | None = None,
        subject_id: UUID | None = None,
        apply_multiplier: bool = True,
    ) -> dict[str, Any]:
        """Award XP to a student.

        Args:
            student_id: The student to award XP to.
            amount: Base XP amount to award.
            source: The activity that earned the XP.
            session_id: Optional session ID for tracking.
            subject_id: Optional subject for subject-specific XP.
            apply_multiplier: Whether to apply streak multiplier.

        Returns:
            Dictionary with:
                - xp_earned: Final XP after multipliers
                - multiplier: Streak multiplier applied
                - new_total_xp: Updated total XP
                - level_up: Whether student levelled up
                - new_level: New level if levelled up
        """
        # Get student
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            raise ValueError(f"Student {student_id} not found")

        # Check daily cap for this activity
        capped_amount = await self._apply_daily_cap(student_id, source, amount)
        if capped_amount == 0:
            logger.debug(f"XP capped for {source.value} - student {student_id}")
            return {
                "xp_earned": 0,
                "multiplier": 1.0,
                "new_total_xp": student.gamification.get("totalXP", 0),
                "level_up": False,
                "new_level": None,
            }

        # Calculate multiplier
        multiplier = 1.0
        if apply_multiplier:
            streak = student.gamification.get("streaks", {}).get("current", 0)
            multiplier = get_streak_multiplier(streak)

        final_xp = int(capped_amount * multiplier)

        # Update student's total XP
        gamification = dict(student.gamification)
        old_xp = gamification.get("totalXP", 0)
        old_level = gamification.get("level", 1)
        new_xp = old_xp + final_xp
        new_level = get_level_for_xp(new_xp)

        gamification["totalXP"] = new_xp
        gamification["level"] = new_level
        student.gamification = gamification

        # Update subject-specific XP if subject provided
        if subject_id:
            await self._update_subject_xp(student_id, subject_id, final_xp)

        await self.db.commit()
        await self.db.refresh(student)

        level_up = new_level > old_level

        logger.info(
            f"Awarded {final_xp} XP to student {student_id} "
            f"(base: {amount}, mult: {multiplier:.2f})"
        )

        return {
            "xp_earned": final_xp,
            "multiplier": multiplier,
            "new_total_xp": new_xp,
            "level_up": level_up,
            "new_level": new_level if level_up else None,
        }

    async def get_xp_for_session(self, session_id: UUID) -> int:
        """Calculate total XP earned in a session.

        Args:
            session_id: The session ID.

        Returns:
            Total XP from the session.
        """
        result = await self.db.execute(
            select(Session).where(Session.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            return 0

        return session.xp_earned

    async def calculate_session_xp(
        self,
        session_type: str,
        data: dict[str, Any],
    ) -> int:
        """Calculate XP for a completed session based on its data.

        Args:
            session_type: Type of session (revision, tutor, etc.).
            data: Session data with activity details.

        Returns:
            Total XP for the session.
        """
        total_xp = 0

        if session_type == "revision":
            flashcards_reviewed = data.get("flashcardsReviewed", 0)
            questions_correct = data.get("questionsCorrect", 0)
            questions_attempted = data.get("questionsAttempted", 0)

            # XP per flashcard reviewed
            total_xp += flashcards_reviewed * get_xp_for_activity(
                ActivityType.FLASHCARD_REVIEW
            )

            # Bonus for correct answers
            total_xp += questions_correct * get_xp_for_activity(
                ActivityType.FLASHCARD_CORRECT
            )

            # Perfect session bonus
            if questions_attempted > 0 and questions_correct == questions_attempted:
                total_xp += get_xp_for_activity(ActivityType.PERFECT_SESSION)

        elif session_type == "tutor":
            # XP for completing a tutor session
            total_xp += get_xp_for_activity(ActivityType.TUTOR_SESSION)

            # Bonus per message exchange (simplified)
            messages = data.get("messagesExchanged", 0)
            total_xp += min(messages, 10) * get_xp_for_activity(
                ActivityType.TUTOR_MESSAGE
            )

        # Base session completion XP
        total_xp += get_xp_for_activity(ActivityType.SESSION_COMPLETE)

        return total_xp

    async def get_student_xp(self, student_id: UUID) -> int:
        """Get total XP for a student.

        Args:
            student_id: The student ID.

        Returns:
            Total XP.
        """
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            return 0

        return student.gamification.get("totalXP", 0)

    async def get_subject_xp(
        self, student_id: UUID, subject_id: UUID
    ) -> int:
        """Get XP for a specific subject.

        Args:
            student_id: The student ID.
            subject_id: The subject ID.

        Returns:
            Subject XP.
        """
        result = await self.db.execute(
            select(StudentSubject)
            .where(StudentSubject.student_id == student_id)
            .where(StudentSubject.subject_id == subject_id)
        )
        student_subject = result.scalar_one_or_none()
        if not student_subject:
            return 0

        return student_subject.xp_earned

    async def get_all_subject_xp(
        self, student_id: UUID
    ) -> list[dict[str, Any]]:
        """Get XP breakdown for all enrolled subjects.

        Args:
            student_id: The student ID.

        Returns:
            List of dicts with subject_id, subject_code, xp_earned.
        """
        from app.models.subject import Subject

        result = await self.db.execute(
            select(StudentSubject, Subject)
            .join(Subject, StudentSubject.subject_id == Subject.id)
            .where(StudentSubject.student_id == student_id)
        )
        rows = result.all()

        return [
            {
                "subject_id": ss.subject_id,
                "subject_code": s.code,
                "subject_name": s.name,
                "xp_earned": ss.xp_earned,
            }
            for ss, s in rows
        ]

    async def _update_subject_xp(
        self, student_id: UUID, subject_id: UUID, xp_delta: int
    ) -> None:
        """Update XP for a specific subject enrolment.

        Args:
            student_id: The student ID.
            subject_id: The subject ID.
            xp_delta: XP to add.
        """
        result = await self.db.execute(
            select(StudentSubject)
            .where(StudentSubject.student_id == student_id)
            .where(StudentSubject.subject_id == subject_id)
        )
        student_subject = result.scalar_one_or_none()
        if not student_subject:
            return

        progress = dict(student_subject.progress)
        current_xp = progress.get("xpEarned", 0)
        progress["xpEarned"] = current_xp + xp_delta
        student_subject.progress = progress

    async def _apply_daily_cap(
        self, student_id: UUID, activity_type: ActivityType, amount: int
    ) -> int:
        """Apply daily cap to XP if applicable.

        Tracks XP earned per activity type in student.gamification["dailyXPEarned"].
        Resets tracking when the date changes.

        Args:
            student_id: The student ID.
            activity_type: The activity type.
            amount: Requested XP amount.

        Returns:
            Capped XP amount (may be 0 if cap reached).
        """
        rule = XP_RULES.get(activity_type)
        if not rule or rule.max_per_day is None:
            return amount

        # Get student's gamification data
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            return amount

        gamification = dict(student.gamification)
        daily_xp = gamification.get("dailyXPEarned", {})
        today = date.today().isoformat()

        # Check if stored date matches today, reset if different day
        stored_date = daily_xp.get("date")
        if stored_date != today:
            daily_xp = {"date": today}

        # Get XP already earned today for this activity
        activity_key = activity_type.value
        earned_today = daily_xp.get(activity_key, 0)
        remaining = max(0, rule.max_per_day - earned_today)

        if remaining == 0:
            return 0

        # Cap the amount to remaining allowance
        capped_amount = min(amount, remaining)

        # Update tracking (will be committed in award_xp)
        daily_xp[activity_key] = earned_today + capped_amount
        gamification["dailyXPEarned"] = daily_xp
        student.gamification = gamification

        return capped_amount

    async def get_daily_xp_summary(self, student_id: UUID) -> dict[str, int]:
        """Get XP earned today by activity type.

        Args:
            student_id: The student ID.

        Returns:
            Dictionary of activity_type -> xp_earned_today.
        """
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            return {}

        daily_xp = student.gamification.get("dailyXPEarned", {})
        today = date.today().isoformat()

        # If the stored date doesn't match today, return empty (new day)
        if daily_xp.get("date") != today:
            return {}

        # Return activity-type to XP mapping, excluding the date key
        return {
            key: value
            for key, value in daily_xp.items()
            if key != "date"
        }
