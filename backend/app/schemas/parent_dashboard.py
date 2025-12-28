"""Parent dashboard schemas for progress overview and analytics."""
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import Field

from app.schemas.base import BaseSchema
from app.schemas.weekly_insight import WeeklyInsightsData


# =============================================================================
# Student Summary for Dashboard
# =============================================================================


class DashboardStudentSummary(BaseSchema):
    """Student summary for parent dashboard."""

    id: UUID
    display_name: str
    grade_level: int
    school_stage: str
    framework_id: UUID | None = None
    # Gamification stats
    total_xp: int = 0
    level: int = 1
    current_streak: int = 0
    longest_streak: int = 0
    # Activity
    last_active_at: datetime | None = None
    sessions_this_week: int = 0
    study_time_this_week_minutes: int = 0


# =============================================================================
# Progress Metrics
# =============================================================================


class WeeklyStats(BaseSchema):
    """Weekly study statistics."""

    study_time_minutes: int = Field(0, ge=0, description="Total study time in minutes")
    study_goal_minutes: int = Field(
        150, ge=0, description="Weekly study goal in minutes (default 2.5 hrs)"
    )
    sessions_count: int = Field(0, ge=0, description="Number of study sessions")
    topics_covered: int = Field(0, ge=0, description="Unique topics/outcomes worked on")
    mastery_improvement: Decimal = Field(
        default=Decimal("0"), description="Mastery change this week (can be negative)"
    )
    flashcards_reviewed: int = Field(0, ge=0, description="Flashcards reviewed")
    questions_answered: int = Field(0, ge=0, description="Questions answered in sessions")
    accuracy_percentage: Decimal | None = Field(
        None, ge=0, le=100, description="Answer accuracy percentage"
    )

    @property
    def goal_progress_percentage(self) -> Decimal:
        """Calculate progress towards weekly goal."""
        if self.study_goal_minutes <= 0:
            return Decimal("100")
        return min(
            Decimal("100"),
            Decimal(str(self.study_time_minutes * 100 / self.study_goal_minutes)),
        )


class StrandProgress(BaseSchema):
    """Progress within a curriculum strand."""

    strand: str = Field(..., description="Strand name (e.g., 'Number & Algebra')")
    strand_code: str | None = Field(None, description="Strand code if available")
    mastery: Decimal = Field(..., ge=0, le=100, description="Mastery percentage")
    outcomes_mastered: int = Field(0, ge=0, description="Outcomes at mastery level")
    outcomes_in_progress: int = Field(0, ge=0, description="Outcomes being worked on")
    outcomes_total: int = Field(0, ge=0, description="Total outcomes in strand")
    trend: Literal["improving", "stable", "declining"] = Field(
        default="stable", description="Recent trend"
    )


class SubjectProgress(BaseSchema):
    """Progress within a subject."""

    subject_id: UUID
    subject_code: str
    subject_name: str
    subject_color: str | None = None
    mastery_level: Decimal = Field(..., ge=0, le=100, description="Overall mastery")
    strand_progress: list[StrandProgress] = Field(
        default_factory=list, description="Progress by strand"
    )
    recent_activity: datetime | None = Field(None, description="Last activity in subject")
    sessions_this_week: int = 0
    time_spent_this_week_minutes: int = 0
    xp_earned_this_week: int = 0
    current_focus_outcomes: list[str] = Field(
        default_factory=list, description="Outcomes currently being focused on"
    )


class FoundationStrength(BaseSchema):
    """Foundation strength assessment."""

    overall_strength: Decimal = Field(
        ..., ge=0, le=100, description="Overall foundation strength percentage"
    )
    prior_year_mastery: Decimal = Field(
        ..., ge=0, le=100, description="Mastery of prior year outcomes"
    )
    gaps_identified: int = Field(0, ge=0, description="Number of foundation gaps")
    critical_gaps: list[str] = Field(
        default_factory=list, description="Critical gap descriptions"
    )
    strengths: list[str] = Field(
        default_factory=list, description="Foundation strengths"
    )


# =============================================================================
# Dashboard Overview Response
# =============================================================================


