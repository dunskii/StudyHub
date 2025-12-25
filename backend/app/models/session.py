"""Session model (study/revision sessions)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.ai_interaction import AIInteraction
    from app.models.student import Student
    from app.models.subject import Subject


class Session(Base):
    """Study or revision session."""

    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE")
    )
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id")
    )
    session_type: Mapped[str] = mapped_column(String(50), nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime)
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)

    # Session data
    data: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=lambda: {
            "outcomesWorkedOn": [],
            "questionsAttempted": 0,
            "questionsCorrect": 0,
            "flashcardsReviewed": 0,
        },
    )

    # Relationships
    student: Mapped[Student] = relationship("Student", back_populates="sessions")
    subject: Mapped[Subject | None] = relationship("Subject")
    ai_interactions: Mapped[list[AIInteraction]] = relationship(
        "AIInteraction", back_populates="session", cascade="all, delete-orphan"
    )
