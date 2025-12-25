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
    avatar_url: str | None = None
    preferences: dict[str, Any] = Field(default_factory=dict)


class StudentUpdate(BaseSchema):
    """Schema for updating a student."""

    display_name: str | None = Field(None, min_length=1, max_length=255)
    grade_level: int | None = Field(None, ge=0, le=12)
    school_stage: str | None = Field(None, max_length=20)
    avatar_url: str | None = None
    preferences: dict[str, Any] | None = None
    onboarding_completed: bool | None = None


class GamificationData(BaseSchema):
    """Gamification stats for a student."""

    xp: int = 0
    level: int = 1
    streak: int = 0


class StudentResponse(StudentBase, IDMixin, TimestampMixin):
    """Schema for student response."""

    parent_id: UUID
    supabase_auth_id: UUID | None
    avatar_url: str | None
    preferences: dict[str, Any]
    gamification: GamificationData
    last_active_at: datetime | None
    onboarding_completed: bool


class StudentSummary(BaseSchema):
    """Minimal student info for lists."""

    id: UUID
    display_name: str
    grade_level: int
    school_stage: str
    avatar_url: str | None


class StudentListResponse(BaseSchema):
    """Schema for list of students."""

    students: list[StudentResponse]
    total: int