class DashboardOverviewResponse(BaseSchema):
    """Main parent dashboard overview."""

    # Students
    students: list[DashboardStudentSummary] = Field(
        ..., description="Summary of all children"
    )
    # Aggregate stats
    total_study_time_week_minutes: int = Field(
        0, description="Combined study time this week"
    )
    total_sessions_week: int = Field(0, description="Combined sessions this week")
    # Notifications
    unread_notifications: int = Field(0, ge=0, description="Unread notification count")
    # Quick insights
    active_goals_count: int = Field(0, ge=0, description="Number of active goals")
    achievements_this_week: int = Field(0, ge=0, description="Achievements unlocked this week")


# =============================================================================
# Student Progress Response
# =============================================================================


class StudentProgressResponse(BaseSchema):
    """Detailed progress for a single student."""

    student_id: UUID
    student_name: str
    grade_level: int
    school_stage: str
    framework_code: str | None = None
    # Overall metrics
    overall_mastery: Decimal = Field(..., ge=0, le=100, description="Overall curriculum mastery")
    foundation_strength: FoundationStrength
    # Weekly breakdown
    weekly_stats: WeeklyStats
    # Subject breakdown
    subject_progress: list[SubjectProgress] = Field(
        default_factory=list, description="Progress by subject"
    )
    # Comparison
    mastery_change_30_days: Decimal = Field(
        default=Decimal("0"), description="Mastery change over last 30 days"
    )
    # Current focus
    current_focus_subjects: list[str] = Field(
        default_factory=list, description="Subjects currently being focused on"
    )


# =============================================================================
# Subject Detail Response
# =============================================================================


class SubjectProgressDetailResponse(BaseSchema):
    """Detailed progress for a single subject."""

    student_id: UUID
    student_name: str
    subject_id: UUID
    subject_code: str
    subject_name: str
    subject_color: str | None = None
    # Mastery
    overall_mastery: Decimal = Field(..., ge=0, le=100)
    strand_progress: list[StrandProgress]
    # Activity
    weekly_stats: WeeklyStats
    recent_sessions: list[dict[str, Any]] = Field(
        default_factory=list, description="Recent session summaries"
    )
    # Outcomes
    outcomes_mastered: int = 0
    outcomes_in_progress: int = 0
    outcomes_not_started: int = 0
    outcomes_total: int = 0
    # Focus outcomes
    current_focus_outcomes: list[dict[str, Any]] = Field(
        default_factory=list, description="Current focus outcomes with details"
    )
    # Pathway (Stage 5 Maths only)
    pathway: str | None = Field(None, description="5.1, 5.2, or 5.3 for Stage 5 Maths")
    # HSC (Stage 6 only)
    hsc_course_name: str | None = None
    predicted_band: int | None = Field(None, ge=1, le=6)


# =============================================================================
# Weekly Summary (for email)
# =============================================================================


class WeeklySummaryResponse(BaseSchema):
    """Weekly summary for email delivery."""

    student_id: UUID
    student_name: str
    week_start: date
    week_end: date
    # Stats
    weekly_stats: WeeklyStats
    # Subject highlights
    top_subjects: list[dict[str, Any]] = Field(
        default_factory=list, description="Top performing subjects"
    )
    needs_attention: list[dict[str, Any]] = Field(
        default_factory=list, description="Subjects needing attention"
    )
    # Insights
    insights: WeeklyInsightsData | None = None
    # Goals
    goals_progress: list[dict[str, Any]] = Field(
        default_factory=list, description="Active goals progress"
    )
    goals_achieved_this_week: list[dict[str, Any]] = Field(
        default_factory=list, description="Goals achieved this week"
    )
    # Achievements
    achievements_unlocked: list[str] = Field(
        default_factory=list, description="Achievements unlocked this week"
    )
    # Actions
    suggested_actions: list[str] = Field(
        default_factory=list, description="Suggested actions for parents"
    )


class SendWeeklySummaryRequest(BaseSchema):
    """Request to send weekly summary email."""

    student_id: UUID
    week_start: date | None = Field(
        None, description="Week to send summary for (defaults to last week)"
    )
    send_now: bool = Field(
        True, description="Send immediately or queue for preferred time"
    )


class SendWeeklySummaryResponse(BaseSchema):
    """Response after sending weekly summary."""

    success: bool
    message: str
    email_sent_to: str | None = None
    sent_at: datetime | None = None
