"""Student schemas."""
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.base import BaseSchema, IDMixin, TimestampMixin


class StudentBase(BaseSchema):
    """Base student schema."""

    display_name: str = Field(..., min_length=1, max_length=255)
    grade_level: int = Field(..., ge=0, le=12, description="0=Kindergarten, 1-12=Years 1-12")
    school_stage: str = Field(..., max_length=20, description="e.g., ES1, S1, S2, S3, S4, S5, S6")
    framework_id: UUID


class StudentCreate(StudentBase):
    """Schema for creating a student."""

    parent_id: UUID
    supabase_auth_id: UUID | None = None
    preferences: dict[str, Any] = Field(default_factory=dict)


class StudentUpdate(BaseSchema):
    """Schema for updating a student."""

    display_name: str | None = Field(None, min_length=1, max_length=255)
    grade_level: int | None = Field(None, ge=0, le=12)
    school_stage: str | None = Field(None, max_length=20)
    preferences: dict[str, Any] | None = None
    onboarding_completed: bool | None = None


class StreakData(BaseSchema):
    """Streak tracking data."""

    current: int = 0
    longest: int = 0
    lastActiveDate: str | None = None


class GamificationData(BaseSchema):
    """Gamification stats for a student."""

    totalXP: int = Field(default=0, alias="totalXP")
    level: int = 1
    achievements: list[str] = Field(default_factory=list)
    streaks: StreakData = Field(default_factory=StreakData)


class StudentResponse(StudentBase, IDMixin, TimestampMixin):
    """Schema for student response."""

    parent_id: UUID
    supabase_auth_id: UUID | None = None
    preferences: dict[str, Any]
    gamification: dict[str, Any]
    last_active_at: datetime | None = None
    onboarding_completed: bool


class StudentSummary(BaseSchema):
    """Minimal student info for lists."""

    id: UUID
    display_name: str
    grade_level: int
    school_stage: str


class StudentListResponse(BaseSchema):
    """Schema for list of students."""

    students: list[StudentResponse]
    total: int
