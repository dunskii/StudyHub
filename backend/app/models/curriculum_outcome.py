"""Curriculum Outcome model."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CurriculumOutcome(Base):
    """Curriculum outcome/standard within a subject."""

    __tablename__ = "curriculum_outcomes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    framework_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("curriculum_frameworks.id", ondelete="CASCADE")
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE")
    )
    outcome_code: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    stage: Mapped[str] = mapped_column(String(20), nullable=False)
    strand: Mapped[str | None] = mapped_column(String(100))
    substrand: Mapped[str | None] = mapped_column(String(100))
    pathway: Mapped[str | None] = mapped_column(String(10))
    content_descriptors: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    elaborations: Mapped[dict | None] = mapped_column(JSONB)
    prerequisites: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    framework: Mapped["CurriculumFramework"] = relationship("CurriculumFramework")  # noqa: F821
    subject: Mapped["Subject"] = relationship("Subject", back_populates="outcomes")  # noqa: F821
