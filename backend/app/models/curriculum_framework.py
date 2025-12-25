"""Curriculum Framework model."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


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
    structure: Mapped[dict] = mapped_column(JSONB, default=dict)
    syllabus_authority: Mapped[str | None] = mapped_column(String(100))
    syllabus_url: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    subjects: Mapped[list["Subject"]] = relationship(  # noqa: F821
        "Subject", back_populates="framework", cascade="all, delete-orphan"
    )
    students: Mapped[list["Student"]] = relationship(  # noqa: F821
        "Student", back_populates="framework"
    )
