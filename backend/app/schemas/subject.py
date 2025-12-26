"""Subject schemas."""
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.base import BaseSchema, IDMixin, TimestampMixin


class SubjectConfig(BaseSchema):
    """Subject configuration schema."""

    hasPathways: bool = Field(default=False, description="Whether subject has pathways")
    pathways: list[str] = Field(default_factory=list, description="Available pathways")
    seniorCourses: list[str] = Field(default_factory=list, description="Available senior courses")
    assessmentTypes: list[str] = Field(default_factory=list, description="Types of assessments")
    tutorStyle: str = Field(default="socratic", description="AI tutor style for this subject")


class SubjectBase(BaseSchema):
    """Base subject schema."""

    code: str = Field(..., max_length=20, description="Subject code (e.g., MATH, ENG)")
    name: str = Field(..., max_length=100, description="Full name of the subject")
    kla: str = Field(..., max_length=100, description="Key Learning Area")
    description: str | None = Field(None, description="Subject description")
    icon: str | None = Field(None, max_length=50, description="Icon identifier")
    color: str | None = Field(None, max_length=7, description="Hex color code")
    available_stages: list[str] = Field(..., description="Stages where subject is available")


class SubjectCreate(SubjectBase):
    """Schema for creating a subject."""

    framework_id: UUID = Field(..., description="Framework this subject belongs to")
    config: SubjectConfig = Field(default_factory=SubjectConfig)
    display_order: int = Field(default=0)
    is_active: bool = Field(default=True)


class SubjectUpdate(BaseSchema):
    """Schema for updating a subject."""

    name: str | None = Field(None, max_length=100)
    description: str | None = None
    icon: str | None = Field(None, max_length=50)
    color: str | None = Field(None, max_length=7)
    available_stages: list[str] | None = None
    config: dict[str, Any] | None = None
    display_order: int | None = None
    is_active: bool | None = None


class SubjectResponse(SubjectBase, IDMixin):
    """Schema for subject response."""

    framework_id: UUID
    config: dict[str, Any]
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SubjectSummary(BaseSchema):
    """Minimal subject info for lists."""

    id: UUID
    code: str
    name: str
    icon: str | None = None
    color: str | None = None


class SubjectListResponse(BaseSchema):
    """Schema for list of subjects with pagination."""

    subjects: list[SubjectResponse]
    total: int
    page: int = 1
    page_size: int = 20
    total_pages: int = 1
    has_next: bool = False
    has_previous: bool = False

    @classmethod
    def create(
        cls,
        subjects: list[SubjectResponse],
        total: int,
        page: int,
        page_size: int,
    ) -> "SubjectListResponse":
        """Create a paginated response."""
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1
        return cls(
            subjects=subjects,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1,
        )
