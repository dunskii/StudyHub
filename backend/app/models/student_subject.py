"""Student Subject enrolment model."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.senior_course import SeniorCourse
    from app.models.student import Student
    from app.models.subject import Subject


class StudentSubject(Base):
    """Student's enrolment in a subject."""

    __tablename__ = "student_subjects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE")
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE")
    )
    pathway: Mapped[str | None] = mapped_column(String(10))
    senior_course_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("senior_courses.id")
    )
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Progress tracking
    progress: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=lambda: {
            "outcomesCompleted": [],
            "outcomesInProgress": [],
            "overallPercentage": 0,
            "lastActivity": None,
            "xpEarned": 0,
        },
    )

    # Relationships
    student: Mapped[Student] = relationship("Student", back_populates="subjects")
    subject: Mapped[Subject] = relationship(
        "Subject", back_populates="student_subjects"
    )
    senior_course: Mapped[SeniorCourse | None] = relationship("SeniorCourse")
