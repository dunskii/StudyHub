"""Curriculum Framework model."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.student import Student
    from app.models.subject import Subject


class CurriculumFramework(Base):
    """Curriculum framework for different states/countries."""

    __tablename__ = "curriculum_frameworks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(50), nullable=False, default="Australia")
    region_type: Mapped[str] = mapped_column(String(20), nullable=False)
    structure: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    syllabus_authority: Mapped[str | None] = mapped_column(String(100))
    syllabus_url: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    subjects: Mapped[list[Subject]] = relationship(
        "Subject", back_populates="framework", cascade="all, delete-orphan"
    )
    students: Mapped[list[Student]] = relationship(
        "Student", back_populates="framework"
    )
