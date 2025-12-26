"""Student Subject enrolment schemas."""
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.base import BaseSchema, IDMixin


class StudentSubjectProgress(BaseSchema):
    """Progress data for a student's subject enrolment."""

    outcomes_completed: list[str] = Field(
        default_factory=list,
        alias="outcomesCompleted",
        description="List of completed outcome codes",
    )
    outcomes_in_progress: list[str] = Field(
        default_factory=list,
        alias="outcomesInProgress",
        description="List of outcome codes currently being worked on",
    )
    overall_percentage: int = Field(
        default=0,
        ge=0,
        le=100,
        alias="overallPercentage",
        description="Overall completion percentage",
    )
    last_activity: datetime | None = Field(
        default=None,
        alias="lastActivity",
        description="Timestamp of last activity",
    )
    xp_earned: int = Field(
        default=0,
        ge=0,
        alias="xpEarned",
        description="Total XP earned in this subject",
    )


class StudentSubjectBase(BaseSchema):
    """Base student subject schema."""

    subject_id: UUID = Field(..., description="The subject UUID")
    pathway: str | None = Field(
        None,
        max_length=10,
        description="Pathway for Stage 5 subjects (e.g., '5.1', '5.2', '5.3')",
    )
    senior_course_id: UUID | None = Field(
        None,
        description="Senior course UUID for Stage 6 students",
    )


class StudentSubjectCreate(StudentSubjectBase):
    """Schema for enrolling a student in a subject."""

    @field_validator("pathway")
    @classmethod
    def validate_pathway(cls, v: str | None) -> str | None:
        """Validate pathway format."""
        if v is not None:
            valid_pathways = ["5.1", "5.2", "5.3"]
            if v not in valid_pathways:
                raise ValueError(f"Pathway must be one of: {', '.join(valid_pathways)}")
        return v


class StudentSubjectUpdate(BaseSchema):
    """Schema for updating a student subject enrolment."""

    pathway: str | None = Field(
        None,
        max_length=10,
        description="New pathway for Stage 5 subjects",
    )
    senior_course_id: UUID | None = Field(
        None,
        description="New senior course UUID for Stage 6 students",
    )

    @field_validator("pathway")
    @classmethod
    def validate_pathway(cls, v: str | None) -> str | None:
        """Validate pathway format."""
        if v is not None:
            valid_pathways = ["5.1", "5.2", "5.3"]
            if v not in valid_pathways:
                raise ValueError(f"Pathway must be one of: {', '.join(valid_pathways)}")
        return v


class StudentSubjectProgressUpdate(BaseSchema):
    """Schema for updating subject progress."""

    outcomes_completed: list[str] | None = Field(
        None,
        alias="outcomesCompleted",
    )
    outcomes_in_progress: list[str] | None = Field(
        None,
        alias="outcomesInProgress",
    )
    overall_percentage: int | None = Field(
        None,
        ge=0,
        le=100,
        alias="overallPercentage",
    )
    xp_earned: int | None = Field(
        None,
        ge=0,
        alias="xpEarned",
    )


class StudentSubjectResponse(StudentSubjectBase, IDMixin):
    """Schema for student subject response."""

    student_id: UUID
    enrolled_at: datetime
    progress: StudentSubjectProgress

    @classmethod
    def from_orm_with_progress(cls, obj: Any) -> "StudentSubjectResponse":
        """Create from ORM object, ensuring progress is properly formatted."""
        progress_data = obj.progress or {}
        progress = StudentSubjectProgress(
            outcomesCompleted=progress_data.get("outcomesCompleted", []),
            outcomesInProgress=progress_data.get("outcomesInProgress", []),
            overallPercentage=progress_data.get("overallPercentage", 0),
            lastActivity=progress_data.get("lastActivity"),
            xpEarned=progress_data.get("xpEarned", 0),
        )
        return cls(
            id=obj.id,
            student_id=obj.student_id,
            subject_id=obj.subject_id,
            pathway=obj.pathway,
            senior_course_id=obj.senior_course_id,
            enrolled_at=obj.enrolled_at,
            progress=progress,
        )


class SubjectSummary(BaseSchema):
    """Minimal subject info for embedding in responses."""

    id: UUID
    code: str
    name: str
    icon: str | None
    color: str | None


class SeniorCourseSummary(BaseSchema):
    """Minimal senior course info for embedding in responses."""

    id: UUID
    code: str
    name: str
    units: int


class StudentSubjectWithDetails(StudentSubjectResponse):
    """Student subject with full subject details."""

    subject: SubjectSummary
    senior_course: SeniorCourseSummary | None = None


class StudentSubjectListResponse(BaseSchema):
    """Response for list of student subjects."""

    enrolments: list[StudentSubjectWithDetails]
    total: int


class EnrolmentRequest(BaseSchema):
    """Request body for enrolling in a subject."""

    subject_id: UUID = Field(..., description="The subject to enrol in")
    pathway: str | None = Field(
        None,
        max_length=10,
        description="Pathway for Stage 5 subjects",
    )
    senior_course_id: UUID | None = Field(
        None,
        description="Senior course for Stage 6 students",
    )

    @field_validator("pathway")
    @classmethod
    def validate_pathway(cls, v: str | None) -> str | None:
        """Validate pathway format."""
        if v is not None:
            valid_pathways = ["5.1", "5.2", "5.3"]
            if v not in valid_pathways:
                raise ValueError(f"Pathway must be one of: {', '.join(valid_pathways)}")
        return v


class BulkEnrolmentRequest(BaseSchema):
    """Request body for enrolling in multiple subjects at once."""

    enrolments: list[EnrolmentRequest] = Field(
        ...,
        min_length=1,
        max_length=10,
        description="List of subjects to enrol in",
    )


class BulkEnrolmentResponse(BaseSchema):
    """Response for bulk enrolment."""

    successful: list[StudentSubjectResponse]
    failed: list[dict[str, Any]]  # Contains subject_id and error message
