"""Parent analytics service for dashboard progress calculations.

Provides aggregated analytics for parent dashboard including:
- Overall mastery calculations
- Weekly statistics
- Subject and strand progress
- Foundation strength assessment
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import Session
from app.models.student import Student
from app.models.student_subject import StudentSubject
from app.models.subject import Subject
from app.models.flashcard import Flashcard
from app.models.revision_history import RevisionHistory
from app.models.curriculum_outcome import CurriculumOutcome
from app.schemas.parent_dashboard import (
    DashboardStudentSummary,
    WeeklyStats,
    SubjectProgress,
    StrandProgress,
    FoundationStrength,
    StudentProgressResponse,
)

logger = logging.getLogger(__name__)


class ParentAnalyticsService:
    """Service for parent dashboard analytics and progress calculations."""

    # Instance-level framework cache to avoid repeated lookups within same request
    _framework_cache: dict[UUID, str | None] = {}

    def __init__(self, db: AsyncSession) -> None:
        """Initialise with database session.

        Args:
            db: Async database session.
        """
        self.db = db
        # Clear cache for each new service instance (per-request)
        self._framework_cache = {}

    async def _get_framework_code_cached(self, framework_id: UUID | None) -> str | None:
        """Get framework code with caching.

        Args:
            framework_id: The framework UUID.

        Returns:
            Framework code string or None.
        """
        if not framework_id:
            return None

        if framework_id in self._framework_cache:
            return self._framework_cache[framework_id]

        from app.models.curriculum_framework import CurriculumFramework

        framework = await self.db.get(CurriculumFramework, framework_id)
        code = framework.code if framework else None
        self._framework_cache[framework_id] = code
        return code

    # =========================================================================
    # Student Summary
    # =========================================================================

    async def get_student_summary(
        self, student_id: UUID, parent_id: UUID
    ) -> DashboardStudentSummary | None:
        """Get a summary of a student for the dashboard with ownership verification.

        Args:
            student_id: The student UUID.
            parent_id: The parent's UUID for ownership verification.

        Returns:
            Student summary or None if not found or not owned by parent.
        """
        # Verify ownership
        result = await self.db.execute(
            select(Student)
            .where(Student.id == student_id)
            .where(Student.parent_id == parent_id)
        )
        student = result.scalar_one_or_none()
        if not student:
            return None

        return await self._build_student_summary(student)

    async def _build_student_summary(
        self, student: Student
    ) -> DashboardStudentSummary:
        """Build a student summary from a verified student object.

        Internal method - caller must verify ownership.

        Args:
            student: The verified Student object.

        Returns:
            Student summary.
        """
        # Get weekly stats
        week_start = self._get_week_start()
        weekly_sessions = await self._count_sessions_since(student.id, week_start)
        weekly_time = await self._sum_session_time_since(student.id, week_start)

        # Extract gamification data
        gamification = student.gamification or {}
        streaks = gamification.get("streaks", {})

        return DashboardStudentSummary(
            id=student.id,
            display_name=student.display_name,
            grade_level=student.grade_level,
            school_stage=student.school_stage,
            framework_id=student.framework_id,
            total_xp=gamification.get("totalXP", 0),
            level=gamification.get("level", 1),
            current_streak=streaks.get("current", 0),
            longest_streak=streaks.get("longest", 0),
            last_active_at=student.last_active_at,
            sessions_this_week=weekly_sessions,
            study_time_this_week_minutes=weekly_time,
        )

    async def get_students_summary(
        self, parent_id: UUID
    ) -> list[DashboardStudentSummary]:
        """Get summaries for all students belonging to a parent.

        Uses batch prefetching to avoid N+1 queries.

        Args:
            parent_id: The parent's user UUID.

        Returns:
            List of student summaries.
        """
        # Get all students for parent
        result = await self.db.execute(
            select(Student)
            .where(Student.parent_id == parent_id)
            .order_by(Student.display_name)
        )
        students = result.scalars().all()

        if not students:
            return []

        # Batch prefetch: sessions count and time per student
        student_ids = [s.id for s in students]
        week_start = self._get_week_start()
        week_start_dt = datetime.combine(
            week_start, datetime.min.time(), tzinfo=timezone.utc
        )

        # Batch prefetch: sessions count per student
        sessions_result = await self.db.execute(
            select(Session.student_id, func.count(Session.id))
            .where(Session.student_id.in_(student_ids))
            .where(Session.started_at >= week_start_dt)
            .group_by(Session.student_id)
        )
        sessions_by_student = dict(sessions_result.all())

        # Batch prefetch: study time per student
        time_result = await self.db.execute(
            select(
                Session.student_id,
                func.coalesce(func.sum(Session.duration_minutes), 0)
            )
            .where(Session.student_id.in_(student_ids))
            .where(Session.started_at >= week_start_dt)
            .group_by(Session.student_id)
        )
        time_by_student = dict(time_result.all())

        # Build summaries from in-memory data
        summaries = []
        for student in students:
            gamification = student.gamification or {}
            streaks = gamification.get("streaks", {})

            summaries.append(DashboardStudentSummary(
                id=student.id,
                display_name=student.display_name,
                grade_level=student.grade_level,
                school_stage=student.school_stage,
                framework_id=student.framework_id,
                total_xp=gamification.get("totalXP", 0),
                level=gamification.get("level", 1),
                current_streak=streaks.get("current", 0),
                longest_streak=streaks.get("longest", 0),
                last_active_at=student.last_active_at,
                sessions_this_week=sessions_by_student.get(student.id, 0),
                study_time_this_week_minutes=int(
                    time_by_student.get(student.id, 0) or 0
                ),
            ))

        return summaries

    # =========================================================================
    # Weekly Statistics
    # =========================================================================

    async def get_weekly_stats(
        self, student_id: UUID, week_start: date | None = None
    ) -> WeeklyStats:
        """Get weekly study statistics for a student.

        Args:
            student_id: The student UUID.
            week_start: Start of the week (Monday). Defaults to current week.

        Returns:
            Weekly statistics.
        """
        if week_start is None:
            week_start = self._get_week_start()

        week_end = week_start + timedelta(days=7)
        week_start_dt = datetime.combine(week_start, datetime.min.time(), tzinfo=timezone.utc)
        week_end_dt = datetime.combine(week_end, datetime.min.time(), tzinfo=timezone.utc)

        # Get session stats
        session_result = await self.db.execute(
            select(
                func.count(Session.id).label("session_count"),
                func.coalesce(func.sum(Session.duration_minutes), 0).label("total_minutes"),
            )
            .where(Session.student_id == student_id)
            .where(Session.started_at >= week_start_dt)
            .where(Session.started_at < week_end_dt)
        )
        session_row = session_result.one()
        sessions_count = int(session_row.session_count or 0)
        study_time = int(session_row.total_minutes or 0)

        # Get topics covered (unique outcomes worked on)
        topics_result = await self.db.execute(
            select(Session.data)
            .where(Session.student_id == student_id)
            .where(Session.started_at >= week_start_dt)
            .where(Session.started_at < week_end_dt)
        )
        topics_covered = set()
        questions_answered = 0
        questions_correct = 0
        for row in topics_result.scalars():
            if row and isinstance(row, dict):
                outcomes = row.get("outcomesWorkedOn", [])
                topics_covered.update(outcomes)
                questions_answered += row.get("questionsAttempted", 0)
                questions_correct += row.get("questionsCorrect", 0)

        # Get flashcards reviewed
        flashcard_result = await self.db.execute(
            select(func.count(RevisionHistory.id))
            .where(RevisionHistory.student_id == student_id)
            .where(RevisionHistory.created_at >= week_start_dt)
            .where(RevisionHistory.created_at < week_end_dt)
        )
        flashcards_reviewed = flashcard_result.scalar() or 0

        # Calculate mastery improvement (compare to previous week)
        current_mastery = await self.get_overall_mastery(student_id)
        previous_week_start = week_start - timedelta(days=7)
        # For simplicity, we'll use 0 as baseline for improvement
        # In production, you'd store historical mastery snapshots
        mastery_improvement = Decimal("0")

        # Get study goal from student preferences
        student = await self.db.get(Student, student_id)
        study_goal = 150  # Default 2.5 hours/week
        if student and student.preferences:
            daily_goal = student.preferences.get("dailyGoalMinutes", 30)
            study_goal = daily_goal * 5  # Assume 5 study days per week

        # Calculate accuracy
        accuracy = None
        if questions_answered > 0:
            accuracy = Decimal(str(questions_correct * 100 / questions_answered)).quantize(
                Decimal("0.1")
            )

        return WeeklyStats(
            study_time_minutes=int(study_time),
            study_goal_minutes=study_goal,
            sessions_count=sessions_count,
            topics_covered=len(topics_covered),
            mastery_improvement=mastery_improvement,
            flashcards_reviewed=flashcards_reviewed,
            questions_answered=questions_answered,
            accuracy_percentage=accuracy,
        )

    # =========================================================================
    # Mastery Calculations
    # =========================================================================

    async def get_overall_mastery(self, student_id: UUID) -> Decimal:
        """Calculate overall curriculum mastery for a student.

        Aggregates mastery across all enrolled subjects.

        Args:
            student_id: The student UUID.

        Returns:
            Overall mastery percentage (0-100).
        """
        # Get all enrolled subjects and calculate average mastery
        result = await self.db.execute(
            select(StudentSubject)
            .where(StudentSubject.student_id == student_id)
        )
        subjects = result.scalars().all()

        if not subjects:
            return Decimal("0")

        total_mastery = sum(ss.mastery_level for ss in subjects)
        avg_mastery = total_mastery / len(subjects)
        return Decimal(str(avg_mastery)).quantize(Decimal("0.1"))

    async def get_subject_progress(
        self, student_id: UUID
    ) -> list[SubjectProgress]:
        """Get progress for all enrolled subjects.

        Args:
            student_id: The student UUID.

        Returns:
            List of subject progress.
        """
        # Get enrolled subjects with details
        result = await self.db.execute(
            select(StudentSubject, Subject)
            .join(Subject, StudentSubject.subject_id == Subject.id)
            .where(StudentSubject.student_id == student_id)
            .order_by(Subject.display_order, Subject.name)
        )
        rows = result.all()

        progress_list = []
        week_start = self._get_week_start()

        for student_subject, subject in rows:
            # Get strand progress
            strands = await self._get_strand_progress(student_id, subject.id)

            # Get weekly stats for this subject
            weekly_sessions = await self._count_sessions_since(
                student_id, week_start, subject.id
            )
            weekly_time = await self._sum_session_time_since(
                student_id, week_start, subject.id
            )
            weekly_xp = await self._sum_xp_since(student_id, week_start, subject.id)

            # Get subject config for color
            config = subject.config or {}

            progress = SubjectProgress(
                subject_id=subject.id,
                subject_code=subject.code,
                subject_name=subject.name,
                subject_color=config.get("color"),
                mastery_level=Decimal(str(student_subject.mastery_level or 0)),
                strand_progress=strands,
                recent_activity=student_subject.last_activity_at,
                sessions_this_week=weekly_sessions,
                time_spent_this_week_minutes=weekly_time,
                xp_earned_this_week=weekly_xp,
                current_focus_outcomes=student_subject.current_focus_outcomes or [],
            )
            progress_list.append(progress)

        return progress_list

    async def _get_strand_progress(
        self, student_id: UUID, subject_id: UUID
    ) -> list[StrandProgress]:
        """Get progress by curriculum strand for a subject.

        Args:
            student_id: The student UUID.
            subject_id: The subject UUID.

        Returns:
            List of strand progress.
        """
        # Get student's grade and framework for filtering outcomes
        student = await self.db.get(Student, student_id)
        if not student:
            return []

        # Get outcomes for this subject grouped by strand
        result = await self.db.execute(
            select(
                CurriculumOutcome.strand,
                func.count(CurriculumOutcome.id).label("total"),
            )
            .where(CurriculumOutcome.subject_id == subject_id)
            .where(CurriculumOutcome.framework_id == student.framework_id)
            .group_by(CurriculumOutcome.strand)
        )
        strands_data = result.all()

        strands = []
        for strand_name, total_outcomes in strands_data:
            if not strand_name:
                continue

            # Get mastery for outcomes in this strand
            # For now, we'll use a simplified calculation
            # In production, you'd track outcome-level mastery
            student_subject = await self.db.execute(
                select(StudentSubject)
                .where(StudentSubject.student_id == student_id)
                .where(StudentSubject.subject_id == subject_id)
            )
            ss = student_subject.scalar_one_or_none()

            # Estimate strand mastery based on overall subject mastery
            # This is a simplification - real implementation would track per-outcome
            mastery = Decimal(str(ss.mastery_level if ss else 0))

            # Estimate mastered vs in progress
            mastered = int(total_outcomes * float(mastery) / 100)
            in_progress = min(total_outcomes - mastered, int(total_outcomes * 0.3))

            strands.append(
                StrandProgress(
                    strand=strand_name,
                    strand_code=None,  # Could extract from outcome codes
                    mastery=mastery,
                    outcomes_mastered=mastered,
                    outcomes_in_progress=in_progress,
                    outcomes_total=total_outcomes,
                    trend="stable",  # Would calculate from historical data
                )
            )

        return strands

    # =========================================================================
    # Foundation Strength
    # =========================================================================

    async def get_foundation_strength(self, student_id: UUID) -> FoundationStrength:
        """Assess foundation strength (prior year mastery).

        Args:
            student_id: The student UUID.

        Returns:
            Foundation strength assessment.
        """
        student = await self.db.get(Student, student_id)
        if not student:
            return FoundationStrength(
                overall_strength=Decimal("0"),
                prior_year_mastery=Decimal("0"),
                gaps_identified=0,
                critical_gaps=[],
                strengths=[],
            )

        # Get current mastery as a proxy for foundation strength
        overall_mastery = await self.get_overall_mastery(student_id)

        # In production, you'd analyse prior year outcomes specifically
        # For now, we estimate based on current mastery
        prior_year_mastery = overall_mastery * Decimal("0.9")  # Assume 90% of current

        # Calculate foundation strength
        # Strong foundation if prior year mastery > 70%
        overall_strength = min(prior_year_mastery * Decimal("1.2"), Decimal("100"))

        # Identify gaps (simplified)
        gaps_identified = 0
        critical_gaps = []
        strengths = []

        if overall_mastery < Decimal("50"):
            gaps_identified = 3
            critical_gaps = [
                "Foundation concepts need reinforcement",
                "Consider reviewing prior year material",
            ]
        elif overall_mastery < Decimal("70"):
            gaps_identified = 1
            critical_gaps = ["Some foundation areas need attention"]
        else:
            strengths = ["Strong foundation in core concepts"]

        return FoundationStrength(
            overall_strength=overall_strength.quantize(Decimal("0.1")),
            prior_year_mastery=prior_year_mastery.quantize(Decimal("0.1")),
            gaps_identified=gaps_identified,
            critical_gaps=critical_gaps,
            strengths=strengths,
        )

    # =========================================================================
    # Full Progress Report
    # =========================================================================

    async def get_student_progress(
        self, student_id: UUID, parent_id: UUID
    ) -> StudentProgressResponse | None:
        """Get comprehensive progress report for a student.

        Args:
            student_id: The student UUID.
            parent_id: The parent's UUID (for ownership verification).

        Returns:
            Full progress report or None if not found/not owned.
        """
        # Verify ownership
        student = await self.db.execute(
            select(Student)
            .where(Student.id == student_id)
            .where(Student.parent_id == parent_id)
        )
        student_obj = student.scalar_one_or_none()
        if not student_obj:
            return None

        # Gather all progress data
        overall_mastery = await self.get_overall_mastery(student_id)
        foundation = await self.get_foundation_strength(student_id)
        weekly_stats = await self.get_weekly_stats(student_id)
        subject_progress = await self.get_subject_progress(student_id)

        # Calculate 30-day mastery change (simplified)
        mastery_change_30_days = Decimal("0")  # Would calculate from historical data

        # Get current focus subjects
        current_focus_subjects = [
            sp.subject_name
            for sp in subject_progress
            if sp.sessions_this_week > 0
        ][:3]

        # Get framework code (cached)
        framework_code = await self._get_framework_code_cached(student_obj.framework_id)

        return StudentProgressResponse(
            student_id=student_obj.id,
            student_name=student_obj.display_name,
            grade_level=student_obj.grade_level,
            school_stage=student_obj.school_stage,
            framework_code=framework_code,
            overall_mastery=overall_mastery,
            foundation_strength=foundation,
            weekly_stats=weekly_stats,
            subject_progress=subject_progress,
            mastery_change_30_days=mastery_change_30_days,
            current_focus_subjects=current_focus_subjects,
        )

    # =========================================================================
    # Aggregate Stats for Dashboard Overview
    # =========================================================================

    async def get_aggregate_stats(
        self, parent_id: UUID
    ) -> tuple[int, int]:
        """Get aggregate stats across all children.

        Args:
            parent_id: The parent's UUID.

        Returns:
            Tuple of (total_study_time_minutes, total_sessions) this week.
        """
        week_start = self._get_week_start()
        week_start_dt = datetime.combine(
            week_start, datetime.min.time(), tzinfo=timezone.utc
        )

        result = await self.db.execute(
            select(
                func.coalesce(func.sum(Session.duration_minutes), 0).label("total_time"),
                func.count(Session.id).label("total_sessions"),
            )
            .join(Student, Session.student_id == Student.id)
            .where(Student.parent_id == parent_id)
            .where(Session.started_at >= week_start_dt)
        )
        row = result.one()
        return int(row.total_time or 0), int(row.total_sessions or 0)

    # =========================================================================
    # Helper Methods
    # =========================================================================

    def _get_week_start(self, for_date: date | None = None) -> date:
        """Get Monday of the week for a given date.

        Args:
            for_date: The date (defaults to today).

        Returns:
            Monday of that week.
        """
        if for_date is None:
            for_date = date.today()
        days_since_monday = for_date.weekday()
        return for_date - timedelta(days=days_since_monday)

    async def _count_sessions_since(
        self,
        student_id: UUID,
        since_date: date,
        subject_id: UUID | None = None,
    ) -> int:
        """Count sessions since a date.

        Args:
            student_id: The student UUID.
            since_date: Count sessions from this date.
            subject_id: Optional filter by subject.

        Returns:
            Session count.
        """
        since_dt = datetime.combine(since_date, datetime.min.time(), tzinfo=timezone.utc)
        query = (
            select(func.count(Session.id))
            .where(Session.student_id == student_id)
            .where(Session.started_at >= since_dt)
        )
        if subject_id:
            query = query.where(Session.subject_id == subject_id)

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _sum_session_time_since(
        self,
        student_id: UUID,
        since_date: date,
        subject_id: UUID | None = None,
    ) -> int:
        """Sum session duration since a date.

        Args:
            student_id: The student UUID.
            since_date: Sum time from this date.
            subject_id: Optional filter by subject.

        Returns:
            Total minutes.
        """
        since_dt = datetime.combine(since_date, datetime.min.time(), tzinfo=timezone.utc)
        query = (
            select(func.coalesce(func.sum(Session.duration_minutes), 0))
            .where(Session.student_id == student_id)
            .where(Session.started_at >= since_dt)
        )
        if subject_id:
            query = query.where(Session.subject_id == subject_id)

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _sum_xp_since(
        self,
        student_id: UUID,
        since_date: date,
        subject_id: UUID | None = None,
    ) -> int:
        """Sum XP earned since a date.

        Args:
            student_id: The student UUID.
            since_date: Sum XP from this date.
            subject_id: Optional filter by subject.

        Returns:
            Total XP.
        """
        since_dt = datetime.combine(since_date, datetime.min.time(), tzinfo=timezone.utc)
        query = (
            select(func.coalesce(func.sum(Session.xp_earned), 0))
            .where(Session.student_id == student_id)
            .where(Session.started_at >= since_dt)
        )
        if subject_id:
            query = query.where(Session.subject_id == subject_id)

        result = await self.db.execute(query)
        return result.scalar() or 0
