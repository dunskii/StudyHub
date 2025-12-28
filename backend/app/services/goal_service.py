"""Goal service for family goal management.

Handles CRUD operations for family goals with:
- Ownership verification (parent can only manage their own children's goals)
- Progress tracking
- Achievement detection
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import Goal
from app.models.student import Student
from app.models.student_subject import StudentSubject
from app.schemas.goal import GoalCreate, GoalUpdate, GoalProgress, GoalResponse

logger = logging.getLogger(__name__)


class GoalService:
    """Service for family goal management."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialise with database session.

        Args:
            db: Async database session.
        """
        self.db = db

    # =========================================================================
    # CRUD Operations
    # =========================================================================

    async def create(self, parent_id: UUID, data: GoalCreate) -> Goal:
        """Create a new goal.

        Args:
            parent_id: The parent's user UUID.
            data: Goal creation data.

        Returns:
            The created goal.

        Raises:
            ValueError: If student not found or not owned by parent.
        """
        # Verify student ownership
        student = await self._verify_student_ownership(parent_id, data.student_id)
        if not student:
            raise ValueError(
                f"Student {data.student_id} not found or not owned by parent"
            )

        goal = Goal(
            parent_id=parent_id,
            student_id=data.student_id,
            title=data.title,
            description=data.description,
            target_outcomes=data.target_outcomes,
            target_mastery=data.target_mastery,
            target_date=data.target_date,
            reward=data.reward,
            is_active=True,
        )

        self.db.add(goal)
        await self.db.commit()
        await self.db.refresh(goal)

        logger.info(f"Created goal {goal.id} for student {data.student_id}")
        return goal

    async def get_by_id(self, goal_id: UUID, parent_id: UUID) -> Goal | None:
        """Get a goal by ID with ownership verification.

        Args:
            goal_id: The goal UUID.
            parent_id: The parent's user UUID.

        Returns:
            The goal if found and owned, None otherwise.
        """
        result = await self.db.execute(
            select(Goal)
            .where(Goal.id == goal_id)
            .where(Goal.parent_id == parent_id)
        )
        return result.scalar_one_or_none()

    async def get_for_student(
        self,
        student_id: UUID,
        parent_id: UUID,
        active_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Goal], int]:
        """Get goals for a student with ownership verification.

        Args:
            student_id: The student UUID.
            parent_id: The parent's user UUID.
            active_only: If True, only return active (non-achieved) goals.
            limit: Maximum number of goals to return.
            offset: Number of goals to skip.

        Returns:
            Tuple of (goals list, total count).
        """
        # Verify student ownership
        student = await self._verify_student_ownership(parent_id, student_id)
        if not student:
            return [], 0

        # Build query
        query = (
            select(Goal)
            .where(Goal.student_id == student_id)
            .where(Goal.parent_id == parent_id)
        )

        if active_only:
            query = query.where(Goal.is_active.is_(True))

        # Get total count
        count_query = (
            select(func.count(Goal.id))
            .where(Goal.student_id == student_id)
            .where(Goal.parent_id == parent_id)
        )
        if active_only:
            count_query = count_query.where(Goal.is_active.is_(True))
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Get goals with pagination
        query = query.order_by(Goal.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(query)
        goals = list(result.scalars().all())

        return goals, total

    async def get_all_for_parent(
        self,
        parent_id: UUID,
        active_only: bool = False,
    ) -> list[Goal]:
        """Get all goals for all students belonging to a parent.

        Args:
            parent_id: The parent's user UUID.
            active_only: If True, only return active goals.

        Returns:
            List of goals.
        """
        query = select(Goal).where(Goal.parent_id == parent_id)

        if active_only:
            query = query.where(Goal.is_active.is_(True))

        query = query.order_by(Goal.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update(
        self, goal_id: UUID, parent_id: UUID, data: GoalUpdate
    ) -> Goal | None:
        """Update a goal with ownership verification.

        Args:
            goal_id: The goal UUID.
            parent_id: The parent's user UUID.
            data: Update data.

        Returns:
            The updated goal or None if not found/not owned.
        """
        goal = await self.get_by_id(goal_id, parent_id)
        if not goal:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(goal, field, value)

        await self.db.commit()
        await self.db.refresh(goal)

        logger.info(f"Updated goal {goal_id}")
        return goal

    async def delete(self, goal_id: UUID, parent_id: UUID) -> bool:
        """Delete a goal with ownership verification.

        Args:
            goal_id: The goal UUID.
            parent_id: The parent's user UUID.

        Returns:
            True if deleted, False if not found/not owned.
        """
        goal = await self.get_by_id(goal_id, parent_id)
        if not goal:
            return False

        await self.db.delete(goal)
        await self.db.commit()

        logger.info(f"Deleted goal {goal_id}")
        return True

    # =========================================================================
    # Goal Progress
    # =========================================================================

    async def calculate_progress(self, goal: Goal) -> GoalProgress:
        """Calculate progress towards a goal.

        Args:
            goal: The goal to calculate progress for.

        Returns:
            Goal progress information.
        """
        current_mastery: Decimal | None = None
        outcomes_mastered = 0
        outcomes_total = 0
        progress_percentage = Decimal("0")

        if goal.target_outcomes:
            # Track progress based on target outcomes
            # In production, you'd query outcome-level mastery
            outcomes_total = len(goal.target_outcomes)
            # Simplified: use overall subject mastery as proxy
            result = await self.db.execute(
                select(StudentSubject)
                .where(StudentSubject.student_id == goal.student_id)
            )
            subjects = result.scalars().all()
            if subjects:
                avg = sum(ss.mastery_level for ss in subjects) / len(subjects)
            else:
                avg = 0
            current_mastery = Decimal(str(avg)) if avg else Decimal("0")
            outcomes_mastered = int(outcomes_total * float(current_mastery) / 100)

            if goal.target_mastery and goal.target_mastery != 0:
                progress_percentage = min(
                    Decimal("100"),
                    (current_mastery / goal.target_mastery) * 100
                )
            else:
                progress_percentage = current_mastery

        elif goal.target_mastery and goal.target_mastery != 0:
            # Track progress based on overall mastery target
            result = await self.db.execute(
                select(StudentSubject)
                .where(StudentSubject.student_id == goal.student_id)
            )
            subjects = result.scalars().all()
            if subjects:
                avg = sum(ss.mastery_level for ss in subjects) / len(subjects)
            else:
                avg = 0
            current_mastery = Decimal(str(avg)) if avg else Decimal("0")
            progress_percentage = min(
                Decimal("100"),
                (current_mastery / goal.target_mastery) * 100
            )

        # Calculate days remaining
        days_remaining = None
        if goal.target_date:
            delta = goal.target_date - date.today()
            days_remaining = delta.days

        # Determine if on track
        is_on_track = True
        if days_remaining is not None and days_remaining > 0 and goal.target_date:
            # Calculate expected progress
            total_days = (goal.target_date - goal.created_at.date()).days
            if total_days > 0:
                elapsed_days = total_days - days_remaining
                expected_progress = Decimal(str(elapsed_days * 100 / total_days))
                is_on_track = progress_percentage >= expected_progress * Decimal("0.8")

        return GoalProgress(
            current_mastery=current_mastery,
            progress_percentage=progress_percentage.quantize(Decimal("0.1")),
            outcomes_mastered=outcomes_mastered,
            outcomes_total=outcomes_total,
            days_remaining=days_remaining,
            is_on_track=is_on_track,
        )

    async def calculate_progress_batch(
        self, goals: list[Goal]
    ) -> dict[UUID, GoalProgress]:
        """Calculate progress for multiple goals efficiently.

        Prefetches all required student subject data in a single query
        to avoid N+1 query pattern.

        Args:
            goals: List of goals to calculate progress for.

        Returns:
            Dictionary mapping goal IDs to their progress.
        """
        if not goals:
            return {}

        # Collect all unique student IDs
        student_ids = list({goal.student_id for goal in goals})

        # Prefetch all student subjects in one query
        result = await self.db.execute(
            select(StudentSubject)
            .where(StudentSubject.student_id.in_(student_ids))
        )
        all_subjects = result.scalars().all()

        # Group subjects by student_id for quick lookup
        subjects_by_student: dict[UUID, list[StudentSubject]] = {}
        for subject in all_subjects:
            if subject.student_id not in subjects_by_student:
                subjects_by_student[subject.student_id] = []
            subjects_by_student[subject.student_id].append(subject)

        # Calculate progress for each goal using prefetched data
        progress_map: dict[UUID, GoalProgress] = {}
        today = date.today()

        for goal in goals:
            subjects = subjects_by_student.get(goal.student_id, [])
            current_mastery: Decimal | None = None
            outcomes_mastered = 0
            outcomes_total = 0
            progress_percentage = Decimal("0")

            if goal.target_outcomes:
                outcomes_total = len(goal.target_outcomes)
                if subjects:
                    avg = sum(ss.mastery_level for ss in subjects) / len(subjects)
                else:
                    avg = 0
                current_mastery = Decimal(str(avg)) if avg else Decimal("0")
                outcomes_mastered = int(outcomes_total * float(current_mastery) / 100)

                if goal.target_mastery and goal.target_mastery != 0:
                    progress_percentage = min(
                        Decimal("100"),
                        (current_mastery / goal.target_mastery) * 100
                    )
                else:
                    progress_percentage = current_mastery

            elif goal.target_mastery and goal.target_mastery != 0:
                if subjects:
                    avg = sum(ss.mastery_level for ss in subjects) / len(subjects)
                else:
                    avg = 0
                current_mastery = Decimal(str(avg)) if avg else Decimal("0")
                progress_percentage = min(
                    Decimal("100"),
                    (current_mastery / goal.target_mastery) * 100
                )

            # Calculate days remaining
            days_remaining = None
            if goal.target_date:
                delta = goal.target_date - today
                days_remaining = delta.days

            # Determine if on track
            is_on_track = True
            if days_remaining is not None and days_remaining > 0 and goal.target_date:
                total_days = (goal.target_date - goal.created_at.date()).days
                if total_days > 0:
                    elapsed_days = total_days - days_remaining
                    expected_progress = Decimal(str(elapsed_days * 100 / total_days))
                    is_on_track = progress_percentage >= expected_progress * Decimal("0.8")

            progress_map[goal.id] = GoalProgress(
                current_mastery=current_mastery,
                progress_percentage=progress_percentage.quantize(Decimal("0.1")),
                outcomes_mastered=outcomes_mastered,
                outcomes_total=outcomes_total,
                days_remaining=days_remaining,
                is_on_track=is_on_track,
            )

        return progress_map

    async def get_with_progress(
        self, goal_id: UUID, parent_id: UUID
    ) -> tuple[Goal, GoalProgress] | None:
        """Get a goal with its progress.

        Args:
            goal_id: The goal UUID.
            parent_id: The parent's user UUID.

        Returns:
            Tuple of (goal, progress) or None if not found.
        """
        goal = await self.get_by_id(goal_id, parent_id)
        if not goal:
            return None

        progress = await self.calculate_progress(goal)
        return goal, progress

    # =========================================================================
    # Achievement Detection
    # =========================================================================

    async def check_and_mark_achieved(self, goal_id: UUID, parent_id: UUID) -> bool:
        """Check if a goal has been achieved and mark it.

        Args:
            goal_id: The goal UUID.
            parent_id: The parent's user UUID.

        Returns:
            True if newly achieved, False otherwise.
        """
        goal = await self.get_by_id(goal_id, parent_id)
        if not goal or goal.achieved_at:
            return False

        progress = await self.calculate_progress(goal)

        # Check if achieved
        achieved = False
        if progress.progress_percentage >= Decimal("100"):
            achieved = True
        elif goal.target_mastery and progress.current_mastery:
            if progress.current_mastery >= goal.target_mastery:
                achieved = True

        if achieved:
            goal.achieved_at = datetime.now(timezone.utc)
            goal.is_active = False
            await self.db.commit()
            await self.db.refresh(goal)
            logger.info(f"Goal {goal_id} achieved!")
            return True

        return False

    async def check_all_goals_for_student(
        self, student_id: UUID, parent_id: UUID
    ) -> list[Goal]:
        """Check all active goals for a student and mark achieved ones.

        Args:
            student_id: The student UUID.
            parent_id: The parent's user UUID.

        Returns:
            List of newly achieved goals.
        """
        goals, _ = await self.get_for_student(
            student_id, parent_id, active_only=True
        )

        achieved_goals = []
        for goal in goals:
            if await self.check_and_mark_achieved(goal.id, parent_id):
                await self.db.refresh(goal)
                achieved_goals.append(goal)

        return achieved_goals

    # =========================================================================
    # Statistics
    # =========================================================================

    async def count_active_goals(self, parent_id: UUID) -> int:
        """Count active goals for all children.

        Args:
            parent_id: The parent's user UUID.

        Returns:
            Number of active goals.
        """
        result = await self.db.execute(
            select(func.count(Goal.id))
            .where(Goal.parent_id == parent_id)
            .where(Goal.is_active.is_(True))
        )
        return result.scalar() or 0

    async def count_achieved_this_week(self, parent_id: UUID) -> int:
        """Count goals achieved this week.

        Args:
            parent_id: The parent's user UUID.

        Returns:
            Number of goals achieved this week.
        """
        # Get week start (Monday)
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_start_dt = datetime.combine(
            week_start, datetime.min.time(), tzinfo=timezone.utc
        )

        result = await self.db.execute(
            select(func.count(Goal.id))
            .where(Goal.parent_id == parent_id)
            .where(Goal.achieved_at >= week_start_dt)
        )
        return result.scalar() or 0

    # =========================================================================
    # Helper Methods
    # =========================================================================

    async def _verify_student_ownership(
        self, parent_id: UUID, student_id: UUID
    ) -> Student | None:
        """Verify that a student belongs to a parent.

        Args:
            parent_id: The parent's user UUID.
            student_id: The student UUID.

        Returns:
            The student if owned by parent, None otherwise.
        """
        result = await self.db.execute(
            select(Student)
            .where(Student.id == student_id)
            .where(Student.parent_id == parent_id)
        )
        return result.scalar_one_or_none()
