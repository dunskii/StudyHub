"""Senior Course model (HSC, VCE, etc.)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.curriculum_framework import CurriculumFramework
    from app.models.subject import Subject


class SeniorCourse(Base):
    """Senior secondary course (HSC, VCE, etc.)."""

    __tablename__ = "senior_courses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    framework_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("curriculum_frameworks.id", ondelete="CASCADE")
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE")
    )
    code: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    course_type: Mapped[str] = mapped_column(String(50), nullable=False)
    units: Mapped[float] = mapped_column(Float, default=2.0)
    is_atar: Mapped[bool] = mapped_column(Boolean, default=True)
    prerequisites: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    exclusions: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    modules: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    assessment_components: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
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
    framework: Mapped[CurriculumFramework] = relationship("CurriculumFramework")
    subject: Mapped[Subject] = relationship("Subject")
