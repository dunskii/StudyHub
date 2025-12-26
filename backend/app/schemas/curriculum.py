"""Curriculum outcome schemas."""
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.base import BaseSchema, IDMixin


class OutcomeBase(BaseSchema):
    """Base curriculum outcome schema."""

    outcome_code: str = Field(..., max_length=30, description="Outcome code (e.g., MA3-RN-01)")
    description: str = Field(..., description="Full description of the outcome")
    stage: str = Field(..., max_length=20, description="Stage (e.g., S1, S2, S3)")
    strand: str | None = Field(None, max_length=100, description="Strand within subject")
    substrand: str | None = Field(None, max_length=100, description="Sub-strand")
    pathway: str | None = Field(None, max_length=10, description="Pathway (e.g., 5.1, 5.2, 5.3)")


class OutcomeCreate(OutcomeBase):
    """Schema for creating a curriculum outcome."""

    framework_id: UUID = Field(..., description="Framework this outcome belongs to")
    subject_id: UUID = Field(..., description="Subject this outcome belongs to")
    content_descriptors: list[str] | None = Field(None, description="Content descriptors")
    elaborations: dict[str, Any] | None = Field(None, description="Elaborations")
    prerequisites: list[str] | None = Field(None, description="Prerequisite outcome codes")
    display_order: int = Field(default=0)


class OutcomeUpdate(BaseSchema):
    """Schema for updating a curriculum outcome."""

    description: str | None = None
    strand: str | None = None
    substrand: str | None = None
    pathway: str | None = None
    content_descriptors: list[str] | None = None
    elaborations: dict[str, Any] | None = None
    prerequisites: list[str] | None = None
    display_order: int | None = None


class OutcomeResponse(OutcomeBase, IDMixin):
    """Schema for curriculum outcome response."""

    framework_id: UUID
    subject_id: UUID
    content_descriptors: list[str] | None = None
    elaborations: dict[str, Any] | None = None
    prerequisites: list[str] | None = None
    display_order: int
    created_at: datetime


class OutcomeSummary(BaseSchema):
    """Minimal outcome info for lists."""

    id: UUID
    outcome_code: str
    description: str
    stage: str
    strand: str | None = None


class OutcomeQueryParams(BaseSchema):
    """Query parameters for filtering outcomes."""

    framework_id: UUID = Field(..., description="Framework ID (required for isolation)")
    subject_id: UUID | None = Field(None, description="Filter by subject")
    stage: str | None = Field(None, description="Filter by stage")
    strand: str | None = Field(None, description="Filter by strand")
    pathway: str | None = Field(None, description="Filter by pathway")
    search: str | None = Field(None, max_length=100, description="Search in description/code")


class OutcomeListResponse(BaseSchema):
    """Schema for list of outcomes with pagination."""

    outcomes: list[OutcomeResponse]
    total: int
    page: int = 1
    page_size: int = 50
    total_pages: int = 1
    has_next: bool = False
    has_previous: bool = False

    @classmethod
    def create(
        cls,
        outcomes: list[OutcomeResponse],
        total: int,
        page: int,
        page_size: int,
    ) -> "OutcomeListResponse":
        """Create a paginated response."""
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1
        return cls(
            outcomes=outcomes,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1,
        )


class StrandInfo(BaseSchema):
    """Information about a strand."""

    name: str = Field(..., description="Strand name")
    outcome_count: int = Field(default=0, description="Number of outcomes in this strand")


class StrandListResponse(BaseSchema):
    """Schema for list of strands."""

    strands: list[str]
    subject_id: UUID | None = None
    framework_id: UUID
