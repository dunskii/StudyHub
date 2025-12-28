"""Achievement Service for achievement management.

Handles achievement unlocking, progress tracking, and definitions.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.gamification import AchievementCategory, get_level_for_xp
from app.models.achievement_definition import AchievementDefinition
from app.models.session import Session
from app.models.student import Student
from app.models.revision_history import RevisionHistory
from app.schemas.gamification import (
    Achievement,
    AchievementDefinitionResponse,
    AchievementWithProgress,
)

logger = logging.getLogger(__name__)


class AchievementService:
    """Service for managing achievements."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialise with database session.

        Args:
            db: Async database session.
        """
        self.db = db

    async def get_all_definitions(
        self,
        category: AchievementCategory | None = None,
        subject_code: str | None = None,
        active_only: bool = True,
    ) -> list[AchievementDefinitionResponse]:
        """Get all achievement definitions.

        Args:
            category: Filter by category.
            subject_code: Filter by subject.
            active_only: Only return active achievements.

        Returns:
            List of achievement definitions.
        """
        query = select(AchievementDefinition)

        if active_only:
            query = query.where(AchievementDefinition.is_active.is_(True))
        if category:
            query = query.where(AchievementDefinition.category == category.value)
        if subject_code:
            query = query.where(AchievementDefinition.subject_code == subject_code)

        query = query.order_by(AchievementDefinition.code)
        result = await self.db.execute(query)
        definitions = result.scalars().all()

        return [
            AchievementDefinitionResponse(
                code=d.code,
                name=d.name,
                description=d.description,
                category=AchievementCategory(d.category),
                subject_code=d.subject_code,
                xp_reward=d.xp_reward,
                icon=d.icon,
            )
            for d in definitions
        ]

    async def get_unlocked_achievements(
        self, student_id: UUID
    ) -> list[Achievement]:
        """Get achievements unlocked by a student.

        Args:
            student_id: The student ID.

        Returns:
            List of unlocked achievements.
        """
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            return []

        unlocked = student.gamification.get("achievements", [])

        return [
            Achievement(
                code=a["id"],
                name=a.get("name", a["id"]),
                description=a.get("description", ""),
                category=AchievementCategory(a.get("category", "milestone")),
                subject_code=a.get("subject"),
                icon=a.get("icon", "star"),
                xp_reward=a.get("xpReward", 0),
                unlocked_at=datetime.fromisoformat(a["unlockedAt"]),
            )
            for a in unlocked
        ]

    async def get_achievements_with_progress(
        self, student_id: UUID
    ) -> list[AchievementWithProgress]:
        """Get all achievements with progress for a student.

        Args:
            student_id: The student ID.

        Returns:
            List of achievements with locked/unlocked status and progress.
        """
        # Get all definitions from database (with requirements)
        definitions_result = await self.db.execute(
            select(AchievementDefinition)
            .where(AchievementDefinition.is_active.is_(True))
            .order_by(AchievementDefinition.code)
        )
        db_definitions = definitions_result.scalars().all()

        # Get student's unlocked achievements
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            return []

        unlocked_map: dict[str, dict[str, Any]] = {}
        for a in student.gamification.get("achievements", []):
            unlocked_map[a["id"]] = a

        # Get student stats for progress calculation
        stats = await self._get_student_stats(student_id, student)

        achievements = []
        for defn in db_definitions:
            unlocked_data = unlocked_map.get(defn.code)
            is_unlocked = unlocked_data is not None

            progress_percent, progress_text = self._calculate_progress(
                defn.requirements, stats, is_unlocked, defn.subject_code
            )

            achievements.append(
                AchievementWithProgress(
                    code=defn.code,
                    name=defn.name,
                    description=defn.description,
                    category=AchievementCategory(defn.category),
                    subject_code=defn.subject_code,
                    icon=defn.icon,
                    xp_reward=defn.xp_reward,
                    is_unlocked=is_unlocked,
                    unlocked_at=(
                        datetime.fromisoformat(unlocked_data["unlockedAt"])
                        if unlocked_data
                        else None
                    ),
                    progress_percent=progress_percent,
                    progress_text=progress_text,
                )
            )

        return achievements

    async def check_and_unlock_achievements(
        self, student_id: UUID
    ) -> list[Achievement]:
        """Check all achievements and unlock any newly earned.

        Args:
            student_id: The student ID.

        Returns:
            List of newly unlocked achievements.
        """
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            return []

        # Get already unlocked codes
        unlocked_codes = {
            a["id"] for a in student.gamification.get("achievements", [])
        }

        # Get student stats
        stats = await self._get_student_stats(student_id, student)

        # Get all definitions
        definitions_result = await self.db.execute(
            select(AchievementDefinition)
            .where(AchievementDefinition.is_active.is_(True))
        )
        definitions = definitions_result.scalars().all()

        newly_unlocked: list[Achievement] = []

        for defn in definitions:
            if defn.code in unlocked_codes:
                continue

            if self._check_requirements(defn.requirements, stats, defn.subject_code):
                # Unlock this achievement
                achievement = await self._unlock_achievement(student, defn)
                if achievement:
                    newly_unlocked.append(achievement)

        if newly_unlocked:
            await self.db.commit()
            await self.db.refresh(student)

        return newly_unlocked

    async def unlock_achievement(
        self, student_id: UUID, achievement_code: str
    ) -> Achievement | None:
        """Manually unlock an achievement.

        Args:
            student_id: The student ID.
            achievement_code: The achievement code.

        Returns:
            The unlocked achievement or None if already unlocked.
        """
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            return None

        # Check if already unlocked
        unlocked_codes = {
            a["id"] for a in student.gamification.get("achievements", [])
        }
        if achievement_code in unlocked_codes:
            return None

        # Get definition
        defn_result = await self.db.execute(
            select(AchievementDefinition)
            .where(AchievementDefinition.code == achievement_code)
        )
        defn = defn_result.scalar_one_or_none()
        if not defn:
            return None

        achievement = await self._unlock_achievement(student, defn)
        if achievement:
            await self.db.commit()
            await self.db.refresh(student)

        return achievement

    async def _unlock_achievement(
        self, student: Student, defn: AchievementDefinition
    ) -> Achievement | None:
        """Internal method to unlock an achievement.

        Args:
            student: The student model.
            defn: The achievement definition.

        Returns:
            The unlocked Achievement or None.
        """
        now = datetime.now(timezone.utc)

        gamification = dict(student.gamification)
        achievements = list(gamification.get("achievements", []))

        achievement_data = {
            "id": defn.code,
            "name": defn.name,
            "description": defn.description,
            "category": defn.category,
            "subject": defn.subject_code,
            "icon": defn.icon,
            "xpReward": defn.xp_reward,
            "unlockedAt": now.isoformat(),
        }
        achievements.append(achievement_data)
        gamification["achievements"] = achievements

        # Award XP for achievement
        if defn.xp_reward > 0:
            current_xp = gamification.get("totalXP", 0)
            gamification["totalXP"] = current_xp + defn.xp_reward
            gamification["level"] = get_level_for_xp(gamification["totalXP"])

        student.gamification = gamification

        logger.info(f"Unlocked achievement {defn.code} for student {student.id}")

        return Achievement(
            code=defn.code,
            name=defn.name,
            description=defn.description,
            category=AchievementCategory(defn.category),
            subject_code=defn.subject_code,
            icon=defn.icon,
            xp_reward=defn.xp_reward,
            unlocked_at=now,
        )

    async def _get_student_stats(
        self, student_id: UUID, student: Student
    ) -> dict[str, Any]:
        """Get student stats for achievement checking.

        Args:
            student_id: The student ID.
            student: The student model.

        Returns:
            Dictionary of stats for requirement checking.
        """
        gamification = student.gamification

        # Count sessions
        sessions_result = await self.db.execute(
            select(func.count(Session.id))
            .where(Session.student_id == student_id)
            .where(Session.ended_at.isnot(None))
        )
        sessions_completed = sessions_result.scalar() or 0

        # Count perfect sessions (100% correct)
        # A perfect session has questionsAttempted > 0 and questionsCorrect == questionsAttempted
        from sqlalchemy import cast, Integer as SQLInteger
        perfect_result = await self.db.execute(
            select(func.count(Session.id))
            .where(Session.student_id == student_id)
            .where(Session.ended_at.isnot(None))
            .where(Session.session_type == "revision")
            .where(
                cast(Session.data["questionsAttempted"].astext, SQLInteger) > 0
            )
            .where(
                cast(Session.data["questionsCorrect"].astext, SQLInteger)
                == cast(Session.data["questionsAttempted"].astext, SQLInteger)
            )
        )
        perfect_sessions = perfect_result.scalar() or 0

        # Count flashcards reviewed
        flashcards_result = await self.db.execute(
            select(func.count(RevisionHistory.id))
            .where(RevisionHistory.student_id == student_id)
        )
        flashcards_reviewed = flashcards_result.scalar() or 0

        # Count sessions by subject using JOIN to avoid N+1 queries
        from app.models.subject import Subject
        subject_sessions: dict[str, int] = {}
        subject_result = await self.db.execute(
            select(Subject.code, func.count(Session.id))
            .join(Subject, Session.subject_id == Subject.id)
            .where(Session.student_id == student_id)
            .where(Session.ended_at.isnot(None))
            .where(Session.subject_id.isnot(None))
            .group_by(Subject.code)
        )
        for code, count in subject_result.all():
            subject_sessions[code] = count

        # Count unique mastered outcomes across all subjects
        from app.models.student_subject import StudentSubject
        outcomes_result = await self.db.execute(
            select(StudentSubject.progress)
            .where(StudentSubject.student_id == student_id)
        )
        mastered_outcomes: set[str] = set()
        for (progress,) in outcomes_result.all():
            if progress and "outcomesCompleted" in progress:
                mastered_outcomes.update(progress["outcomesCompleted"])
        outcomes_mastered = len(mastered_outcomes)

        return {
            "total_xp": gamification.get("totalXP", 0),
            "level": gamification.get("level", 1),
            "streak_days": gamification.get("streaks", {}).get("current", 0),
            "sessions_completed": sessions_completed,
            "perfect_sessions": perfect_sessions,
            "flashcards_reviewed": flashcards_reviewed,
            "outcomes_mastered": outcomes_mastered,
            "subject_sessions": subject_sessions,
        }

    def _check_requirements(
        self,
        requirements: dict[str, Any],
        stats: dict[str, Any],
        subject_code: str | None = None,
    ) -> bool:
        """Check if requirements are met.

        Args:
            requirements: Achievement requirements dict.
            stats: Student stats dict.
            subject_code: Subject code for subject-specific checks.

        Returns:
            True if all requirements met.
        """
        for key, target in requirements.items():
            if key == "total_xp" and stats.get("total_xp", 0) < target:
                return False
            elif key == "level" and stats.get("level", 1) < target:
                return False
            elif key == "streak_days" and stats.get("streak_days", 0) < target:
                return False
            elif key == "sessions_completed" and stats.get("sessions_completed", 0) < target:
                return False
            elif key == "perfect_sessions" and stats.get("perfect_sessions", 0) < target:
                return False
            elif key == "flashcards_reviewed" and stats.get("flashcards_reviewed", 0) < target:
                return False
            elif key == "outcomes_mastered" and stats.get("outcomes_mastered", 0) < target:
                return False
            elif key == "subject_sessions":
                if subject_code:
                    subject_count = stats.get("subject_sessions", {}).get(subject_code, 0)
                    if subject_count < target:
                        return False

        return True

    def _calculate_progress(
        self,
        requirements: dict[str, Any],
        stats: dict[str, Any],
        is_unlocked: bool,
        subject_code: str | None = None,
    ) -> tuple[Decimal, str | None]:
        """Calculate progress towards an achievement.

        Args:
            requirements: Achievement requirements dict.
            stats: Student stats.
            is_unlocked: Whether already unlocked.
            subject_code: Subject code for subject-specific achievements.

        Returns:
            Tuple of (progress_percent, progress_text).
        """
        if is_unlocked:
            return Decimal("100"), "Completed!"

        if not requirements:
            return Decimal("0"), None

        # Calculate progress for the first requirement (most achievements have one)
        for req_key, target in requirements.items():
            current = 0
            label = ""

            if req_key == "sessions_completed":
                current = stats.get("sessions_completed", 0)
                label = "sessions"
            elif req_key == "streak_days":
                current = stats.get("streak_days", 0)
                label = "day streak"
            elif req_key == "level":
                current = stats.get("level", 1)
                label = "level"
            elif req_key == "total_xp":
                current = stats.get("total_xp", 0)
                label = "XP"
            elif req_key == "outcomes_mastered":
                current = stats.get("outcomes_mastered", 0)
                label = "outcomes"
            elif req_key == "perfect_sessions":
                current = stats.get("perfect_sessions", 0)
                label = "perfect sessions"
            elif req_key == "flashcards_reviewed":
                current = stats.get("flashcards_reviewed", 0)
                label = "flashcards"
            elif req_key == "subject_sessions":
                if subject_code:
                    current = stats.get("subject_sessions", {}).get(subject_code, 0)
                    label = "sessions"
                else:
                    continue

            # Calculate percentage (capped at 100)
            if target > 0:
                progress = min(Decimal("100"), Decimal(str(current * 100 / target)))
            else:
                progress = Decimal("100") if current > 0 else Decimal("0")

            # Format progress text
            progress_text = f"{current}/{target} {label}"

            return progress, progress_text

        return Decimal("0"), None

    async def count_unlocked(self, student_id: UUID) -> int:
        """Count unlocked achievements for a student.

        Args:
            student_id: The student ID.

        Returns:
            Number of unlocked achievements.
        """
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            return 0

        return len(student.gamification.get("achievements", []))

    async def count_total(self) -> int:
        """Count total available achievements.

        Returns:
            Total number of active achievements.
        """
        result = await self.db.execute(
            select(func.count(AchievementDefinition.id))
            .where(AchievementDefinition.is_active.is_(True))
        )
        return result.scalar() or 0
