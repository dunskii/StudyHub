"""Senior course schemas."""
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.base import BaseSchema, IDMixin


class SeniorCourseBase(BaseSchema):
    """Base senior course schema."""

    code: str = Field(..., max_length=30, description="Course code")
    name: str = Field(..., max_length=100, description="Full name of the course")
    description: str | None = Field(None, description="Course description")
    course_type: str = Field(..., max_length=50, description="Type (e.g., Standard, Advanced, Extension)")
    units: float = Field(default=2.0, description="Number of units")
    is_atar: bool = Field(default=True, description="Whether course contributes to ATAR")


class SeniorCourseCreate(SeniorCourseBase):
    """Schema for creating a senior course."""

    framework_id: UUID = Field(..., description="Framework this course belongs to")
    subject_id: UUID = Field(..., description="Subject this course belongs to")
    prerequisites: list[str] | None = Field(None, description="Prerequisite course codes")
    exclusions: list[str] | None = Field(None, description="Excluded course codes")
    modules: dict[str, Any] | None = Field(None, description="Course modules/topics")
    assessment_components: dict[str, Any] | None = Field(None, description="Assessment structure")
    display_order: int = Field(default=0)
    is_active: bool = Field(default=True)


class SeniorCourseUpdate(BaseSchema):
    """Schema for updating a senior course."""

    name: str | None = Field(None, max_length=100)
    description: str | None = None
    course_type: str | None = Field(None, max_length=50)
    units: float | None = None
    is_atar: bool | None = None
    prerequisites: list[str] | None = None
    exclusions: list[str] | None = None
    modules: dict[str, Any] | None = None
    assessment_components: dict[str, Any] | None = None
    display_order: int | None = None
    is_active: bool | None = None


class SeniorCourseResponse(SeniorCourseBase, IDMixin):
    """Schema for senior course response."""

    framework_id: UUID
    subject_id: UUID
    prerequisites: list[str] | None = None
    exclusions: list[str] | None = None
    modules: dict[str, Any] | None = None
    assessment_components: dict[str, Any] | None = None
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SeniorCourseSummary(BaseSchema):
    """Minimal course info for lists."""

    id: UUID
    code: str
    name: str
    course_type: str
    units: float
    is_atar: bool


class SeniorCourseListResponse(BaseSchema):
    """Schema for list of senior courses with pagination."""

    courses: list[SeniorCourseResponse]
    total: int
    page: int = 1
    page_size: int = 20
    total_pages: int = 1
    has_next: bool = False
    has_previous: bool = False

    @classmethod
    def create(
        cls,
        courses: list[SeniorCourseResponse],
        total: int,
        page: int,
        page_size: int,
    ) -> "SeniorCourseListResponse":
        """Create a paginated response."""
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1
        return cls(
            courses=courses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1,
        )
