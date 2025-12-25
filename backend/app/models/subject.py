"""Subject model."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.curriculum_framework import CurriculumFramework
    from app.models.curriculum_outcome import CurriculumOutcome
    from app.models.student_subject import StudentSubject


class Subject(Base):
    """Subject/KLA within a curriculum framework."""

    __tablename__ = "subjects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    framework_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("curriculum_frameworks.id", ondelete="CASCADE")
    )
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    kla: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    icon: Mapped[str | None] = mapped_column(String(50))
    color: Mapped[str | None] = mapped_column(String(7))
    available_stages: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)
    config: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=lambda: {
            "hasPathways": False,
            "pathways": [],
            "seniorCourses": [],
            "assessmentTypes": [],
            "tutorStyle": "socratic",
        },
    )
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    framework: Mapped[CurriculumFramework] = relationship(
        "CurriculumFramework", back_populates="subjects"
    )
    outcomes: Mapped[list[CurriculumOutcome]] = relationship(
        "CurriculumOutcome", back_populates="subject", cascade="all, delete-orphan"
    )
    student_subjects: Mapped[list[StudentSubject]] = relationship(
        "StudentSubject", back_populates="subject"
    )
