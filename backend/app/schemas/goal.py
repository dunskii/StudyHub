"""Goal schemas for family goal setting."""
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.base import BaseSchema, IDMixin, TimestampMixin


class GoalBase(BaseSchema):
    """Base goal schema."""

    title: str = Field(..., min_length=1, max_length=255, description="Goal title")
    description: str | None = Field(None, max_length=2000, description="Goal description")
    target_outcomes: list[str] | None = Field(
        None, description="Curriculum outcome codes to focus on"
    )
    target_mastery: Decimal | None = Field(
        None, ge=0, le=100, description="Target mastery percentage"
    )
    target_date: date | None = Field(None, description="Target completion date")
    reward: str | None = Field(None, max_length=255, description="Family reward for achieving goal")


class GoalCreate(GoalBase):
    """Schema for creating a goal."""

    student_id: UUID = Field(..., description="Student this goal is for")

    @field_validator("target_outcomes")
    @classmethod
    def validate_outcomes(cls, v: list[str] | None) -> list[str] | None:
        """Validate outcome codes are not empty strings."""
        if v is not None:
            v = [code.strip().upper() for code in v if code.strip()]
            return v if v else None
        return v


class GoalUpdate(BaseSchema):
    """Schema for updating a goal."""

    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)
    target_outcomes: list[str] | None = None
    target_mastery: Decimal | None = Field(None, ge=0, le=100)
    target_date: date | None = None
    reward: str | None = Field(None, max_length=255)
    is_active: bool | None = None


class GoalProgress(BaseSchema):
    """Goal progress information."""

    current_mastery: Decimal | None = Field(
        None, description="Current mastery level for target outcomes"
    )
    progress_percentage: Decimal = Field(
        ..., ge=0, le=100, description="Progress towards goal (0-100)"
    )
    outcomes_mastered: int = Field(0, ge=0, description="Number of target outcomes mastered")
    outcomes_total: int = Field(0, ge=0, description="Total target outcomes")
    days_remaining: int | None = Field(None, description="Days until target date")
    is_on_track: bool = Field(True, description="Whether progress is on track for target date")


class GoalResponse(GoalBase, IDMixin, TimestampMixin):
    """Schema for goal response."""

    student_id: UUID
    parent_id: UUID
    is_active: bool
    achieved_at: datetime | None = None

    @property
    def is_achieved(self) -> bool:
        """Check if goal has been achieved."""
        return self.achieved_at is not None

    @property
    def is_overdue(self) -> bool:
        """Check if goal is past its target date."""
        if not self.target_date or self.is_achieved:
            return False
        return date.today() > self.target_date


class GoalWithProgress(GoalResponse):
    """Goal response with computed progress."""

    progress: GoalProgress = Field(..., description="Goal progress information")


class GoalSummary(BaseSchema):
    """Minimal goal info for lists."""

    id: UUID
    title: str
    student_id: UUID
    is_active: bool
    is_achieved: bool = False
    progress_percentage: Decimal = Field(default=Decimal("0"))
    target_date: date | None = None


class GoalListResponse(BaseSchema):
    """Schema for list of goals."""

    goals: list[GoalWithProgress]
    total: int
    active_count: int = 0
    achieved_count: int = 0


class GoalAchievement(BaseSchema):
    """Schema for marking a goal as achieved."""

    achieved_at: datetime = Field(
        default_factory=lambda: datetime.now(),
        description="When the goal was achieved",
    )
    celebration_message: str | None = Field(
        None, max_length=500, description="Optional celebration message"
    )
