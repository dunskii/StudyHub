"""Gamification Service - orchestration layer.

Coordinates XP, levels, streaks, and achievements into a unified interface.
Provides hooks for session completion and other gamification events.
"""
from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.gamification import ActivityType, get_level_for_xp, get_level_title
from app.models.session import Session
from app.models.student import Student
from app.schemas.gamification import (
    Achievement,
    GamificationStats,
    GamificationStatsDetailed,
    LevelInfo,
    ParentGamificationSummary,
    SessionGamificationResult,
    StreakInfo,
    SubjectLevelInfo,
)
from app.services.achievement_service import AchievementService
from app.services.level_service import LevelService
from app.services.streak_service import StreakService
from app.services.xp_service import XPService

logger = logging.getLogger(__name__)


class GamificationService:
    """Orchestration service for all gamification features."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialise with database session.

        Args:
            db: Async database session.
        """
        self.db = db
        self.xp_service = XPService(db)
        self.level_service = LevelService(db)
        self.streak_service = StreakService(db)
        self.achievement_service = AchievementService(db)

    async def get_stats(self, student_id: UUID) -> GamificationStats:
        """Get complete gamification stats for a student.

        Args:
            student_id: The student ID.

        Returns:
            GamificationStats with all key metrics.

        Raises:
            ValueError: If student not found.
        """
        # Get student
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            raise ValueError(f"Student {student_id} not found")

        # Get level info
        level_info = await self.level_service.get_level_info(student_id)

        # Get streak info
        streak_info = await self.streak_service.get_streak_info(student_id)

        # Get achievement counts
        unlocked_count = await self.achievement_service.count_unlocked(student_id)
        total_count = await self.achievement_service.count_total()

        # Get recent achievements (last 5)
        all_unlocked = await self.achievement_service.get_unlocked_achievements(
            student_id
        )
        recent_achievements = sorted(
            all_unlocked, key=lambda a: a.unlocked_at, reverse=True
        )[:5]

        # Count subjects with XP
        subject_xp_list = await self.xp_service.get_all_subject_xp(student_id)
        subjects_with_xp = sum(1 for s in subject_xp_list if s["xp_earned"] > 0)

        return GamificationStats(
            total_xp=level_info.current_xp,
            level=level_info.level,
            level_title=level_info.title,
            level_progress_percent=level_info.progress_percent,
            next_level_xp=level_info.next_level_xp,
            streak=streak_info,
            achievements_unlocked=unlocked_count,
            achievements_total=total_count,
            recent_achievements=recent_achievements,
            subjects_with_progress=subjects_with_xp,
        )

    async def get_detailed_stats(
        self, student_id: UUID
    ) -> GamificationStatsDetailed:
        """Get detailed gamification stats including all achievements and subjects.

        Args:
            student_id: The student ID.

        Returns:
            GamificationStatsDetailed with full breakdowns.
        """
        # Get basic stats
        basic_stats = await self.get_stats(student_id)

        # Get all achievements with progress
        achievements = await self.achievement_service.get_achievements_with_progress(
            student_id
        )

        # Get subject levels
        subject_stats = await self.level_service.get_all_subject_levels(student_id)

        return GamificationStatsDetailed(
            **basic_stats.model_dump(),
            achievements=achievements,
            subject_stats=subject_stats,
            recent_xp_events=[],  # Would need XP event tracking
        )

    async def on_session_complete(
        self, session_id: UUID
    ) -> SessionGamificationResult:
        """Process gamification updates when a session completes.

        This is the main hook called when any study session ends.

        Args:
            session_id: The completed session ID.

        Returns:
            SessionGamificationResult with all updates made.

        Raises:
            ValueError: If session not found.
        """
        # Get session
        result = await self.db.execute(
            select(Session).where(Session.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError(f"Session {session_id} not found")

        student_id = session.student_id
        subject_id = session.subject_id

        # Calculate XP for this session
        session_xp = await self.xp_service.calculate_session_xp(
            session.session_type, session.data
        )

        # Award XP
        xp_result = await self.xp_service.award_xp(
            student_id=student_id,
            amount=session_xp,
            source=ActivityType.SESSION_COMPLETE,
            session_id=session_id,
            subject_id=subject_id,
            apply_multiplier=True,
        )

        # Update session XP field
        session.xp_earned = xp_result["xp_earned"]

        # Update streak
        new_streak, milestones = await self.streak_service.update_streak(student_id)

        # Check for new achievements
        new_achievements = await self.achievement_service.check_and_unlock_achievements(
            student_id
        )

        await self.db.commit()

        # Get level info if levelled up
        new_level_title = None
        if xp_result["level_up"] and xp_result["new_level"]:
            new_level_title = get_level_title(xp_result["new_level"])

        logger.info(
            f"Session {session_id} complete: "
            f"{xp_result['xp_earned']} XP, streak {new_streak}, "
            f"{len(new_achievements)} new achievements"
        )

        return SessionGamificationResult(
            xp_earned=xp_result["xp_earned"],
            streak_updated=True,
            new_streak=new_streak,
            achievements_unlocked=new_achievements,
            level_up=xp_result["level_up"],
            new_level=xp_result["new_level"],
            new_level_title=new_level_title,
        )

    async def on_flashcard_review(
        self,
        student_id: UUID,
        subject_id: UUID | None,
        is_correct: bool,
        session_id: UUID | None = None,
    ) -> dict[str, Any]:
        """Process gamification for a flashcard review.

        Args:
            student_id: The student ID.
            subject_id: The subject ID.
            is_correct: Whether the answer was correct.
            session_id: Optional session ID.

        Returns:
            Dictionary with XP earned info.
        """
        # Base XP for review
        xp_result = await self.xp_service.award_xp(
            student_id=student_id,
            amount=5,  # FLASHCARD_REVIEW base
            source=ActivityType.FLASHCARD_REVIEW,
            session_id=session_id,
            subject_id=subject_id,
        )

        # Bonus for correct answer
        if is_correct:
            bonus_result = await self.xp_service.award_xp(
                student_id=student_id,
                amount=5,  # FLASHCARD_CORRECT base
                source=ActivityType.FLASHCARD_CORRECT,
                session_id=session_id,
                subject_id=subject_id,
            )
            xp_result["xp_earned"] += bonus_result["xp_earned"]

        return xp_result

    async def on_note_upload(
        self, student_id: UUID, subject_id: UUID | None
    ) -> dict[str, Any]:
        """Process gamification for a note upload.

        Args:
            student_id: The student ID.
            subject_id: The subject ID.

        Returns:
            Dictionary with XP earned info.
        """
        return await self.xp_service.award_xp(
            student_id=student_id,
            amount=25,  # NOTE_UPLOAD base
            source=ActivityType.NOTE_UPLOAD,
            subject_id=subject_id,
        )

    async def get_parent_summary(
        self, student_id: UUID, student_name: str
    ) -> ParentGamificationSummary:
        """Get gamification summary for parent dashboard.

        Args:
            student_id: The student ID.
            student_name: The student's display name.

        Returns:
            ParentGamificationSummary.
        """
        stats = await self.get_stats(student_id)

        return ParentGamificationSummary(
            student_id=student_id,
            student_name=student_name,
            total_xp=stats.total_xp,
            level=stats.level,
            level_title=stats.level_title,
            streak_current=stats.streak.current,
            streak_longest=stats.streak.longest,
            achievements_unlocked=stats.achievements_unlocked,
            achievements_total=stats.achievements_total,
            recent_achievements=stats.recent_achievements,
            level_progress_percent=stats.level_progress_percent,
        )

    async def get_level_info(self, student_id: UUID) -> LevelInfo:
        """Get level information for a student.

        Args:
            student_id: The student ID.

        Returns:
            LevelInfo.
        """
        return await self.level_service.get_level_info(student_id)

    async def get_streak_info(self, student_id: UUID) -> StreakInfo:
        """Get streak information for a student.

        Args:
            student_id: The student ID.

        Returns:
            StreakInfo.
        """
        return await self.streak_service.get_streak_info(student_id)

    async def get_subject_stats(
        self, student_id: UUID
    ) -> list[SubjectLevelInfo]:
        """Get subject-level stats for a student.

        Args:
            student_id: The student ID.

        Returns:
            List of SubjectLevelInfo.
        """
        return await self.level_service.get_all_subject_levels(student_id)

    async def get_achievements(
        self, student_id: UUID, include_locked: bool = True
    ) -> list[Achievement] | list[Any]:
        """Get achievements for a student.

        Args:
            student_id: The student ID.
            include_locked: Whether to include locked achievements.

        Returns:
            List of achievements.
        """
        if include_locked:
            return await self.achievement_service.get_achievements_with_progress(
                student_id
            )
        return await self.achievement_service.get_unlocked_achievements(student_id)
