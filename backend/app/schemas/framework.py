"""Curriculum framework schemas."""
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.base import BaseSchema, IDMixin, TimestampMixin


class FrameworkBase(BaseSchema):
    """Base framework schema."""

    code: str = Field(..., max_length=20, description="Framework code (e.g., NSW, VIC)")
    name: str = Field(..., max_length=100, description="Full name of the framework")
    country: str = Field(default="Australia", max_length=50)
    region_type: str = Field(..., max_length=20, description="Type: state, national, international")
    syllabus_authority: str | None = Field(None, max_length=100, description="e.g., NESA, VCAA")
    syllabus_url: str | None = Field(None, description="URL to official syllabus")


class FrameworkCreate(FrameworkBase):
    """Schema for creating a framework."""

    structure: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    is_default: bool = False
    display_order: int = 0


class FrameworkUpdate(BaseSchema):
    """Schema for updating a framework."""

    name: str | None = Field(None, max_length=100)
    syllabus_authority: str | None = Field(None, max_length=100)
    syllabus_url: str | None = None
    structure: dict[str, Any] | None = None
    is_active: bool | None = None
    is_default: bool | None = None
    display_order: int | None = None


class FrameworkResponse(FrameworkBase, IDMixin, TimestampMixin):
    """Schema for framework response."""

    structure: dict[str, Any]
    is_active: bool
    is_default: bool
    display_order: int


class FrameworkListResponse(BaseSchema):
    """Schema for list of frameworks with pagination."""

    frameworks: list[FrameworkResponse]
    total: int
    page: int = 1
    page_size: int = 20
    total_pages: int = 1
    has_next: bool = False
    has_previous: bool = False

    @classmethod
    def create(
        cls,
        frameworks: list[FrameworkResponse],
        total: int,
        page: int,
        page_size: int,
    ) -> "FrameworkListResponse":
        """Create a paginated response."""
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1
        return cls(
            frameworks=frameworks,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1,
        )


class FrameworkSummary(BaseSchema):
    """Minimal framework info for lists."""

    id: UUID
    code: str
    name: str
    is_default: bool
