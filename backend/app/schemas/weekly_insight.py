"""Weekly insight schemas for AI-generated parent insights."""
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import Field

from app.schemas.base import BaseSchema, IDMixin


# Priority levels for insights
InsightPriorityEnum = Literal["low", "medium", "high"]


# =============================================================================
# Insight Item Schemas
# =============================================================================


class InsightItem(BaseSchema):
    """Individual insight item."""

    title: str = Field(..., max_length=255, description="Insight title")
    description: str = Field(..., max_length=1000, description="Insight description")
    subject_id: UUID | None = Field(default=None, description="Related subject if applicable")
    subject_name: str | None = Field(default=None, description="Subject name for display")
    priority: InsightPriorityEnum = Field(default="medium", description="Insight priority")
    outcome_codes: list[str] = Field(
        default_factory=list, description="Related curriculum outcome codes"
    )


class RecommendationItem(BaseSchema):
    """Actionable recommendation."""

    title: str = Field(..., max_length=255, description="Recommendation title")
    description: str = Field(..., max_length=1000, description="What to do")
    action_type: str = Field(
        default="practice", description="Type of action (practice, review, focus, etc.)"
    )
    subject_id: UUID | None = None
    estimated_time_minutes: int | None = Field(
        None, ge=5, le=120, description="Estimated time to complete"
    )
    priority: InsightPriorityEnum = "medium"


# =============================================================================
# Pathway & HSC Projections
# =============================================================================


class PathwayReadiness(BaseSchema):
    """Stage 5 pathway readiness assessment."""

    current_pathway: str = Field(..., description="Current pathway (5.1, 5.2, 5.3)")
    recommended_pathway: str | None = Field(None, description="Recommended pathway based on performance")
    ready_for_higher: bool = Field(False, description="Whether student is ready for higher pathway")
    blocking_gaps: list[str] = Field(
        default_factory=list, description="Foundation gaps blocking progression"
    )
    strengths: list[str] = Field(default_factory=list, description="Areas of strength")
    recommendation: str = Field(..., description="Overall recommendation text")
    confidence: Decimal = Field(
        default=Decimal("0.7"), ge=0, le=1, description="Confidence in assessment"
    )


class HSCProjection(BaseSchema):
    """Stage 6 HSC band projection."""

    predicted_band: int = Field(..., ge=1, le=6, description="Predicted HSC band (1-6)")
    band_range: str = Field(..., description="Mark range (e.g., '76-84')")
    current_average: Decimal | None = Field(None, description="Current assessment average")
    atar_contribution: Decimal | None = Field(
        None, description="Estimated ATAR contribution"
    )
    days_until_hsc: int = Field(..., ge=0, description="Days until HSC exams")
    strengths: list[str] = Field(default_factory=list, description="Topic strengths")
    focus_areas: list[str] = Field(default_factory=list, description="Areas needing focus")
    exam_readiness: Decimal = Field(
        default=Decimal("0.5"), ge=0, le=1, description="Exam readiness score"
    )
    trajectory: str = Field(
        default="stable", description="Trend direction (improving, stable, declining)"
    )


# =============================================================================
# Weekly Insights Response
# =============================================================================


class WeeklyInsightsData(BaseSchema):
    """The actual insights content (stored in JSONB)."""

    wins: list[InsightItem] = Field(
        default_factory=list, description="Achievements this week"
    )
    areas_to_watch: list[InsightItem] = Field(
        default_factory=list, description="Areas needing attention"
    )
    recommendations: list[RecommendationItem] = Field(
        default_factory=list, description="Actionable recommendations"
    )
    teacher_talking_points: list[str] = Field(
        default_factory=list, description="Curriculum-aligned talking points for parent-teacher meetings"
    )
    pathway_readiness: PathwayReadiness | None = Field(
        None, description="Stage 5 pathway assessment"
    )
    hsc_projection: HSCProjection | None = Field(
        None, description="Stage 6 HSC projection"
    )
    summary: str | None = Field(None, max_length=500, description="Brief weekly summary")


class WeeklyInsightResponse(IDMixin):
    """Schema for weekly insight response."""

    model_config = {"from_attributes": True}

    student_id: UUID
    week_start: date = Field(..., description="Monday of the insight week")
    insights: WeeklyInsightsData
    model_used: str = "claude-3-5-haiku"
    tokens_used: int | None = None
    cost_estimate: Decimal | None = Field(None, description="Generation cost in USD")
    generated_at: datetime
    sent_to_parent_at: datetime | None = None

    @property
    def is_sent(self) -> bool:
        """Check if insight has been sent to parent."""
        return self.sent_to_parent_at is not None

    @property
    def is_current_week(self) -> bool:
        """Check if this is the current week's insight."""
        from datetime import timedelta
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        return self.week_start == week_start


class WeeklyInsightCreate(BaseSchema):
    """Schema for creating a weekly insight (internal use)."""

    student_id: UUID
    week_start: date
    insights: WeeklyInsightsData
    model_used: str = "claude-3-5-haiku"
    tokens_used: int | None = None
    cost_estimate: Decimal | None = None


class WeeklyInsightListResponse(BaseSchema):
    """Schema for list of weekly insights."""

    insights: list[WeeklyInsightResponse]
    total: int


class WeeklyInsightsResponse(BaseSchema):
    """Simplified weekly insights response for API."""

    student_id: UUID
    week_start: date
    insights: WeeklyInsightsData
    generated_at: datetime


class InsightGenerationRequest(BaseSchema):
    """Schema for requesting insight generation."""

    student_id: UUID
    week_start: date | None = Field(
        None, description="Week to generate insights for (defaults to current week)"
    )
    force_regenerate: bool = Field(
        False, description="Force regeneration even if insights exist"
    )
